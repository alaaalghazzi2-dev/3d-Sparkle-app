(() => {
const params = new URLSearchParams(location.search);
const title = params.get('title') || '';
const legacy=(params.get('link')||'').match(/\/(\d+)\.html/);
const modelId=params.get('id')||(legacy?legacy[1]:'');
const form = document.getElementById('orderForm');
const status = document.getElementById('orderStatus');
const button = document.getElementById('send');
document.getElementById('product').textContent = title;
form.noValidate = true;
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
 if (!title || !/^\d{1,15}$/.test(modelId)) return error('لم يتم تحديد نموذج صالح. ارجع للصفحة الرئيسية واختر شراء من بطاقة النموذج.');
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
 const text = ['طلب عرض سعر من Sparkle 3D','النموذج: '+title,'رقم النموذج: '+modelId,'الاسم: '+name,'العنوان: '+address,'واتساب المشتري: '+phone,'الكمية: '+quantity,'ملاحظات: '+String(data.get('notes')||'').trim(),'يرجى إرسال الكلفة ومدة التسليم.'].join('\n');
 let savedId='';
 let db=null;try{db=await Sparkle.client();}catch{}
 if(db){
 const {data:sessionData}=await db.auth.getSession();
 if(sessionData.session){
 const {data:record,error:saveError}=await db.from('orders').insert({user_id:sessionData.session.user.id,model_id:modelId,model_title:title,name,phone,address,quantity,notes:String(data.get('notes')||'').trim()}).select('id').single();
 if(saveError)return error('تعذّر حفظ الطلب في حسابك. لم يتم إرسال الطلب؛ حاول مجددًا.');
 savedId=record.id;
 }
 }
 const recipient = '963998227776';
 const href = 'https://wa.me/'+recipient+'?text='+encodeURIComponent(text+(savedId?'\nرقم الطلب: '+savedId:''));
 output.replaceChildren();
 const a = document.createElement('a');a.href=href;a.textContent='اضغط هنا لفتح واتساب إذا لم يفتح تلقائيًا';a.className='buy';
 const preview = document.createElement('textarea');preview.readOnly=true;preview.value=text;preview.setAttribute('aria-label','نص الطلب لنسخه');preview.style.width='100%';preview.style.minHeight='220px';
 output.append(a,preview);
 status.style.color='#166534';status.textContent='الرسالة جاهزة. اضغط «إرسال» داخل واتساب لتصل إلى المتجر. لم يُرسل الطلب بعد.';
 window.location.assign(href);
 } catch(e) { error('تعذّر فتح واتساب. حاول فتح الصفحة في Chrome أو Safari ثم أعد المحاولة.'); } finally {button.disabled=false;}
});
})();