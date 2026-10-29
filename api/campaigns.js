const {database}=require('../lib/catalogue-cache');const {allowedModel}=require('../lib/content-filter');
module.exports=async(req,res)=>{res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
try{const db=database();const slug=String(req.query?.slug||'');const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Damascus',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let q=db.from('campaigns').select('id,slug,title,description,keywords,starts_on,ends_on,discount,published,paused,color').eq('published',true).order('starts_on',{ascending:false}).limit(100);if(slug)q=q.eq('slug',slug);const {data,error}=await q;if(error)throw error;
const campaigns=data.map(c=>({...c,state:c.paused?'paused':today<c.starts_on?'scheduled':today>c.ends_on?'ended':'active'}));
const selected=slug?campaigns[0]:campaigns.find(c=>c.state==='active');let posts=[];
if(selected){const poster=await db.from('campaigns').select('poster').eq('id',selected.id).single();if(poster.error)throw poster.error;selected.poster=poster.data.poster;const r=await db.from('campaign_items').select('*').eq('campaign_id',selected.id).eq('approved',true).order('title').limit(100);if(r.error)throw r.error;posts=r.data.map(p=>({id:p.model_id,source:p.source,title:p.title,image:p.image,modelPath:p.model_path,creator:p.creator,license:p.license,licenseUrl:p.license_url})).filter(allowedModel);}
res.json({campaign:selected||null,posts,archive:campaigns.filter(c=>c.state==='ended').map(({poster,...c})=>c)});
}catch{res.status(503).json({error:'تعذّر تحميل الحملات. حاول مجددًا.'});}};
