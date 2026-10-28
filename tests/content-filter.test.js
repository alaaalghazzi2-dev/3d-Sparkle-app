const {test}=require('node:test');const assert=require('node:assert/strict');const {allowedModel}=require('../lib/content-filter');
test('excludes anatomical and human figures across titles, metadata and paths',()=>{
 for(const row of [{title:'Female torso sculpture'},{title:'Human anatomy'},{title:'Woman figurine'},{title:'تمثال جسد بشري'},{title:'Sculpture',link:'https://example.com/nude-model'},{title:'Art',tags:['bikini']},{title:'Vase',safe:false}])assert.equal(allowedModel(row),false);
 for(const title of ['Flower vase','Phone stand','Turtle toy','Snowman decoration','Manifold adapter','Management organizer'])assert.equal(allowedModel({title}),true);
});
