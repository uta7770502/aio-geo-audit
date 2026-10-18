export function normalizeCompanyName(input=''){
 return String(input).normalize('NFKC').toLowerCase().replace(/(?:株式会社|有限会社|合同会社|一般社団法人|incorporated|corporation|company|limited|co\.,?\s*ltd\.?|inc\.?|ltd\.?)/gi,'').replace(/[\s\u3000・.,，。、\-‐‑–—_()（）「」『』【】]/g,'').trim();
}
export function companyAliases(company,aliases=[]){
 const raw=[company,...aliases].map(x=>String(x||'').trim()).filter(Boolean);
 const normalized=[...new Set(raw.map(normalizeCompanyName).filter(x=>x.length>=3))];
 return normalized;
}
export function assessCompanyMention(answer,company,aliases=[]){
 const text=normalizeCompanyName(answer);
 const names=companyAliases(company,aliases);
 if(!names.length)return {appeared:false,matchedAlias:null,confidence:'unverified'};
 const matched=names.find(name=>text.includes(name));
 return {appeared:!!matched,matchedAlias:matched||null,confidence:matched?'candidate':'unverified'};
}
export function assessSiteCitation(citations,site){
 try{
  const host=new URL(site).hostname.toLowerCase().replace(/^www\./,'');
  const urls=(citations||[]).filter(Boolean);
  const matched=urls.filter(u=>{try{const h=new URL(u).hostname.toLowerCase().replace(/^www\./,'');return h===host||h.endsWith('.'+host)}catch{return false}});
  return {cited:matched.length>0,matchedUrls:matched};
 }catch{return {cited:false,matchedUrls:[]}}
}
