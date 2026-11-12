import { expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
const state = vi.hoisted(() => ({ session: {} as any, rows: [] as any[] }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => { const c: any = { middleware: () => c, inputValidator: () => c, handler: (fn: unknown) => fn }; return c; } }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/notifications.functions", () => ({ notify: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: () => { const q: any = { select: () => q, eq: () => q, order: async () => ({ data: state.rows }), single: async () => ({ data: state.session }), maybeSingle: async () => ({ data: state.session }), insert: (rows: any[]) => { const inserted = rows.map((r,i) => ({ ...r, id: `m${state.rows.length+i}` })); state.rows.push(...inserted); return { select: async () => ({ data: inserted }) }; } }; return q; } } }));
import { sendPlaybookTeamTurn } from "./simulator.functions";
const send = sendPlaybookTeamTurn as unknown as (i: any) => Promise<any>;
it.skipIf(!process.env.RUN_SCREENSHOT_LIVE)("browser bridge uses actual team AI and isolated message storage", async () => {
  state.session = JSON.parse(readFileSync("/tmp/browser/chapter2-media/session.json", "utf8"));
  let end: () => void = () => {};
  const finished = new Promise<void>(resolve => { end = resolve; });
  let requests = 0;
  const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:8081"); res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.end(); return; }
    if (req.url === "/done") { res.end("done"); end(); return; }
    if (req.method !== "POST") { res.end("isolated test bridge"); return; }
    try {
      let body = ""; for await (const chunk of req) body += chunk;
      const input = JSON.parse(body); state.rows = input.messages ?? [];
      if (input.fail) throw new Error("Synthetic temporary send failure. Draft retained.");
      requests++;
      const result = await send({ data: input.data, context: { userId: "isolated-owner" } });
      writeFileSync("/tmp/browser/chapter2-media/last-result.json", JSON.stringify({ result, rows: state.rows }, null, 2));
      res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ result, rows: state.rows }));
    } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ error: e instanceof Error ? e.message : "Failed" })); }
  });
  await new Promise<void>(resolve => server.listen(8092, "127.0.0.1", resolve));
  console.log("isolated bridge ready");
  try { await finished; expect(requests).toBeGreaterThanOrEqual(2); expect(JSON.stringify(state.rows)).not.toContain("data:image"); }
  finally { server.close(); }
}, 550000);