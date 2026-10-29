(() => {
const params = new URLSearchParams(location.search);
const title = params.get('title') || '';
const legacy=(params.get('link')||'').match(/\/(\d+)\.html/);
const modelId=params.get('id')||(legacy?legacy[1]:'');
const modelSource=params.get('source')||'makeronline';
const modelPath=modelSource==='cults'?(params.get('path')||''):'';
let imageUrl='';
try{const u=new URL(params.get('image')||'');if(u.protocol==='https:'&&!u.username&&!u.password&&!/\.(mp4|webm)(?:$|\?)/i.test(u.href))imageUrl=u.href;}catch{}
let imageFile=null;
if(imageUrl){
 const img=document.createElement('img');img.src=imageUrl;img.alt=title;img.referrerPolicy='no-referrer';img.style.cssText='display:block;max-width:100%;max-height:240px;object-fit:contain;margin:12px auto;border-radius:12px';img.onerror=()=>img.remove();document.getElementById('product').after(img);
 fetch(imageUrl,{referrerPolicy:'no-referrer',credentials:'omit',signal:AbortSignal.timeout(10000)}).then(r=>{if(!r.ok)throw Error();return r.blob();}).then(b=>{if(/^image\/(jpeg|png|webp)$/.test(b.type)&&b.size<=10*1024*1024)imageFile=new File([b],'sparkle-order.'+({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[b.type]),{type:b.type});}).catch(()=>{});
}
const campaignSlug=params.get('campaign')||'';
if(campaignSlug){const note=document.createElement('p');note.textContent='طلب من حملة موسمية — سيُتحقق من الخصم عند متابعة الطلب.';document.getElementById('product').after(note);fetch('/api/campaigns?slug='+encodeURIComponent(campaignSlug),{cache:'no-store'}).then(r=>r.json()).then(d=>{note.textContent=d.campaign?.state==='active'?d.campaign.title+' — خصم '+d.campaign.discount+'% مع استمرار بطاقة الولاء وفق شروطها.':'العرض غير نشط حاليًا.';}).catch(()=>{});}

const form = document.getElementById('orderForm');
const status = document.getElementById('orderStatus');
const button = document.getElementById('send');
document.getElementById('product').textContent = title;
form.noValidate = true;
let previousRequest=null,guestRequest=null;
const output = document.createElement('div');
status.after(output);
function digits(s) {
 return String(s).replace(/[٠-٩]/g, c => String(c.charCodeAt(0)-1632))
 .replace(/[۰-۹]/g, c => String(c.charCodeAt(0)-1776));
}
function error(message) {
 output.replaceChildren();status.textContent = message;
 status.style.color = '#b91c1c';status.scrollIntoView({block:'center',behavior:'smooth'});
}
form.addEventListener('submit', async event => {
 event.preventDefault();
 if(button.disabled)return;button.disabled=true;
 try {
 if (!title || !(['makeronline','cults'].includes(modelSource)&&(modelSource==='makeronline'?/^\d{1,15}$/:/^[A-Za-z0-9_-]{1,100}$/).test(modelId))) return error('لم يتم تحديد نموذج صالح. ارجع للصفحة الرئيسية واختر شراء من بطاقة النموذج.');
 const data = new FormData(form);
 const name = String(data.get('name')||'').trim();
 const address = String(data.get('address')||'').trim();
 let phone = digits(data.get('phone')||'').replace(/[\s()\-\u200e\u200f\u061c]/g,'');
 if(phone.startsWith('00')) phone='+'+phone.slice(2);
 if(/^09\d{8}$/.test(phone)) phone='+963'+phone.slice(1);
 if(/^963\d{9}$/.test(phone)) phone='+'+phone;
 const quantity = Number(digits(data.get('quantity')||''));
 if(!name || !address) return error('يرجى إدخال الاسم والعنوان لإكمال الطلب.');
 if(!/^\+?[1-9]\d{7,14}$/.test(phone)) return error('أدخل رقم واتساب صحيحًا، مثل 0998227776 أو +963998227776. الأرقام العربية مقبولة.');
 if(!Number.isInteger(quantity)||quantity<1||quantity>1000) return error('أدخل كمية بين 1 و1000.');
 let campaign=null;
 if(campaignSlug){const r=await fetch('/api/campaigns?slug='+encodeURIComponent(campaignSlug),{cache:'no-store',signal:AbortSignal.timeout(12000)});const d=await r.json();if(!r.ok)throw Error();if(!d.campaign||d.campaign.state!=='active'||!d.posts.some(p=>p.id===modelId&&p.source===modelSource))return error('العرض غير متاح حاليًا لهذا المنتج. ارجع إلى المتجر لاختيار طلب جديد.');campaign=d.campaign;}
 const text = ['طلب عرض سعر من Sparkle 3D','النموذج: '+title,...(campaign?['الحملة: '+campaign.title,'خصم الحملة: '+campaign.discount+'% — بطاقة الولاء مستمرة وفق شروطها']:[]),...(imageUrl?['صورة النموذج: '+imageUrl]:[]),'رقم النموذج: '+modelId,'المصدر: '+(modelSource==='cults'?'Cults':'MakerOnline'),'الاسم: '+name,'العنوان: '+address,'واتساب المشتري: '+phone,'الكمية: '+quantity,'ملاحظات: '+String(data.get('notes')||'').trim(),'يرجى إرسال الكلفة ومدة التسليم.'].join('\n');
 let savedId='';
 let db=null;try{db=await Sparkle.client();}catch{}
 if(db){
 const {data:sessionData}=await db.auth.getSession();
 if(sessionData.session){
 const fingerprint=JSON.stringify([campaign?.id,campaign?.discount,sessionData.session.user.id,modelSource,modelId,title,name,phone,address,quantity,String(data.get('notes')||'').trim()]);
 if(previousRequest?.fingerprint===fingerprint){savedId=previousRequest.id;}else{
 const {data:record,error:saveError}=await db.from('orders').insert({...(campaign?{campaign_id:campaign.id}:{}),user_id:sessionData.session.user.id,model_id:modelId,model_title:title,model_source:modelSource,model_path:modelPath,name,phone,address,quantity,notes:String(data.get('notes')||'').trim()}).select('id').single();
 if(saveError)return error('تعذّر حفظ الطلب في حسابك. لم يتم إرسال الطلب؛ حاول مجددًا.');
 savedId=record.id;previousRequest={fingerprint,id:savedId};
 }
 }else{
 const fingerprint=JSON.stringify([campaign?.id,campaign?.discount,modelSource,modelId,title,name,phone,address,quantity,String(data.get('notes')||'').trim()]);
 if(guestRequest?.fingerprint!==fingerprint)guestRequest={fingerprint,id:crypto.randomUUID()};
 try{await db.rpc('record_guest_request',{p_request_id:guestRequest.id,p_source:modelSource,p_model_id:modelId,p_title:title,p_quantity:quantity}).abortSignal(AbortSignal.timeout(4000));}catch{}
 }
 }
 const recipient = '963998227776';
 const fullText=text+(savedId?'\nرقم الطلب: '+savedId:'');
 const href = 'https://wa.me/'+recipient+'?text='+encodeURIComponent(fullText);
 output.replaceChildren();
 const a = document.createElement('a');a.href=href;a.textContent='اضغط هنا لفتح واتساب إذا لم يفتح تلقائيًا';a.className='buy';
 const preview = document.createElement('textarea');preview.readOnly=true;preview.value=fullText;preview.setAttribute('aria-label','نص الطلب لنسخه');preview.style.width='100%';preview.style.minHeight='220px';
 output.append(a,preview);
 if(imageFile&&navigator.canShare?.({files:[imageFile]})){
 const share=document.createElement('button');share.type='button';share.textContent='مشاركة صورة واحدة مع تفاصيل الطلب';
 share.onclick=async()=>{try{await navigator.share({files:[imageFile],title,text:fullText.replace('صورة النموذج: '+imageUrl+'\n','')});}catch(e){if(e.name!=='AbortError')status.textContent='تعذّرت مشاركة الصورة. استخدم رابط واتساب الذي يتضمن رابط الصورة.';}};
 const hint=document.createElement('p');hint.textContent='اختر واتساب ثم محادثة المتجر +963998227776. إذا لم ينقل الهاتف النص مع الصورة، انسخ تفاصيل الطلب من المربع أدناه.';output.prepend(share,hint);
 }
 status.style.color='#166534';status.textContent='الرسالة جاهزة. اضغط «إرسال» داخل واتساب لتصل إلى المتجر. لم يُرسل الطلب بعد.';
 if(!imageFile||!navigator.canShare?.({files:[imageFile]}))window.location.assign(href);
 } catch(e) { error('تعذّر فتح واتساب. حاول فتح الصفحة في Chrome أو Safari ثم أعد المحاولة.'); } finally {button.disabled=false;}
});
})();