import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
const mine = "aaaaaaaa-0000-4000-8000-000000000001", submitted = "aaaaaaaa-0000-4000-8000-000000000002", theirs = "aaaaaaaa-0000-4000-8000-000000000003";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
  GRANT USAGE ON SCHEMA auth TO authenticated;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
  CREATE TABLE public.sessions(id uuid primary key, owner_id uuid, status text, submission_requested_at timestamptz); GRANT SELECT ON public.sessions TO authenticated;
  INSERT INTO public.sessions VALUES ('${mine}','${owner}','framing',null),('${submitted}','${owner}','evaluated',now()),('${theirs}','${other}','framing',null);`);
  await db.exec(readFileSync("drizzle/migrations/0016_session_archive.sql", "utf8").replace(/--> statement-breakpoint/g, ""));
  await db.exec(`SET ROLE authenticated; SET test.uid='${owner}';`);
}, 120000);
afterAll(async () => { await db?.close(); });
const archivedAt = async (id: string) => (await db.query<{ a: string | null }>("select archived_at a from public.sessions where id=$1", [id])).rows[0].a;
it("a coach can archive and unarchive their own attempt without deleting it", async () => {
  await db.query("select public.set_my_session_archived($1, true)", [mine]);
  expect(await archivedAt(mine)).not.toBeNull();
  await db.query("select public.set_my_session_archived($1, false)", [mine]);
  expect(await archivedAt(mine)).toBeNull();
  expect((await db.query("select count(*)::int c from public.sessions")).rows[0]).toEqual({ c: 3 });
});
it("a coach cannot archive an attempt submitted for review", async () => {
  await expect(db.query("select public.set_my_session_archived($1, true)", [submitted])).rejects.toThrow();
  expect(await archivedAt(submitted)).toBeNull();
});
it("a coach cannot archive another coach's attempt", async () => {
  await expect(db.query("select public.set_my_session_archived($1, true)", [theirs])).rejects.toThrow();
  expect(await archivedAt(theirs)).toBeNull();
});
