const {test}=require('node:test');const assert=require('node:assert/strict');
const {normalize}=require('../lib/cults');
const model={identifier:'abc-123',name:'Flowerpot',url:'https://cults3d.com/en/3d-model/home/pot',illustrationImageUrl:'https://images.cults3d.com/pot.jpg',safe:true,price:null,creator:{nick:'designer'},license:{code:'cc0',name:'CC0',allowsCommercialUse:true,url:'https://creativecommons.org/publicdomain/zero/1.0/'}};
test('only free safe commercially licensed models enter catalogue',()=>{
 assert.equal(normalize(model).source,'cults');
 assert.equal(normalize({...model,price:{cents:99}}),null);
 assert.equal(normalize({...model,safe:false}),null);
 assert.equal(normalize({...model,license:{allowsCommercialUse:false}}),null);
 assert.equal(normalize({...model,url:'https://evil.example/en/3d-model/a'}),null);
 assert.equal(normalize({...model,illustrationImageUrl:'javascript:alert(1)'}),null);
 assert.equal(normalize({...model,price:{cents:0}}).creator,'designer');
});
