import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const synthesizeVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string; voiceId: string }) =>
    z.object({
      text: z.string().min(1).max(2000),
      voiceId: z.string().min(1).max(80),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY missing");

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${data.voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: data.text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true },
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`TTS failed: ${res.status} ${errText.slice(0, 200)}`);
    }
    const buf = await res.arrayBuffer();
    const audio = Buffer.from(buf).toString("base64");
    return { audio };
  });
