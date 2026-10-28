// Conservative metadata filter; source safety flags alone allow anatomical figures.
const terms=/\b(nsfw|nudes?|nudity|naked|topless|erotic|sexy|sexual|porn\w*|anatom\w*|breasts?|boobs?|busts?|torso|buttocks?|genitals?|penis|vulva|vagina|human|humans|humanoid|woman|women|female|man|men|male|girl|girls|boy|boys|bikini|lingerie|swimsuit|bodybuilder|bodybuilding|pinup|pin-up|naked|nude|desnudo|desnuda|mujer|femme|homme|corps|nackt|frau|mann|donna|uomo)\b|عاري|عارية|عراة|عري|جسد|تشريح|امرأة|امراة|نساء|رجل|انسان|إنسان|بشري|فتاة|裸|人体|女体/iu;
function allowedModel(row){
 if(!row||row.safe===false||row.is_adult_nsfw)return false;
 const parts=[row.title,row.name,row.description,row.tags,row.categories,row.category,row.link,row.modelPath,row.target_url];
 const text=parts.filter(Boolean).map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ');
 let decoded=text;try{decoded=decodeURIComponent(text);}catch{}
 return !terms.test(decoded.normalize('NFKC').replace(/[_-]/g,' '));
}
module.exports={allowedModel};
