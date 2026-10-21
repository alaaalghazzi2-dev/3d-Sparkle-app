import {createClient} from '@supabase/supabase-js';
let pending;
async function client(){
 if(!pending)pending=(async()=>{const r=await fetch('/api/config',{cache:'no-store'});const c=await r.json();if(!r.ok)throw Error(c.error);return createClient(c.url,c.key);})();
 return pending;
}
async function headers(){try{const db=await client();const {data}=await db.auth.getSession();return data.session?{Authorization:'Bearer '+data.session.access_token}:{};}catch{return {};}}
async function nav(){try{const db=await client();const {data}=await db.auth.getUser();if(data.user){const a=document.getElementById('accountLink');if(a)a.textContent='حسابي ورسائلي';const {data:admin}=await db.rpc('is_admin');if(admin){const a=document.createElement('a');a.href='/admin.html';a.textContent='لوحة المسؤول';document.getElementById('accountNav')?.append(a);}}}catch{}}
window.Sparkle={client,headers};nav();
