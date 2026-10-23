const axios = require('axios');
const {cacheCatalogue}=require('../lib/catalogue-cache');
const {isAdmin}=require('../lib/access');
const {translatePosts}=require('../lib/translate');
const {getCults}=require('../lib/cults');
const BASE = 'https://www.makeronline.com';
async function getMaker({q,page,exclude}){
 const config={timeout:18000,headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}};
 const response=q ? await axios.post(BASE+'/api/search/model',{keyword:q,page,page_size:20,category_id:'',print_type:0,pure_search:0},config) : await axios.get(BASE+'/api/index/random-featured',{...config,params:{seed:Date.now(),exclude_ids:exclude}});
 const body=response.data;if(body.code!==0)throw Error('MakerOnline failure');
 const rows=q?body.data?.data:body.data;if(!Array.isArray(rows))throw Error('Invalid models');
 const posts=rows.filter(x=>!x.is_adult_nsfw).map(x=>{const id=String(x.mold_id||x.id||''),title=String(x.title||'');return {id,title,source:'makeronline',image:x.mold_image||x.cover||x.image||'',link:x.target_url||BASE+'/en/model/'+encodeURIComponent(title)+'/'+id+'.html'};}).filter(x=>/^\d{1,15}$/.test(x.id)&&x.title&&/^https:\/\//.test(x.image)&&/^https:\/\/www\.makeronline\.com\//.test(x.link));
 return {posts:await translatePosts(posts),hasMore:q?page<(body.data?.page?.last_page||page):false};
}
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const q=String(req.query?.q||'').trim().slice(0,120),page=Math.min(500,Math.max(1,parseInt(req.query?.page,10)||1));
 const source=['makeronline','cults'].includes(req.query?.source)?req.query.source:'all';
 const exclude=String(req.query?.exclude||'').split(',').filter(x=>/^\d+$/.test(x)).slice(0,100);
 const sources=source==='all'?['makeronline','cults']:[source];
 const [admin,results]=await Promise.all([isAdmin(req),Promise.allSettled(sources.map(s=>s==='cults'?getCults({q,page}):getMaker({q,page,exclude})))]);
 const warnings=[],batches=[];let hasMore=false;
 results.forEach((r,i)=>{if(r.status==='fulfilled'){batches.push(r.value.posts);hasMore ||= r.value.hasMore;}else{warnings.push(sources[i]==='cults'?'تعذّر تحميل Cults مؤقتًا.':'تعذّر تحميل MakerOnline مؤقتًا.');console.error('Catalogue',sources[i],'unavailable');}});
 if(!batches.length)return res.status(502).json({error:warnings.join(' ')});
 await cacheCatalogue(batches.flat());
 const posts=[];for(let i=0;i<Math.max(0,...batches.map(b=>b.length));i++)for(const b of batches)if(b[i]){const {link,...post}=b[i];posts.push(admin?{...post,link}:post);}
 return res.json({posts,page,hasMore,warnings});
};
