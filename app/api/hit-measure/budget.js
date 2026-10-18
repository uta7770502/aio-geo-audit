import {redis} from './storage';
const integer=(value,fallback,min,max)=>{const n=Number(value);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback};
export async function reserveSearchBudget(request){
 const now=new Date();
 const day=now.toISOString().slice(0,10);
 const month=day.slice(0,7);
 const dailyLimit=integer(process.env.AIO_SEARCH_DAILY_LIMIT,30,1,10000);
 const monthlyLimit=integer(process.env.AIO_SEARCH_MONTHLY_LIMIT,500,1,100000);
 const perClientLimit=integer(process.env.AIO_SEARCH_CLIENT_DAILY_LIMIT,5,1,1000);
 const ip=(request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown').trim().slice(0,100);
 const encoder=new TextEncoder();
 const digest=await crypto.subtle.digest('SHA-256',encoder.encode(ip));
 const client=Array.from(new Uint8Array(digest)).slice(0,12).map(x=>x.toString(16).padStart(2,'0')).join('');
 const counters=[['aio:limit:month:'+month,monthlyLimit,35*86400],['aio:limit:day:'+day,dailyLimit,3*86400],['aio:limit:client:'+day+':'+client,perClientLimit,3*86400]];
 // Reserve before the paid API call. Failed searches still count against the budget.
 // Conservative fail-closed policy if Redis is unavailable.
 for(const [key,limit,ttl] of counters){
  const count=Number(await redis(['INCR',key]));
  if(count===1)await redis(['EXPIRE',key,ttl]);
  if(count>limit)return {allowed:false,reason:key.includes('client')?'client':'budget',retryAfter:86400};
 }
 return {allowed:true};
}
