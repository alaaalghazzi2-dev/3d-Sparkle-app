const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');
test('campaign RLS, schedule overlap, approval and server-owned discount',async()=>{
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
 for(const f of ['001_accounts.sql','20261022093719_model_sources.sql','20261029200155_seasonal_campaigns.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 const A='00000000-0000-0000-0000-000000000001',ADMIN='00000000-0000-0000-0000-000000000002';for(const id of [A,ADMIN])await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.admins values($1)',[ADMIN]);
 async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+(id?'authenticated':'anon'));}
 await as(null);assert.equal((await db.query('select * from campaigns')).rows.length,0);await assert.rejects(db.query("insert into campaigns(slug,title,starts_on,ends_on) values('bad','x',current_date,current_date)"));
 await as(ADMIN);const c=(await db.query("insert into campaigns(slug,title,starts_on,ends_on,discount,published) values('test','Test',(now() at time zone 'Asia/Damascus')::date,(now() at time zone 'Asia/Damascus')::date,20,true) returning id")).rows[0].id;
 await assert.rejects(db.query("insert into campaigns(slug,title,starts_on,ends_on,published) select 'overlap','x',starts_on,ends_on,true from campaigns where id=$1",[c]));
 await db.query("insert into campaign_items(campaign_id,source,model_id,title,image,approved) values($1,'makeronline','1','Keychain','https://example.com/image.jpg',true),($1,'makeronline','2','Pending','https://example.com/image.jpg',false)",[c]);
 await as(null);assert.equal((await db.query('select * from campaign_items')).rows.length,1);
 await as(A);await assert.rejects(db.query("insert into campaigns(slug,title,starts_on,ends_on) values('user','x',current_date,current_date)"));
 const order=(id)=>db.query("insert into orders(user_id,model_id,model_title,name,phone,address,quantity,campaign_id) values($1,$2,'Keychain','Name','12345678','Address',1,$3) returning campaign_discount",[A,id,c]);assert.equal((await order('1')).rows[0].campaign_discount,20);await assert.rejects(order('2'));
 await assert.rejects(db.query('update orders set campaign_discount=90'));
 await as(ADMIN);await db.query('update campaigns set paused=true where id=$1',[c]);await as(A);await assert.rejects(order('1'));
 await as(ADMIN);await db.query("update campaigns set paused=false,starts_on=current_date-3,ends_on=current_date-2 where id=$1",[c]);await as(A);await assert.rejects(order('1'));await as(null);assert.equal((await db.query('select * from campaigns')).rows.length,1);
 await db.close();
});
