const grid=document.getElementById('grid'),loader=document.getElementById('loader'),errorEl=document.getElementById('error'),refreshBtn=document.getElementById('refreshBtn'),more=document.getElementById('more'),statusEl=document.getElementById('status');
let query='',page=1,seen=[],discoveryPage=1;let busy=false;
const sourceEl=document.getElementById('source');
async function loadPosts(append=false,discover=false){
 if(busy)return;busy=true;loader.style.display='block';errorEl.textContent='';
 document.querySelectorAll('.toolbar button,.toolbar select,#more').forEach(b=>b.disabled=true);
 try{
  const params=new URLSearchParams({q:query,page:String(page),source:sourceEl.value,t:String(Date.now())});
  if(discover)params.set('exclude',seen.slice(-100).join(','));
  const res=await fetch('/api/posts?'+params,{headers:await Sparkle.headers(),cache:'no-store',signal:AbortSignal.timeout(28000)});const data=await res.json();
  if(!res.ok)throw new Error(data.error||'تعذّر التحميل');
  if(!Array.isArray(data.posts))throw new Error('بيانات غير صالحة');
  if(!append)grid.replaceChildren();
  for(const post of data.posts){
   const key=post.source+':'+post.id;if(append&&Array.from(grid.children).some(c=>c.dataset.id===key))continue;
   const card=document.createElement('article');card.className='card';card.dataset.id=key;
   const a=document.createElement(post.link?'a':'div');if(post.link){a.href=post.link;a.target='_blank';a.rel='noopener noreferrer';}
   const video=/\.mp4(?:$|\?)/i.test(post.image);
   const img=document.createElement(video?'video':'img');img.src=post.image;img.alt=post.title;img.loading='lazy';img.referrerPolicy='no-referrer';
   if(video){img.controls=true;img.muted=true;img.playsInline=true;img.preload='metadata';img.setAttribute('aria-label',post.title);}
   img.onerror=()=>{img.onerror=null;img.alt='تعذّر تحميل الصورة';};
   const h=document.createElement('h3');h.textContent=post.title;h.dir='auto';a.append(img,h);
   const attribution=document.createElement('p');attribution.style.cssText='padding:0 14px;font-size:13px';attribution.textContent=post.source==='cults'?'Cults · '+post.creator+' · '+post.license:'MakerOnline';
   if(post.licenseUrl){const license=document.createElement('a');license.href=post.licenseUrl;license.target='_blank';license.rel='noopener noreferrer';license.textContent=' شروط الترخيص';attribution.append(license);}
   const buy=document.createElement('a');buy.className='buy';buy.textContent='شراء / طلب عرض سعر';
   buy.href='/order.html?'+new URLSearchParams({title:post.title,id:post.id,source:post.source||'makeronline',path:post.modelPath||'',image:post.image||''});card.append(a,attribution,buy);grid.append(card);if(post.source==='makeronline')seen.push(post.id);
  }
  more.hidden=!data.hasMore;errorEl.textContent=(data.warnings||[]).join(' ');
  statusEl.textContent=data.posts.length?(query?'نتائج البحث عن: '+query:'مجموعة نماذج مقترحة — اضغط «نماذج أخرى» لتغييرها'):'لا توجد نتائج. جرّب كلمة أخرى أو الاسم بالإنكليزية.';
 }catch(e){errorEl.textContent=e.name==='TimeoutError'?'انتهت مهلة الاتصال. حاول مجددًا.':e.message;if(append)page--;}
 finally{busy=false;loader.style.display='none';document.querySelectorAll('.toolbar button,.toolbar select,#more').forEach(b=>b.disabled=false);}
}
document.getElementById('searchForm').onsubmit=e=>{e.preventDefault();if(busy)return;query=document.getElementById('search').value.trim();page=1;loadPosts();};
refreshBtn.onclick=()=>{if(busy)return;query='';page=++discoveryPage;document.getElementById('search').value='';loadPosts(false,true);};
more.onclick=()=>{if(!busy){page++;loadPosts(true);}};loadPosts();

sourceEl.onchange=()=>{if(busy)return;page=1;discoveryPage=1;loadPosts();};
