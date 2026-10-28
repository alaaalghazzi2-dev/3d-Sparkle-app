const {allowedModel}=require('../lib/content-filter');
const {database}=require('../lib/catalogue-cache');const {isAdmin}=require('../lib/access');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 try{const [{data,error},admin]=await Promise.all([database().rpc('customer_choices').abortSignal(AbortSignal.timeout(8000)),isAdmin(req)]);if(error)throw error;
 const posts=data.filter(allowedModel).map(p=>{if(!admin)return p;return {...p,link:p.source==='cults'?'https://cults3d.com'+p.modelPath:'https://www.makeronline.com/en/model/'+encodeURIComponent(p.title)+'/'+p.id+'.html'};});res.json({posts});
 }catch{res.status(503).json({error:'تعذّر تحميل اختيارات العملاء. حاول مجددًا.'});}
};
