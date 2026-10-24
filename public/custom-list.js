window.loadCustomRequests=async function(db,container,admin=false){
 const el=document.getElementById(container);if(!el)return;el.textContent='جارٍ تحميل طلبات الأفكار…';
 const add=(p,tag,value)=>{const e=document.createElement(tag);e.textContent=value;p.append(e);return e;};
 const states={quote_requested:'بانتظار التسعير',contacted:'تم التواصل',confirmed:'مؤكد',completed:'مكتمل',cancelled:'ملغى'};
 try{const {data,error}=await db.from('custom_requests').select('*').neq('status','uploading').order('created_at',{ascending:false}).limit(100);if(error)throw error;el.replaceChildren();if(!data.length)el.textContent='لا توجد طلبات أفكار بعد.';
  for(const r of data){const card=add(el,'article','');card.className='message custom-request';add(card,'h3',r.description);add(card,'small','رقم الطلب: '+r.id+' — '+new Date(r.created_at).toLocaleDateString('ar'));add(card,'p','الألوان: '+r.color+' | الأبعاد: '+[r.length_cm,r.width_cm,r.height_cm].join(' × ')+' سم | الكمية: '+r.quantity);add(card,'p','الحالة: '+states[r.status]);
   if(admin){add(card,'p',[r.user_id?'عميل مسجّل':'زائر',r.name,r.phone,r.address].filter(Boolean).join(' — '));const phone=r.phone.replace(/[^0-9]/g,'');if(phone.length>=8){const contact=add(card,'a','التواصل عبر واتساب');contact.href='https://wa.me/'+phone+'?text='+encodeURIComponent('مرحبًا '+r.name+'، بخصوص طلبك الخاص في Sparkle 3D رقم '+r.id);contact.target='_blank';contact.rel='noopener noreferrer';}}
   const imageButton=add(card,'button','عرض الصورة');imageButton.type='button';imageButton.className='secondary';imageButton.onclick=async()=>{imageButton.disabled=true;try{const s=await db.storage.from('custom-requests').createSignedUrl(r.image_path,600);if(s.error)throw s.error;const link=add(card,'a','');link.href=s.data.signedUrl;link.target='_blank';link.rel='noopener noreferrer';const img=add(link,'img','');img.alt='صورة الفكرة المطلوبة';img.className='custom-preview';img.src=s.data.signedUrl;imageButton.remove();}catch{imageButton.textContent='تعذّر عرض الصورة — أعد المحاولة';imageButton.disabled=false;}};
   if(admin)addOrderEditor(db,card,'custom_requests',r);
  }
 }catch{el.textContent='تعذّر تحميل طلبات الأفكار. أعد تحميل الصفحة للمحاولة.';}
};
