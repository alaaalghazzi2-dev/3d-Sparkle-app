(async()=>{
const $=id=>document.getElementById(id),say=s=>{$('feedback').textContent=s;};let db,user;let recovering=location.hash.includes("type=recovery");
function check(r){if(r.error)throw r.error;return r.data;}
const friendly=e=>({invalid_credentials:'البريد أو كلمة المرور غير صحيحة.',user_already_exists:'يوجد حساب بهذا البريد.',email_not_confirmed:'أكد بريدك الإلكتروني قبل الدخول.',over_email_send_rate_limit:'انتظر قليلًا قبل طلب رسالة أخرى.'}[e.code]||'تعذّرت العملية. تحقق من البيانات والاتصال ثم حاول مجددًا.');
async function action(fn){try{await fn();}catch(e){say(friendly(e));}}
function cards(id,rows,render){$(id).replaceChildren();if(!rows.length)$(id).textContent='لا توجد عناصر بعد.';for(const row of rows){const article=document.createElement('article');article.className='message';render(article,row);$(id).append(article);}}
function line(a,tag,text){const e=document.createElement(tag);e.textContent=text;a.append(e);}
async function load(){const result=await db.auth.getUser();user=result.data.user;$('auth').hidden=!!user||recovering;$('member').hidden=!user||recovering;$('recovery').hidden=!recovering;if(!user||recovering)return;
 const p=check(await db.from('profiles').select('*').eq('id',user.id).single());for(const k of ['name','phone','address'])$('profile').elements[k].value=p[k];$('profile').elements.marketing_opt_in.checked=p.marketing_opt_in;
 const messages=check(await db.from('messages').select('*').order('created_at',{ascending:false}).limit(100));cards('messages',messages,(a,m)=>{line(a,'h3',m.title);line(a,'p',m.body);line(a,'small',new Date(m.created_at).toLocaleDateString('ar'));});
 const orders=check(await db.from('orders').select('*').order('created_at',{ascending:false}).limit(100));cards('orders',orders,(a,o)=>{line(a,'h3',o.model_title);line(a,'p','الكمية: '+o.quantity+' — '+({quote_requested:'بانتظار التسعير',contacted:'تم التواصل',confirmed:'مؤكد',completed:'مكتمل',cancelled:'ملغى'}[o.status]));});
}
try{db=await Sparkle.client();}catch(e){say(e.message);$('auth').hidden=true;return;}
db.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY'){recovering=true;$('recovery').hidden=false;$('auth').hidden=true;$('member').hidden=true;}});
$('login').onsubmit=e=>{e.preventDefault();action(async()=>{const f=new FormData(e.target);check(await db.auth.signInWithPassword({email:f.get('email'),password:f.get('password')}));location.reload();});};
$('signup').onsubmit=e=>{e.preventDefault();action(async()=>{const f=new FormData(e.target);const d=check(await db.auth.signUp({email:f.get('email'),password:f.get('password'),options:{emailRedirectTo:location.origin+'/account.html',data:{name:f.get('name'),phone:f.get('phone'),address:f.get('address'),marketing_opt_in:f.has('offers')}}}));say(d.session?'تم إنشاء حسابك.':'راجع بريدك الإلكتروني لتأكيد الحساب، ثم سجل الدخول.');e.target.reset();if(d.session)await load();});};
$('forgot').onclick=()=>action(async()=>{const email=$('login').elements.email.value;if(!email)return say('أدخل بريدك الإلكتروني في حقل الدخول أولًا.');check(await db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/account.html'}));say('إذا كان البريد مسجلًا ستصلك رسالة استعادة كلمة المرور.');});
$('reset').onsubmit=e=>{e.preventDefault();action(async()=>{check(await db.auth.updateUser({password:new FormData(e.target).get('password')}));recovering=false;$('recovery').hidden=true;say('تم تغيير كلمة المرور.');await load();});};
$('profile').onsubmit=e=>{e.preventDefault();action(async()=>{const f=new FormData(e.target);check(await db.from('profiles').update({name:f.get('name'),phone:f.get('phone'),address:f.get('address'),marketing_opt_in:f.has('marketing_opt_in')}).eq('id',user.id));say('تم حفظ البيانات.');await load();});};
$('logout').onclick=()=>action(async()=>{check(await db.auth.signOut());location.reload();});await action(load);
})();
