(async()=>{
 const $=id=>document.getElementById(id),form=$('customForm');let db,imageBlob,previewUrl,pending,busy=false,imageVersion=0;
 const check=r=>{if(r.error)throw r.error;return r.data;};
 async function compress(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('اختر صورة JPG أو PNG أو WebP بحجم لا يتجاوز 10 MB.');
  const url=URL.createObjectURL(file),img=new Image();
  try{await new Promise((ok,no)=>{img.onload=ok;img.onerror=no;img.src=url;});
   const scale=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
   for(const quality of [.85,.7,.5,.3]){const blob=await new Promise(ok=>canvas.toBlob(ok,'image/jpeg',quality));if(blob&&blob.size<=1048576)return blob;}
   throw Error('الصورة كبيرة بعد المعالجة. اختر صورة أصغر.');
  }finally{URL.revokeObjectURL(url);}
 }
 $('referenceImage').onchange=async()=>{const version=++imageVersion;imageBlob=null;$('imagePreview').hidden=true;$('imageStatus').textContent='جارٍ تجهيز الصورة…';$('submitCustom').disabled=true;
  try{const file=$('referenceImage').files[0];if(!file){$('imageStatus').textContent='اختر صورة للفكرة.';return;}const blob=await compress(file);if(version!==imageVersion)return;imageBlob=blob;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);$('imagePreview').src=previewUrl;$('imagePreview').hidden=false;$('imageStatus').textContent='الصورة جاهزة — '+Math.ceil(blob.size/1024)+' KB';}
  catch(e){if(version===imageVersion)$('imageStatus').textContent=e.message||'تعذّر فتح الصورة، اختر صورة أخرى.';}
  finally{if(version===imageVersion)$('submitCustom').disabled=false;}
 };
 try{db=await Sparkle.client();const {data}=await db.auth.getSession();if(data.session){const r=await db.from('profiles').select('name,phone,address').eq('id',data.session.user.id).single();if(r.data)for(const k of ['name','phone','address'])if(!form.elements[k].value)form.elements[k].value=r.data[k]||'';}}
 catch{$('customStatus').textContent='تعذّر الاتصال. يمكنك تعبئة البيانات والمحاولة مجددًا.';}
 form.onsubmit=async e=>{e.preventDefault();if(busy)return;if(!imageBlob){$('customStatus').textContent='اختر صورة صالحة أولًا.';return;}if(!form.reportValidity())return;
  busy=true;$('submitCustom').disabled=true;$('customStatus').textContent='جارٍ حفظ الطلب ورفع الصورة…';
  try{
   if(!db)db=await Sparkle.client();
   if(!pending){const f=new FormData(form),details={};for(const k of ['name','phone','address','description','color'])details[k]=String(f.get(k)||'').trim();for(const k of ['length_cm','width_cm','height_cm','quantity'])details[k]=Number(f.get(k));pending={id:crypto.randomUUID(),token:crypto.randomUUID(),details};}
   $('customFields').disabled=true;
   const state=check(await db.rpc('start_custom_request',{p_id:pending.id,p_token:pending.token,p_details:pending.details}));
   if(state==='uploading'){
    const upload=await db.storage.from('custom-requests').upload(pending.id+'/'+pending.token+'.jpg',imageBlob,{contentType:'image/jpeg',upsert:false});
    // A retry may find the image already saved after a dropped response. The
    // finalizer independently verifies the image, identity and capability.
    const finished=await db.rpc('finish_custom_request',{p_id:pending.id,p_token:pending.token});
    if(finished.error)throw upload.error||finished.error;
   }
   const d=pending.details,msg=['طلب تصميم وطباعة خاص — Sparkle 3D','رقم الطلب: '+pending.id,'الاسم: '+d.name,'واتساب: '+d.phone,'العنوان: '+(d.address||'غير محدد'),'الفكرة: '+d.description,'الألوان: '+d.color,'الأبعاد (طول × عرض × ارتفاع): '+[d.length_cm,d.width_cm,d.height_cm].join(' × ')+' سم','الكمية: '+d.quantity,'الصورة محفوظة مع الطلب في لوحة المسؤول.'].join('\n');
   $('customWhatsapp').href='https://wa.me/'+window.SHOP_WHATSAPP+'?text='+encodeURIComponent(msg);$('requestNumber').textContent=pending.id;form.hidden=true;$('customSuccess').hidden=false;$('customSuccess').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){if(['23514','23502','22P02'].includes(e.code)){pending=null;$('customFields').disabled=false;}$('customStatus').textContent=String(e.message||'').includes('Request limit')?'بلغت الحد المؤقت للطلبات. يرجى المحاولة لاحقًا.':'لم يكتمل إرسال الطلب. تحقق من الاتصال ثم اضغط إعادة المحاولة؛ سنستخدم رقم الطلب نفسه لتجنب التكرار.';$('submitCustom').textContent='إعادة المحاولة';}
  finally{busy=false;$('submitCustom').disabled=false;}
 };
})();
