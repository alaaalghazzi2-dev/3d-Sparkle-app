(()=>{
 const grid=document.getElementById('choicesGrid'),status=document.getElementById('choicesStatus'),button=document.getElementById('reloadChoices'),empty=document.getElementById('choicesEmpty');
 const add=(parent,tag,value)=>{const el=document.createElement(tag);el.textContent=value;parent.append(el);return el;};
 async function load(){button.disabled=true;status.textContent='جارٍ تحميل اختيارات العملاء…';empty.hidden=true;
 try{const r=await fetch('/api/popular',{headers:await Sparkle.headers(),cache:'no-store',signal:AbortSignal.timeout(15000)}),data=await r.json();if(!r.ok||!Array.isArray(data.posts))throw Error(data.error||'تعذّر التحميل');grid.replaceChildren();
 for(const [i,p] of data.posts.entries()){const card=add(grid,'article','');card.className='card choice-card';const rank=add(card,'span','#'+(i+1));rank.className='choice-rank';const visual=add(card,p.link?'a':'div','');if(p.link){visual.href=p.link;visual.target='_blank';visual.rel='noopener noreferrer';}
 const media=add(visual,/\.mp4(?:$|\?)/i.test(p.image)?'video':'img','');media.src=p.image;media.alt=p.title;media.loading='lazy';media.referrerPolicy='no-referrer';if(media.tagName==='VIDEO'){media.controls=true;media.muted=true;media.playsInline=true;media.preload='metadata';}media.onerror=()=>{media.remove();const fallback=add(visual,'div','الصورة غير متاحة');fallback.className='image-placeholder';};const title=add(visual,'h3',p.title);title.dir='auto';
 const metrics=add(card,'p',Number(p.requests).toLocaleString('ar')+' طلب تسعير · '+Number(p.units).toLocaleString('ar')+' قطعة');metrics.className='choice-meta';
 const attr=add(card,'p',p.source==='cults'?'Cults · '+p.creator+' · '+p.license:'MakerOnline');attr.className='choice-meta';if(p.licenseUrl){const a=add(attr,'a',' — الترخيص');a.href=p.licenseUrl;a.target='_blank';a.rel='noopener noreferrer';}
 const buy=add(card,'a','اطلب هذا المجسّم');buy.className='buy';buy.href='/order.html?'+new URLSearchParams({title:p.title,id:p.id,source:p.source,path:p.modelPath||''});
 }empty.hidden=data.posts.length>0;status.textContent=data.posts.length?'الأكثر طلبًا أولًا — '+data.posts.length+' نموذجًا':'';
 }catch{status.textContent='تعذّر تحميل الاختيارات. اضغط تحديث للمحاولة مجددًا.';}finally{button.disabled=false;}}
 button.onclick=load;load();
})();
