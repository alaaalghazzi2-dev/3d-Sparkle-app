const {createClient}=require('@supabase/supabase-js');
function database(){return createClient(process.env.SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});}
const written=new Map();
async function cacheCatalogue(posts){
 if(!process.env.CATALOGUE_WRITE_KEY)return;
 const fresh=posts.filter(p=>(written.get(p.source+':'+p.id)||0)<Date.now()-600000);if(!fresh.length)return;
 try{const {error}=await database().rpc('cache_catalogue',{p_key:process.env.CATALOGUE_WRITE_KEY,p_posts:fresh}).abortSignal(AbortSignal.timeout(2500));if(error)throw error;
 for(const p of fresh)written.set(p.source+':'+p.id,Date.now());if(written.size>2000)written.clear();
 }catch{console.warn('Catalogue metadata cache unavailable');}
}
module.exports={cacheCatalogue,database};
