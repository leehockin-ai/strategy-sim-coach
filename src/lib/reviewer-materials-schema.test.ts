import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll,afterAll,it,expect } from "vitest";
let db:PGlite;
const owner="11111111-1111-4111-8111-111111111111",other="22222222-2222-4222-8222-222222222222",reviewer="33333333-3333-4333-8333-333333333333",session="44444444-4444-4444-8444-444444444444",request="55555555-5555-4555-8555-555555555555";
beforeAll(async()=>{
 db=new PGlite();await db.exec(`CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE SCHEMA storage;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='${reviewer}' AND $2='reviewer' $$;
 CREATE TABLE sessions(id uuid primary key,owner_id uuid,scenario_id uuid,submission_requested_at timestamptz);
 CREATE TABLE evaluations(id uuid primary key,session_id uuid, scores jsonb DEFAULT '{"unchanged":true}');
 CREATE TABLE storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 GRANT USAGE ON SCHEMA auth,storage TO authenticated; GRANT SELECT ON sessions TO authenticated; GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;CREATE POLICY broad_legacy ON storage.objects FOR ALL TO authenticated USING(true) WITH CHECK(true);
 INSERT INTO sessions(id,owner_id,scenario_id) VALUES('${session}','${owner}','${request}'); INSERT INTO evaluations(id,session_id) VALUES('${request}','${session}');`);
 await db.exec(readFileSync('docs/unapplied/reviewer-materials.sql','utf8'));
},120000);
afterAll(async()=>{await db?.close()});
it("atomic submit is frozen/idempotent, owner-bound and never changes original scores",async()=>{
 const file={name:"synthetic.pdf",type:"application/pdf",size:32,path:`reviewer-supplements/${owner}/${session}/${request}/0-hash`};
 await expect(db.query('select submit_reviewer_materials($1,$2,$3,$4,$5::jsonb)',[session,other,request,"note",JSON.stringify([file])])).rejects.toThrow('Forbidden');
 const first=await db.query<{result:any}>('select submit_reviewer_materials($1,$2,$3,$4,$5::jsonb) result',[session,owner,request,"note",JSON.stringify([file])]);expect(first.rows[0].result.alreadySubmitted).toBe(false);
 const retry=await db.query<{result:any}>('select submit_reviewer_materials($1,$2,$3,$4,$5::jsonb) result',[session,owner,request,"note",JSON.stringify([file])]);expect(retry.rows[0].result.alreadySubmitted).toBe(true);
 await expect(db.query('select submit_reviewer_materials($1,$2,$3,$4,$5::jsonb)',[session,owner,request,"changed",JSON.stringify([file])])).rejects.toThrow('frozen');
 expect((await db.query<{scores:any}>('select scores from evaluations')).rows[0].scores).toEqual({unchanged:true});
});
it("owner and authorized reviewer can read metadata; other users cannot; raw bucket access denied for everyone",async()=>{
 for(const [user,count] of [[owner,1],[reviewer,1],[other,0]] as const){await db.exec(`SET ROLE authenticated;SET test.uid='${user}'`);expect((await db.query('select * from reviewer_supplements')).rows).toHaveLength(count);await expect(db.exec(`INSERT INTO storage.objects(bucket_id,name) VALUES('playbooks','reviewer-supplements/private')`)).rejects.toThrow('row-level security');await expect(db.query('select submit_reviewer_materials($1,$2,$3,$4,$5::jsonb)',[session,owner,request,"note","[]"])).rejects.toThrow('permission denied');await db.exec('RESET ROLE');}
});
it("historical submissions and custom sessions cannot receive a new supplement",async()=>{
 await db.exec(`INSERT INTO sessions VALUES('${other}','${owner}','${request}',now());INSERT INTO evaluations(id,session_id) VALUES('${other}','${other}');INSERT INTO sessions VALUES('${reviewer}','${owner}',NULL,NULL);INSERT INTO evaluations(id,session_id) VALUES('${reviewer}','${reviewer}');`);
 await expect(db.query('select submit_reviewer_materials($1,$2,$3,$4,$5::jsonb)',[other,owner,request,"note","[]"])).rejects.toThrow('Historical');
 await expect(db.query('select submit_reviewer_materials($1,$2,$3,$4,$5::jsonb)',[reviewer,owner,request,"note","[]"])).rejects.toThrow('Forbidden');
});