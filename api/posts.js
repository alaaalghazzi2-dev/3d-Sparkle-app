const axios = require('axios');
const {isAdmin}=require('../lib/access');
const {translatePosts}=require('../lib/translate');
const BASE = 'https://www.makeronline.com';
module.exports = async (req,res) => {
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
 const q=String(req.query?.q||'').trim().slice(0,120);
 const page=Math.min(500,Math.max(1,parseInt(req.query?.page,10)||1));
 const exclude=String(req.query?.exclude||'').split(',').filter(x=>/^\d+$/.test(x)).slice(0,100);
 const config={timeout:20000,headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json'}};
 try {
  const response=q ? await axios.post(BASE+'/api/search/model',{keyword:q,page,page_size:20,category_id:'',print_type:0,pure_search:0},config) : await axios.get(BASE+'/api/index/random-featured',{...config,params:{seed:Date.now(),exclude_ids:exclude}});
  const body=response.data;
  if(body.code!==0) throw new Error('Upstream failure');
  const rows=q?body.data?.data:body.data;
  if(!Array.isArray(rows))throw new Error('Invalid upstream format');
  const posts=rows.filter(x=>!x.is_adult_nsfw).map(x=>{
   const id=String(x.mold_id||x.id||'');
   const title=String(x.title||'');
   const link=x.target_url||BASE+'/en/model/'+encodeURIComponent(title)+'/'+id+'.html';
   return {id,title,image:x.mold_image||x.cover||x.image||'',link};
  }).filter(x=>x.title&&/^https:\/\//.test(x.image)&&/^https:\/\/www\.makeronline\.com\//.test(x.link));
  if(rows.length&&!posts.length)throw new Error('Model format changed');
  const [admin,translatedPosts]=await Promise.all([isAdmin(req),translatePosts(posts)]);
  const visiblePosts=translatedPosts.map(({link,...post})=>admin?{...post,link}:post);
  return res.status(200).json({posts:visiblePosts,page,hasMore:q?page<(body.data?.page?.last_page||page):false});
 } catch(e){console.error('MakerOnline',e.code||e.message);return res.status(502).json({error:'تعذّر تحميل النماذج من المصدر. حاول مرة أخرى.'});}
};
