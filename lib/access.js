const {createClient}=require('@supabase/supabase-js');
async function isAdmin(req){
 const token=(req.headers.authorization||'').match(/^Bearer (.+)$/)?.[1];
 if(!token||!process.env.SUPABASE_URL||!process.env.SUPABASE_PUBLISHABLE_KEY)return false;
 try{
 const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.auth.getUser(token);if(error||!data.user)return false;
 const result=await db.rpc('is_admin');return !result.error&&result.data===true;
 }catch{return false;}
}
module.exports={isAdmin};
