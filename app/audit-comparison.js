export function compareScores(previous,current){
 if(!previous||!current)return null;
 const keys=['entity','structure','schema','faq','trust','citation'];
 const items=keys.map(key=>{
  const before=Number(previous.categories?.[key]?.score)||0;
  const after=Number(current.categories?.[key]?.score)||0;
  return {key,before,after,delta:after-before};
 });
 return {scoreDelta:(Number(current.score)||0)-(Number(previous.score)||0),items};
}
