const p=new URLSearchParams(location.search),title=p.get('title')||'',link=p.get('link')||'';
const valid=/^https:\/\/www\.makeronline\.com\/(?:en\/)?model\/.+\/\d+\.html$/.test(link)&&title.length>0&&title.length<=500;
document.getElementById('product').textContent=title;
const statusEl=document.getElementById('orderStatus'),send=document.getElementById('send');
if(!valid){send.disabled=true;statusEl.textContent='اختر نموذجًا من الصفحة الرئيسية أولًا.';}
else if(!/^\d{8,15}$/.test(window.SHOP_WHATSAPP||'')){send.disabled=true;statusEl.textContent='استقبال الطلبات عبر واتساب قيد التجهيز. يرجى العودة لاحقًا.';}
document.getElementById('orderForm').onsubmit=e=>{
 e.preventDefault();if(send.disabled||!valid)return;
 const f=new FormData(e.target),phone=String(f.get('phone')).replace(/[\s()-]/g,'');
 if(!/^\+?[1-9]\d{7,14}$/.test(phone)){statusEl.textContent='أدخل رقم واتساب صحيحًا مع رمز البلد.';return;}
 const msg=['طلب عرض سعر من Sparkle 3D','النموذج: '+title,link,'الاسم: '+f.get('name'),'العنوان: '+f.get('address'),'واتساب المشتري: '+phone,'الكمية: '+f.get('quantity'),'ملاحظات: '+f.get('notes'),'يرجى إرسال الكلفة ومدة التسليم.'].join('\n');
 location.href='https://wa.me/'+window.SHOP_WHATSAPP+'?text='+encodeURIComponent(msg);
};
