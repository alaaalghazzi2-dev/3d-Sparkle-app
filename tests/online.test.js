const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');
test('online users expire, switch identity, deduplicate and require admin',async()=>{
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
 for(const f of ['001_accounts.sql','20261022093719_model_sources.sql','20261022105830_visitor_order_analytics.sql','20261027065503_online_visitors.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 const A='00000000-0000-0000-0000-000000000001',ADMIN='00000000-0000-0000-0000-000000000002',V='10000000-0000-0000-0000-000000000001',G='10000000-0000-0000-0000-000000000002';
 for(const id of [A,ADMIN])await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.admins values($1)',[ADMIN]);
 async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+(id?'authenticated':'anon'));}

 await as(null);await db.query('select heartbeat($1)',[V]);await db.query('select heartbeat($1)',[V]);await db.query('select heartbeat($1)',[G]);
 await assert.rejects(db.query('select * from private.online_visitors'));await assert.rejects(db.query('select online_summary()'));
 await as(A);await db.query('select heartbeat($1)',[V]);await assert.rejects(db.query('select online_summary()'));
 await as(ADMIN);assert.deepEqual((await db.query('select online_summary() as d')).rows[0].d,{total:2,registered:1,guests:1});
 await as(null);await db.query('select heartbeat($1)',[V]);
 await as(ADMIN);assert.deepEqual((await db.query('select online_summary() as d')).rows[0].d,{total:2,registered:0,guests:2});
 await db.query('select heartbeat($1)',[V]);assert.equal((await db.query('select online_summary() as d')).rows[0].d.total,1);
 await db.exec("reset role;update private.online_visitors set last_seen=now()-interval '6 minutes'");await as(ADMIN);assert.equal((await db.query('select online_summary() as d')).rows[0].d.total,0);
 await as(A);await db.query('select heartbeat($1)',[V]);await db.query('select heartbeat($1)',[G]);await as(ADMIN);assert.deepEqual((await db.query('select online_summary() as d')).rows[0].d,{total:1,registered:1,guests:0});
 await db.close();
});
