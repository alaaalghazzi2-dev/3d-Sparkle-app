const grid=document.getElementById('grid'),loader=document.getElementById('loader'),errorEl=document.getElementById('error'),refreshBtn=document.getElementById('refreshBtn'),more=document.getElementById('more'),statusEl=document.getElementById('status');
let query='',page=1,seen=[];let busy=false;
async function loadPosts(append=false,discover=false){
 if(busy)return;busy=true;loader.style.display='block';errorEl.textContent='';
 document.querySelectorAll('.toolbar button,#more').forEach(b=>b.disabled=true);
 try{
  const params=new URLSearchParams({q:query,page:String(page),t:String(Date.now())});
  if(discover)params.set('exclude',seen.slice(-100).join(','));
  const res=await fetch('/api/posts?'+params,{cache:'no-store',signal:AbortSignal.timeout(28000)});const data=await res.json();
  if(!res.ok)throw new Error(data.error||'تعذّر التحميل');
  if(!Array.isArray(data.posts))throw new Error('بيانات غير صالحة');
  if(!append)grid.replaceChildren();
  for(const post of data.posts){
   if(append&&grid.querySelector('[data-id="'+post.id+'"]'))continue;
   const card=document.createElement('article');card.className='card';card.dataset.id=post.id;
   const a=document.createElement('a');a.href=post.link;a.target='_blank';a.rel='noopener noreferrer';
   const img=document.createElement('img');img.src=post.image;img.alt=post.title;img.loading='lazy';img.referrerPolicy='no-referrer';
   img.onerror=()=>{img.onerror=null;img.alt='تعذّر تحميل الصورة';};
   const h=document.createElement('h3');h.textContent=post.title;h.dir='auto';a.append(img,h);
   const buy=document.createElement('a');buy.className='buy';buy.textContent='شراء / طلب عرض سعر';
   buy.href='/order.html?'+new URLSearchParams({title:post.title,link:post.link,image:post.image});card.append(a,buy);grid.append(card);seen.push(post.id);
  }
  more.hidden=!data.hasMore;
  statusEl.textContent=data.posts.length?(query?'نتائج البحث عن: '+query:'مجموعة نماذج مقترحة — اضغط «نماذج أخرى» لتغييرها'):'لا توجد نتائج. جرّب كلمة أخرى أو الاسم بالإنكليزية.';
 }catch(e){errorEl.textContent=e.name==='TimeoutError'?'انتهت مهلة الاتصال. حاول مجددًا.':e.message;if(append)page--;}
 finally{busy=false;loader.style.display='none';document.querySelectorAll('.toolbar button,#more').forEach(b=>b.disabled=false);}
}
document.getElementById('searchForm').onsubmit=e=>{e.preventDefault();if(busy)return;query=document.getElementById('search').value.trim();page=1;loadPosts();};
refreshBtn.onclick=()=>{if(busy)return;query='';page=1;document.getElementById('search').value='';loadPosts(false,true);};
more.onclick=()=>{if(!busy){page++;loadPosts(true);}};loadPosts();
