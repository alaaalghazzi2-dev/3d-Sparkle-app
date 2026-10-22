const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
test('Cults order saves source and model identity and prepares WhatsApp without sending',async()=>{
 let submit,payload,destination;
 const el=()=>({style:{},replaceChildren(){},append(){},after(){},setAttribute(){},scrollIntoView(){}});
 const form={addEventListener:(event,fn)=>{submit=fn;}};const nodes={orderForm:form,orderStatus:el(),send:el(),product:el()};
 const data={name:'Test buyer',address:'Test address',phone:'0998227776',quantity:'1',notes:''};
 const db={auth:{getSession:async()=>({data:{session:{user:{id:'customer'}}}})},from:()=>({insert:p=>{payload=p;return {select:()=>({single:async()=>({data:{id:'order-test'}})})};}})};
 const ctx={URLSearchParams,FormData:class{get(k){return data[k];}},document:{getElementById:id=>nodes[id],createElement:el},location:{search:'?title=Cat&id=Q3JlYXRpb24vNjQyODI&source=cults&path=%2Fen%2F3d-model%2Fgame%2Fcat'},Sparkle:{client:async()=>db},window:{location:{assign:href=>{destination=href;}}}};
 vm.runInNewContext(fs.readFileSync('public/order.js','utf8'),ctx);
 await submit({preventDefault(){}});
 assert.equal(payload.model_source,'cults');assert.equal(payload.model_path,'/en/3d-model/game/cat');assert.equal(payload.model_id,'Q3JlYXRpb24vNjQyODI');
 const u=new URL(destination);assert.equal(u.origin,'https://wa.me');assert.equal(u.pathname,'/963998227776');assert.match(u.searchParams.get('text'),/Cults/);assert.match(u.searchParams.get('text'),/order-test/);
});
