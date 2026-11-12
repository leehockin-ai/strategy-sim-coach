import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222", req = "33333333-3333-4333-8333-333333333333";
const draft = { title:"Fictional meal team", brief:"A fictional team has wireframes but no interviews.", team:[{name:"Alex Park",role:"Founder",description:"Provisional"},{name:"Sam Lee",role:"Researcher",description:"Provisional"}], tensions:"Speed versus learning",scope:"One segment",outcome:"Choose a test",constraints:"Two weeks",challenge:"Surface uncertainty" };
let id: string;
beforeAll(async()=>{
 db = new PGlite();
 await db.exec(`CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"email":"fictional@example.invalid"}'::jsonb $$;
 CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
 CREATE TABLE public.scenarios(id uuid primary key,stakeholders jsonb);
 CREATE TABLE public.sessions(id uuid primary key default gen_random_uuid(), owner_id uuid,scenario_id uuid NOT NULL REFERENCES scenarios(id),candidate_name text,candidate_email text,status text,assignment_id uuid,submission_requested_at timestamptz);
 CREATE TABLE public.messages(id uuid primary key default gen_random_uuid(),session_id uuid references sessions(id),content text);
 CREATE TABLE public.evaluations(id uuid primary key default gen_random_uuid(),session_id uuid references sessions(id),reviewer_decision text,reviewer_name text,reviewed_at timestamptz,reviewer_notes text,internal_notes text,per_section_overrides jsonb default '{}');
 CREATE TABLE public.scope_revisions(session_id uuid references sessions(id),snapshot jsonb);
 CREATE TABLE public.scope_submissions(session_id uuid references sessions(id));
 CREATE TABLE public.stakeholder_states(session_id uuid references sessions(id),stakeholder_id text,engagement text,trust text,guardedness text,turn_index integer,reasoning text,unique(session_id,stakeholder_id,turn_index));
 CREATE TABLE public.activity_runs(id uuid primary key,session_id uuid references sessions(id));
 CREATE TABLE public.activity_events(run_id uuid references activity_runs(id));
 CREATE TABLE public.activity_artifact_history(run_id uuid references activity_runs(id));
 CREATE TABLE public.activity_external_connections(run_id uuid references activity_runs(id));
 GRANT USAGE ON SCHEMA auth TO authenticated;
 GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
 CREATE TRIGGER seed_states AFTER INSERT ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.seed_placeholder();`.replace('CREATE TRIGGER seed_states AFTER INSERT ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.seed_placeholder();',''));
 for(const table of ['sessions','messages','evaluations','scope_revisions','scope_submissions','stakeholder_states','activity_runs','activity_events','activity_artifact_history','activity_external_connections']) await db.exec(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY; CREATE POLICY legacy_reviewer_all ON public.${table} FOR ALL TO authenticated USING(true) WITH CHECK(true);`);
 try { await db.exec(readFileSync("docs/unapplied/private-practice-launch.sql","utf8")); } catch (e: any) { console.error("SQL diagnostic", e.message, e.position, e.internalQuery, e.where); throw e; }
 await db.exec(`CREATE TRIGGER seed_states AFTER INSERT ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.seed_new_session_stakeholder_states(); SET ROLE authenticated; SET test.uid='${owner}';`);
 const r = await db.query<{s:any}>(`select public.start_private_practice($1,$2::jsonb) s`,[req,JSON.stringify(draft)]); id=r.rows[0].s.id;
},120000);
afterAll(async()=>{await db?.close()});
it("real SQL start is owner-bound, frozen and idempotent without a catalog insert",async()=>{
 await db.exec(`SET test.uid='${owner}'`);
 const r=await db.query<{s:any}>('select public.start_private_practice($1,$2::jsonb) s',[req,JSON.stringify(draft)]);
 expect(r.rows[0].s.id).toBe(id);expect(r.rows[0].s.scenario_id).toBeNull();
 expect((await db.query('select * from scenarios')).rows).toHaveLength(0);
 await expect(db.query('select public.start_private_practice($1,$2::jsonb)',[req,JSON.stringify({...draft,title:"changed"})])).rejects.toThrow();
 await expect(db.query('update sessions set custom_practice_snapshot=$1::jsonb where id=$2',[JSON.stringify({...draft,title:"changed"}),id])).rejects.toThrow("immutable");
});
it("cross-owner reviewer denies private session, transcript, Scope, report and hidden state",async()=>{
 await db.exec(`SET test.uid='${owner}'`);
 await db.query('insert into messages(session_id,content) values($1,$2)',[id,"Private synthetic speech"]);
 await db.query('insert into scope_revisions(session_id,snapshot) values($1,$2)',[id,JSON.stringify({outcome:"Private"})]);
 await db.query('insert into evaluations(session_id) values($1)',[id]);
 expect((await db.query('select * from messages')).rows).toHaveLength(1);
 // Even owner cannot read simulator state.
 expect((await db.query('select * from stakeholder_states')).rows).toHaveLength(0);
 await db.exec(`SET test.uid='${other}'`);
 for(const t of ['sessions','messages','scope_revisions','evaluations','stakeholder_states']) expect((await db.query(`select * from ${t}`)).rows).toHaveLength(0);
 await expect(db.query('insert into messages(session_id,content) values($1,$2)',[id,"intrusion"])).rejects.toThrow("row-level security");
 expect((await db.query('update sessions set candidate_name=$1 where id=$2 returning id',["intrusion",id])).rows).toHaveLength(0);
});
it("database refuses certification submission, assignment, human decision and promotion",async()=>{
 await db.exec(`SET test.uid='${owner}'`);
 await expect(db.query('update sessions set submission_requested_at=now() where id=$1',[id])).rejects.toThrow("not certification");
 await expect(db.query('update sessions set assignment_id=$1 where id=$2',[req,id])).rejects.toThrow("not certification");
 await expect(db.query("update sessions set status='approved' where id=$1",[id])).rejects.toThrow("not certification");
 await expect(db.query("update evaluations set reviewer_decision='approved' where session_id=$1",[id])).rejects.toThrow("cannot receive");
 expect((await db.query<{ok:boolean}>('select standardized_session($1) ok',[id])).rows[0].ok).toBe(false);
});
it("new frozen roster seeds private states only, and standardized rows retain reviewer access",async()=>{
 await db.exec('RESET ROLE');
 expect((await db.query<{stakeholder_id:string}>('select stakeholder_id from stakeholder_states where session_id=$1 order by stakeholder_id',[id])).rows.map(r=>r.stakeholder_id)).toEqual(['Alex Park','Sam Lee']);
 await db.query('insert into scenarios(id,stakeholders) values($1,$2)',[req,JSON.stringify([{name:"Standard person"}])]);
 await db.query('insert into sessions(owner_id,scenario_id,status) values($1,$2,$3)',[owner,req,"framing"]);
 await db.exec(`SET ROLE authenticated; SET test.uid='${other}'`);
 expect((await db.query('select * from sessions')).rows).toHaveLength(1);
 expect((await db.query('select * from stakeholder_states')).rows).toHaveLength(1);
});
