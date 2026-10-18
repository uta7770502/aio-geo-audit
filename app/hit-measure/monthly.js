function dateOf(row){
 const value=row?.date||row?.measuredAt;
 const date=new Date(value);
 return Number.isFinite(date.getTime())?date:null;
}
function average(items,key){
 const values=items.map(r=>Number(r[key])).filter(v=>Number.isFinite(v)&&v>=0&&v<=100);
 return values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*10)/10:null;
}
export function monthlySummary(rows=[]){
 const groups=new Map();
 for(const row of Array.isArray(rows)?rows:[]){
  const date=dateOf(row);
  if(!date)continue;
  const month=date.toISOString().slice(0,7);
  if(!groups.has(month))groups.set(month,[]);
  groups.get(month).push(row);
 }
 return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([month,items])=>({
  month,runs:items.length,
  appearance:average(items,'appearance'),recommended:average(items,'recommended'),cited:average(items,'cited'),
  questions:items.reduce((sum,r)=>sum+(Number(r.count)||0),0),
  lastMeasuredAt:items.map(dateOf).sort((a,b)=>b-a)[0]?.toISOString()||null
 }));
}
export function monthlyComparison(rows=[]){
 const months=monthlySummary(rows);
 const current=months.at(-1)||null,previous=months.at(-2)||null;
 const changes=['appearance','recommended','cited'].map(key=>({
  key,current:current?.[key]??null,previous:previous?.[key]??null,
  delta:current?.[key]!=null&&previous?.[key]!=null?Math.round((current[key]-previous[key])*10)/10:null
 }));
 return {months,current,previous,changes};
}
