import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { it,expect } from "vitest";
it("new assessments only: confirmed owner capture, exclusive leases, CAS, no candidate access or backfill",async()=>{
 const db=new PGlite();
 try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
  CREATE TABLE auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
  CREATE TABLE sessions(id uuid primary key,owner_id uuid,submission_requested_at timestamptz);
  CREATE TABLE evaluations(id uuid primary key,session_id uuid references sessions(id),reviewer_decision text);
  INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111111','synthetic@example.invalid',now());
  INSERT INTO sessions VALUES('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111',NULL);
  INSERT INTO evaluations VALUES('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222',NULL);`);
  await db.exec(readFileSync("docs/unapplied/assessment-ready-mail.sql","utf8"));
  expect((await db.query("select * from assessment_ready_outbox")).rows).toHaveLength(0);
  const id="44444444-4444-4444-8444-444444444444",token="55555555-5555-4555-8555-555555555555";
  await db.query("insert into evaluations values($1,'22222222-2222-4222-8222-222222222222',NULL)",[id]);
  expect((await db.query<{recipient_email:string}>("select * from assessment_ready_outbox")).rows[0].recipient_email).toBe("synthetic@example.invalid");
  const first=await db.query<{r:any}>("select claim_assessment_ready($1,$2) r",[id,token]);expect(first.rows[0].r.pending_human_review).toBe(false);
  expect((await db.query<{r:any}>("select claim_assessment_ready($1,gen_random_uuid()) r",[id])).rows[0].r).toBeNull();
  expect((await db.query<{r:boolean}>("select settle_assessment_ready($1,gen_random_uuid(),'queued') r",[id])).rows[0].r).toBe(false);
  expect((await db.query<{r:boolean}>("select settle_assessment_ready($1,$2,'queued') r",[id,token])).rows[0].r).toBe(true);
  const later="77777777-7777-4777-8777-777777777777";
  await db.exec(`UPDATE sessions SET submission_requested_at=now(); INSERT INTO evaluations VALUES('${later}','22222222-2222-4222-8222-222222222222',NULL)`);
  expect((await db.query<{r:any}>("select claim_assessment_ready($1,$2) r",[later,token])).rows[0].r.pending_human_review).toBe(true);
  // Simulate crash before settle: lease expiry recovers the SAME captured event.
  await db.query("UPDATE assessment_ready_outbox SET lease_until=now()-interval '1 second' WHERE assessment_id=$1",[later]);
  expect((await db.query<{r:any}>("select claim_assessment_ready($1,gen_random_uuid()) r",[later])).rows[0].r.session_id).toBe("22222222-2222-4222-8222-222222222222");
  await db.query("UPDATE assessment_ready_outbox SET lease_until=NULL WHERE assessment_id=$1",[later]);
  await db.exec("UPDATE auth.users SET email='changed@example.invalid'");
  expect((await db.query<{r:any}>("select claim_assessment_ready($1,gen_random_uuid()) r",[later])).rows[0].r).toBeNull();
  expect((await db.query<{status:string}>("select status from assessment_ready_outbox where assessment_id=$1",[later])).rows[0].status).toBe("blocked");
  await db.exec("SET ROLE authenticated");await expect(db.query("select * from assessment_ready_outbox")).rejects.toThrow("permission denied");await expect(db.query("select claim_assessment_ready($1,$2)",[id,token])).rejects.toThrow("permission denied");await db.exec("RESET ROLE");
  await db.exec("UPDATE auth.users SET email_confirmed_at=NULL; INSERT INTO evaluations VALUES('66666666-6666-4666-8666-666666666666','22222222-2222-4222-8222-222222222222',NULL)");
  expect((await db.query("select * from assessment_ready_outbox")).rows).toHaveLength(2);
 } finally {await db.close()}
},120000);