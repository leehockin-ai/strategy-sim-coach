import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlaybookExercise = {
  id: string;
  title: string;
  objective: string;
  instructions: string;
  prompts: string[];
};

export type ExtractedPlaybook = {
  title: string;
  source: string;
  overview: string;
  exercises: PlaybookExercise[];
};

async function ownSession(sessionId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("id, owner_id, playbook_pdf_path, playbook_extracted, playbook_application")
    .eq("id", sessionId)
    .single();
  if (error || !data) throw new Error("Session not found");
  if ((data as any).owner_id !== userId) throw new Error("Forbidden");
  return data as any;
}

export const extractPlaybook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; pdfPath: string }) =>
    z.object({
      sessionId: z.string().uuid(),
      pdfPath: z.string().min(1).max(512),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    await ownSession(data.sessionId, context.userId);

    // Path must live under the user's folder
    if (!data.pdfPath.startsWith(`${context.userId}/`)) {
      throw new Error("Invalid PDF path");
    }

    // Download from storage
    const { data: file, error: dErr } = await supabaseAdmin.storage
      .from("playbooks")
      .download(data.pdfPath);
    if (dErr || !file) throw new Error(`Could not download PDF: ${dErr?.message ?? "unknown"}`);

    const buf = new Uint8Array(await file.arrayBuffer());
    if (buf.byteLength === 0) throw new Error("PDF is empty");
    if (buf.byteLength > 15 * 1024 * 1024) throw new Error("PDF too large (max 15MB)");

    // Extract text with unpdf (Worker-compatible)
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(buf);
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    const fullText = (Array.isArray(text) ? text.join("\n") : text).trim();
    if (!fullText) throw new Error("Could not read any text from the PDF");

    // Truncate to keep prompt under control
    const MAX_CHARS = 60_000;
    const playbookText = fullText.length > MAX_CHARS
      ? fullText.slice(0, MAX_CHARS) + "\n\n[...truncated...]"
      : fullText;

    const systemPrompt = `You parse Strategyzer playbooks into a runnable set of exercises a coach can walk a team through in a session.
A playbook is a sequenced, hands-on workflow (e.g. "Customer Profile Interviews", "Strong Value Propositions").
Each exercise has: a short title, a one-sentence objective, concrete instructions for the facilitator, and 2-5 prompts/questions the coach asks the team to fill in.
Be FAITHFUL to the source: do not invent exercises that aren't in the document. If the document is short, return fewer exercises rather than padding.`;

    const tool = {
      type: "function",
      function: {
        name: "structure_playbook",
        description: "Return the playbook as a structured sequence of exercises.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Playbook title as it appears in the document." },
            overview: { type: "string", description: "1-3 sentences explaining when to use this playbook." },
            exercises: {
              type: "array",
              minItems: 1,
              maxItems: 12,
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  objective: { type: "string" },
                  instructions: { type: "string", description: "What the coach does. 1-3 paragraphs." },
                  prompts: {
                    type: "array",
                    minItems: 1,
                    maxItems: 6,
                    items: { type: "string" },
                    description: "Questions the coach poses to the team for this exercise.",
                  },
                },
                required: ["title", "objective", "instructions", "prompts"],
                additionalProperties: false,
              },
            },
          },
          required: ["title", "overview", "exercises"],
          additionalProperties: false,
        },
      },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Source playbook (${totalPages} pages):\n\n${playbookText}` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "structure_playbook" } },
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Rate limit hit — please wait and retry.");
      if (res.status === 402) throw new Error("AI credits exhausted. Top up in Settings → Workspace → Usage.");
      throw new Error(`AI gateway error: ${res.status}`);
    }

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("AI did not return a structured playbook");
    const parsed = JSON.parse(call.function.arguments) as Omit<ExtractedPlaybook, "source" | "exercises"> & {
      exercises: Omit<PlaybookExercise, "id">[];
    };

    const extracted: ExtractedPlaybook = {
      title: parsed.title,
      overview: parsed.overview,
      source: data.pdfPath,
      exercises: parsed.exercises.map((e, i) => ({ ...e, id: `ex_${i + 1}` })),
    };

    await supabaseAdmin
      .from("sessions")
      .update({ playbook_pdf_path: data.pdfPath, playbook_extracted: extracted as any })
      .eq("id", data.sessionId);

    return { extracted };
  });

export const savePlaybookApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string; application: Record<string, string> }) =>
    z.object({
      sessionId: z.string().uuid(),
      application: z.record(z.string().min(1).max(64), z.string().max(8000)),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await ownSession(data.sessionId, context.userId);
    const { error } = await supabaseAdmin
      .from("sessions")
      .update({ playbook_application: data.application as any })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
