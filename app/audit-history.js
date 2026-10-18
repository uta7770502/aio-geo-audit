export function toAuditRecord(data,date=new Date().toISOString()){
 return {date,url:data.url,score:Number(data.score)||0,pagesAnalyzed:Number(data.pagesAnalyzed)||0,categories:Object.fromEntries(Object.entries(data.categories||{}).map(([key,value])=>[key,{score:Number(value?.score)||0}]))};
}
export function appendAuditRecord(rows,record,max=24){
 const previous=Array.isArray(rows)?rows.filter(x=>x&&Number.isFinite(Number(x.score))&&x.date):[];
 return [...previous,record].slice(-max);
}
export function auditTrend(rows){
 return (Array.isArray(rows)?rows:[]).filter(x=>x&&Number.isFinite(Number(x.score))&&Number.isFinite(Date.parse(x.date))).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)).slice(-12);
}
