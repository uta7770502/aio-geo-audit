export function normalizeCompanyName(input=''){
 return String(input).normalize('NFKC').toLowerCase()
  .replace(/(?:株式会社|有限会社|合同会社|一般社団法人|incorporated|corporation|company|limited|co\.,?\s*ltd\.?|inc\.?|ltd\.?)/gi,'')
  .replace(/[\s\u3000・.,，。、\-‐‑–—_()（）「」『』【】]/g,'').trim();
}
export function companyAliases(company,aliases=[]){
 const raw=[company,...(Array.isArray(aliases)?aliases:[])].map(x=>String(x||'').trim()).filter(Boolean);
 return [...new Set(raw.map(normalizeCompanyName).filter(x=>x.length>=3))];
}
function compact(text){
 return String(text||'').normalize('NFKC').toLowerCase().replace(/[\s\u3000・.,，。、\-‐‑–—_()（）「」『』【】]/g,'');
}
function escapeRegExp(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function mentionIn(text,name){
 // Keep word boundaries for Latin brand names: 'apple' must not match 'pineapple'.
 if(/^[a-z0-9]+$/.test(name)){
  const raw=String(text||'').normalize('NFKC').toLowerCase();
  const pattern=new RegExp('(^|[^a-z0-9])'+escapeRegExp(name.split('').join('[\\s\\-_.]*'))+'(?=$|[^a-z0-9])','i');
  return pattern.test(raw);
 }
 return compact(text).includes(name);
}
export function assessCompanyMention(answer,company,aliases=[]){
 const names=companyAliases(company,aliases);
 if(!names.length)return {appeared:false,matchedAlias:null,confidence:'unverified'};
 const matched=names.find(name=>mentionIn(answer,name));
 return {appeared:!!matched,matchedAlias:matched||null,confidence:matched?'candidate':'unverified'};
}
export function assessSiteCitation(citations,site){
 try{
  const target=new URL(site);
  if(!['https:','http:'].includes(target.protocol))throw Error('Invalid site');
  const host=target.hostname.toLowerCase().replace(/^www\./,'');
  const urls=[...new Set((Array.isArray(citations)?citations:[]).filter(u=>typeof u==='string'))];
  const matched=urls.filter(u=>{
   try{const url=new URL(u);if(!['https:','http:'].includes(url.protocol))return false;
    const h=url.hostname.toLowerCase().replace(/^www\./,'');
    return h===host||h.endsWith('.'+host);
   }catch{return false}
  });
  return {cited:matched.length>0,matchedUrls:matched};
 }catch{return {cited:false,matchedUrls:[]}}
}
