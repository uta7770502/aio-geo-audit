import {reserveSearchBudget} from '../../hit-measure/budget';
import {NextResponse} from 'next/server';
import {redis} from '../../hit-measure/storage';
export const maxDuration=60;
export async function GET(request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const ids=await redis(['SMEMBERS','aio:jobs'])||[];
  const jobs=[];
  for(const id of ids.slice(0,50)){
   const raw=await redis(['GET','aio:job:'+id]);
   if(raw)jobs.push(JSON.parse(raw));
  }
  const active=jobs.filter(x=>x.status==='active'&&Date.now()<new Date(x.createdAt).getTime()+x.months*31*86400000);
  if(!active.length)return NextResponse.json({ok:true,registered:jobs.length,processed:0});
  const cursor=Number(await redis(['INCR','aio:cursor']))-1;
  const job=active[cursor%active.length];
  const question=job.questions[job.runs%job.questions.length];
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:'API key not configured'},{status:503});
  const budget=await reserveSearchBudget(request);
  if(!budget.allowed)return NextResponse.json({error:'Monthly or daily search budget reached'},{status:429});
  const result=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:'Bearer '+process.env.OPENAI_API_KEY,'content-type':'application/json'},body:JSON.stringify({model:'gpt-4.1',tools:[{type:'web_search_preview'}],input:question,max_output_tokens:600}),signal:AbortSignal.timeout(45000)});
  if(!result.ok)return NextResponse.json({error:'Provider unavailable'},{status:502});
  const response=await result.json();
  const blocks=(response.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]);
  const answer=blocks.filter(x=>x.type==='output_text').map(x=>x.text).join('\n');
  if(!answer)return NextResponse.json({error:'Empty response'},{status:502});
  const citations=blocks.flatMap(x=>x.annotations||[]).filter(x=>x.type==='url_citation').map(x=>x.url);
  const entry={question,answer,citations,measuredAt:new Date().toISOString(),provider:'OpenAI API'};
  await redis(['LPUSH','aio:history:'+job.id,JSON.stringify(entry)]);
  await redis(['LTRIM','aio:history:'+job.id,0,399]);
  job.runs+=1;
  await redis(['SET','aio:job:'+job.id,JSON.stringify(job)]);
  return NextResponse.json({ok:true,registered:jobs.length,processed:1});
 }catch(e){return NextResponse.json({error:'Storage unavailable'},{status:503})}
}
