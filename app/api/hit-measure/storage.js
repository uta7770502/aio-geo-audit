// Persistent measurement storage via Upstash Redis REST.
// Required: KV_REST_API_URL and KV_REST_API_TOKEN (server-side only).
export async function redis(command){
 const url=process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL;
 const token=process.env.KV_REST_API_TOKEN||process.env.UPSTASH_REDIS_REST_TOKEN;
 if(!url||!token)throw new Error('Redis storage is not configured');
 const res=await fetch(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(command),cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!res.ok)throw new Error('Storage unavailable');
 const json=await res.json();
 if(json.error)throw new Error('Storage operation failed');
 return json.result;
}
export function cleanJob(input){
 const site=new URL(String(input.site||''));
 if(!['https:','http:'].includes(site.protocol))throw new Error('Invalid website URL');
 const company=String(input.company||'').trim().slice(0,100);
 const questions=[...new Set((input.questions||[]).map(x=>String(x).trim().slice(0,300)).filter(Boolean))].slice(0,10);
 const months=Number(input.months);
 if(!company||questions.length<5||![1,2,3].includes(months))throw new Error('Company, 5-10 questions and 1-3 months required');
 return {id:site.hostname.toLowerCase(),site:site.origin,company,questions,months,aliases:(input.aliases||[]).slice(0,8).map(String),competitors:(input.competitors||[]).slice(0,10).map(String),createdAt:new Date().toISOString(),nextRun:new Date().toISOString(),runs:0,status:'active'};
}
