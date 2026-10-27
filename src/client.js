import {createClient} from '@supabase/supabase-js';
let pending;
async function client(){
 if(!pending)pending=(async()=>{const r=await fetch('/api/config',{cache:'no-store'});const c=await r.json();if(!r.ok)throw Error(c.error);return createClient(c.url,c.key);})();
 return pending;
}
async function headers(){try{const db=await client();const {data}=await db.auth.getSession();return data.session?{Authorization:'Bearer '+data.session.access_token}:{};}catch{return {};}}
async function nav(){try{const db=await client();const {data}=await db.auth.getUser();if(data.user){const a=document.getElementById('accountLink');if(a)a.textContent='حسابي ورسائلي';const {data:admin}=await db.rpc('is_admin');if(admin){const a=document.createElement('a');a.href='/admin.html';a.textContent='لوحة المسؤول';document.getElementById('accountNav')?.append(a);}}}catch{}}
window.Sparkle={client,headers};nav();

// Count a browser once per Damascus day. Login upgrades its visit to registered.
async function trackVisits(){
 if(location.pathname==='/admin.html')return;
 let visitor;try{visitor=localStorage.getItem('sparkle_visitor_id');if(!/^[0-9a-f-]{36}$/i.test(visitor||'')){visitor=crypto.randomUUID();localStorage.setItem('sparkle_visitor_id',visitor);}}catch{return;}
 try{const db=await client();let last='';
 async function record(){try{const {data}=await db.auth.getSession();const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Damascus'}).format(new Date());const key=day+':'+(data.session?.user?.id||'guest');if(key===last)return;const r=await db.rpc('record_visit',{p_visitor_id:visitor});if(!r.error)last=key;}catch{}}
 await record();db.auth.onAuthStateChange(()=>{setTimeout(record,0);});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')record();});
 }catch{}
}
trackVisits();

// Visible pages send a heartbeat; server derives login identity from the token.
(async()=>{
 try{
 const db=await client();let visitor;
 try{visitor=localStorage.getItem('sparkle_visitor_id');if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(visitor||'')){visitor=crypto.randomUUID();localStorage.setItem('sparkle_visitor_id',visitor);}}catch{visitor=crypto.randomUUID();}
 let busy=false;
 async function beat(){if(document.visibilityState!=='visible'||busy)return;busy=true;try{await db.rpc('heartbeat',{p_visitor_id:visitor}).abortSignal(AbortSignal.timeout(10000));}catch{}finally{busy=false;}}
 beat();setInterval(beat,60000);document.addEventListener('visibilitychange',beat);db.auth.onAuthStateChange(()=>setTimeout(beat,0));
 }catch{}
})();
