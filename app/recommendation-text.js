export function splitRecommendation(text=''){
 const input=String(text),parts=[];
 const pattern=/https?:\/\/[^\s<>"'。、「」]+/g;
 let cursor=0;
 for(const match of input.matchAll(pattern)){
  const value=match[0].replace(/[.,;!?\)\]}]+$/g,'');
  let url;
  try{const parsed=new URL(value);if(!['http:','https:'].includes(parsed.protocol)||parsed.username||parsed.password)continue;url=parsed.href;}catch{continue;}
  if(match.index>cursor)parts.push({text:input.slice(cursor,match.index)});
  parts.push({text:value,url});cursor=match.index+value.length;
 }
 if(cursor<input.length)parts.push({text:input.slice(cursor)});
 return parts.length?parts:[{text:input}];
}
