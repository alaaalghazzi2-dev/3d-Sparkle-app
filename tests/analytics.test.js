const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');
test('analytics deduplicates visitors, upgrades logins, ranks requests and restricts reports to admins',async()=>{
 const db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
 for(const f of ['001_accounts.sql','20261022093719_model_sources.sql','20261022105830_visitor_order_analytics.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+f,'utf8'));
 const A='00000000-0000-0000-0000-000000000001',ADMIN='00000000-0000-0000-0000-000000000002',V='10000000-0000-0000-0000-000000000001',G='10000000-0000-0000-0000-000000000002';
 for(const id of [A,ADMIN])await db.query('insert into auth.users(id) values($1)',[id]);await db.query('insert into public.admins values($1)',[ADMIN]);
 async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+(id?'authenticated':'anon'));}
 await as(null);await db.query('select record_visit($1)',[V]);await db.query('select record_visit($1)',[V]);await db.query('select record_visit($1)',[G]);
 await assert.rejects(db.query('select * from private.visitor_days'));await assert.rejects(db.query('select dashboard_analytics(30)'));
 const request='20000000-0000-0000-0000-000000000001';
 await db.query("select record_guest_request($1,'makeronline','1','Original title',4)",[request]);await db.query("select record_guest_request($1,'makeronline','1','Original title',4)",[request]);
 await assert.rejects(db.query("select record_guest_request($1,'bad','1','bad',1)",['20000000-0000-0000-0000-000000000003']));
 await as(A);await db.query('select record_visit($1)',[V]);await assert.rejects(db.query('select dashboard_analytics(30)'));await assert.rejects(db.query("select record_guest_request($1,'makeronline','1','spoof',1)",[request]));
 for(const [source,quantity,status] of [['makeronline',2,'quote_requested'],['makeronline',3,'quote_requested'],['cults',1,'quote_requested']])await db.query("insert into orders(user_id,model_source,model_id,model_title,name,phone,address,quantity) values($1,$2,'1','English title','Test','12345678','Test',$3)",[A,source,quantity]);
 await as(null);await db.query('select record_visit($1)',[V]);
 await as(ADMIN);await db.query('select record_visit($1)',['10000000-0000-0000-0000-000000000003']);
 const report=(await db.query('select dashboard_analytics(30) as data')).rows[0].data;
 assert.deepEqual(report.visitors,{total:2,registered:1,guests:1});assert.equal(report.requests,4);assert.equal(report.products.length,2);assert.equal(report.products[0].model_source,'makeronline');assert.equal(report.products[0].requests,3);assert.equal(report.products[0].units,9);assert.equal(report.products[0].guest_requests,1);assert.equal(report.products[0].registered_requests,2);
 await db.query("update orders set status='cancelled' where model_source='cults'");assert.equal((await db.query('select dashboard_analytics(0) as data')).rows[0].data.requests,3);
 await assert.rejects(db.query('select dashboard_analytics(999)'));await db.close();
});
