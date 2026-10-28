const {allowedModel}=require('./content-filter');
const cache=new Map();
const fields=`identifier name(locale: EN) url(locale: EN) illustrationImageUrl safe price { cents } creator { nick } license { code name(locale: EN) url(locale: EN) allowsCommercialUse }`;
function normalize(row){
 if(!allowedModel(row)||row.safe!==true||row.license?.allowsCommercialUse!==true||(row.price!==null&&row.price?.cents!==0))return null;
 const id=String(row.identifier||'');
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(id)||!row.name||!row.illustrationImageUrl)return null;
 try{
 const url=new URL(row.url),image=new URL(row.illustrationImageUrl);
 if(url.protocol!=='https:'||url.hostname!=='cults3d.com'||!url.pathname.startsWith('/en/3d-model/')||image.protocol!=='https:')return null;
 let licenseUrl='';try{const u=new URL(row.license.url);if(u.protocol==='https:'&&['creativecommons.org','cults3d.com'].includes(u.hostname))licenseUrl=u.href;}catch{}
 return {id,source:'cults',title:String(row.name).slice(0,500),image:image.href,link:url.href,modelPath:url.pathname,creator:String(row.creator?.nick||''),license:String(row.license.name||row.license.code),licenseUrl};
 }catch{return null;}
}
async function getCults({q='',page=1}){
 if(!process.env.CULTS_USERNAME||!process.env.CULTS_API_KEY)throw Error('Cults not configured');
 const key=JSON.stringify([q,page]);const hit=cache.get(key);if(hit&&hit.expires>Date.now())return hit.value;
 const args=q?'query: $q, onlySafe: true, onlyFree: true, onlyCommercial: true, sort: BY_RELEVANCE':'safe: true, onlyFree: true, onlyCommercial: true, sort: BY_PUBLICATION';
 const query=`query Models($offset:Int!${q?', $q:String!':''}) { batch: ${q?'creationsSearchBatch':'creationsBatch'}(${args}, limit:20, offset:$offset) { total results { ${fields} } } }`;
 const response=await fetch('https://cults3d.com/graphql',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Basic '+Buffer.from(process.env.CULTS_USERNAME.trim()+':'+process.env.CULTS_API_KEY.trim()).toString('base64')},body:JSON.stringify({query,variables:{offset:(page-1)*20,...(q?{q}:{})}}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Cults HTTP '+response.status);
 const body=await response.json();if(body.errors||!Array.isArray(body.data?.batch?.results))throw Error('Cults query failed');
 const value={posts:body.data.batch.results.map(normalize).filter(Boolean),hasMore:page*20<body.data.batch.total};
 if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,{value,expires:Date.now()+60000});return value;
}
module.exports={getCults,normalize};
