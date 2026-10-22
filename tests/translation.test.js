const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createTranslator}=require('../lib/translate');

test('translates non-English and ASCII titles, deduplicates, preserves model identity',async()=>{
 let calls=0;
 const translate=createTranslator({get:async(url,{params})=>{
  calls++; assert.equal(params.langpair,params.q==='格鲁特花盆'?'zh-CN|en':'autodetect|en');
  return {data:{responseStatus:200,responseData:{translatedText:params.q==='格鲁特花盆'?'Groot Flower Pot':'Cat house'}}};
 }});
 const posts=[{id:'123',title:'格鲁特花盆',link:'https://www.makeronline.com/model/original/123.html'}, {id:'124',title:'maison pour chat'}, {id:'125',title:'格鲁特花盆'}];
 const result=await translate(posts);
 assert.equal(result[0].title,'Groot Flower Pot');
 assert.equal(result[1].title,'Cat house');
 assert.equal(result[0].originalTitle,posts[0].title);
 assert.equal(result[0].link,posts[0].link);
 assert.equal(result[0].id,'123'); assert.equal(calls,2);
 await translate(posts); assert.equal(calls,2);
 assert.equal(posts[0].title,'格鲁特花盆');
});
test('outage preserves titles and retries after short failure cache',async()=>{
 let time=0,calls=0;
 const translate=createTranslator({get:async()=>{calls++;throw Error('rate limited');}},()=>time);
 const posts=[{id:'7',title:'花盆'}];
 assert.equal((await translate(posts))[0].title,'花盆');
 assert.equal((await translate(posts))[0].translationStatus,'unavailable');
 assert.equal(calls,1); time=31000;
 await translate(posts); assert.equal(calls,2);
});
test('malformed responses do not blank a title',async()=>{
 const translate=createTranslator({get:async()=>({data:'unavailable'})});
 assert.equal((await translate([{title:'vase'}]))[0].title,'vase');
});
test('quota messages never appear as model titles',async()=>{
 const translate=createTranslator({get:async()=>({data:{responseStatus:403,quotaFinished:true,responseData:{translatedText:'DAILY LIMIT REACHED'}}})});
 assert.equal((await translate([{title:'花盆'}]))[0].title,'花盆');
});
