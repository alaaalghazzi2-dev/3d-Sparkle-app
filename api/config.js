module.exports = (req,res) => {
 res.setHeader('Cache-Control','no-store');
 const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return res.status(503).json({error:'الحسابات قيد التجهيز. يمكنك التصفح والطلب عبر واتساب حاليًا.'});
 // Only a publishable / legacy anon key may be configured here. Never a secret/service-role key.
 if(key.startsWith('sb_secret_'))return res.status(503).json({error:'إعداد الحسابات غير مكتمل.'});
 try{if(key.split('.').length===3&&JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role!=='anon')throw Error();}
 catch{return res.status(503).json({error:'إعداد الحسابات غير مكتمل.'});}
 res.json({url,key});
};
