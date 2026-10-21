const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');
test('PostgreSQL roles isolate customers and protect administrator actions',async()=>{
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
await db.exec(fs.readFileSync('supabase/migrations/001_accounts.sql','utf8'));
const A='00000000-0000-0000-0000-000000000001',B='00000000-0000-0000-0000-000000000002',ADMIN='00000000-0000-0000-0000-000000000003';
for(const id of [A,B,ADMIN])await db.query('insert into auth.users(id) values($1)',[id]);
await db.query('insert into public.admins values($1)',[ADMIN]);
async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
await as(A);
assert.equal((await db.query('select * from profiles')).rows.length,1);
assert.equal((await db.query('select * from messages')).rows.length,1);
assert.equal((await db.query('select is_admin() as value')).rows[0].value,false);
await assert.rejects(db.query('insert into admins values($1)',[A]));
await assert.rejects(db.query("insert into messages(title,body) values('bad','bad')"));
await db.query('update profiles set name=$1 where id=$2',['intrusion',B]);
assert.equal((await db.query('select name from profiles where id=$1',[B])).rows.length,0);
await db.query("insert into orders(user_id,model_id,model_title,name,phone,address,quantity) values($1,'123','model','name','0998227776','address',1)",[A]);
await assert.rejects(db.query("insert into orders(user_id,model_id,model_title,name,phone,address,quantity) values($1,'123','model','name','0998227776','address',1)",[B]));
await as(B);assert.equal((await db.query('select * from orders')).rows.length,0);
await as(ADMIN);assert.equal((await db.query('select * from profiles')).rows.length,3);assert.equal((await db.query('select * from orders')).rows.length,1);
await db.query("insert into messages(title,body,kind) values('offer','discount','offer')");
await as(A);assert.equal((await db.query("select * from messages where kind='offer'")).rows.length,0);
await db.query('update profiles set marketing_opt_in=true where id=$1',[A]);assert.equal((await db.query("select * from messages where kind='offer'")).rows.length,1);
await db.exec('reset role;set role anon');await assert.rejects(db.query('select * from profiles'));await db.close();
});
test('unconfigured or forged sessions never grant admin',async()=>{const {isAdmin}=require('../lib/access');assert.equal(await isAdmin({headers:{}}),false);const old=process.env.SUPABASE_URL;delete process.env.SUPABASE_URL;assert.equal(await isAdmin({headers:{authorization:'Bearer forged'}}),false);if(old)process.env.SUPABASE_URL=old;});
