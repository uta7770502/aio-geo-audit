import {isAdmin} from '../admin-session/auth';
import {NextResponse} from 'next/server';
import {redis,cleanJob} from '../storage';
function writeAllowed(request){const key=process.env.MEASURE_ADMIN_SECRET;if(!key)return false;if(request.headers.get('authorization')==='Bearer '+key)return true;const origin=request.headers.get('origin');return Boolean(origin&&origin===new URL(request.url).origin&&isAdmin(request));}
export async function POST(request){
 const secret=process.env.MEASURE_ADMIN_SECRET;
 if(!writeAllowed(request))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const job=cleanJob(await request.json());
  const existing=await redis(['GET','aio:job:'+job.id]);
  if(existing)return NextResponse.json({error:'Job already exists. Pause or delete it before registering again.'},{status:409});
  await redis(['SET','aio:job:'+job.id,JSON.stringify(job)]);
  await redis(['SADD','aio:jobs',job.id]);
  return NextResponse.json({ok:true,id:job.id,scheduled:true,notice:'Daily cron processes at most one question per day. Configure storage and CRON_SECRET before use.'});
 }catch(e){return NextResponse.json({error:e.message},{status:400})}
}
export async function GET(request){
 const secret=process.env.MEASURE_ADMIN_SECRET;
 if(!secret||(request.headers.get('authorization')!=='Bearer '+secret&&!isAdmin(request)))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const ids=await redis(['SMEMBERS','aio:jobs'])||[];
  const jobs=[];
  for(const id of ids.slice(0,100)){const raw=await redis(['GET','aio:job:'+id]);if(raw){const job=JSON.parse(raw);const recent=await redis(['LRANGE','aio:history:'+id,0,9])||[];jobs.push({...job,recentRuns:recent.map(x=>{try{const e=JSON.parse(x);return {question:e.question,measuredAt:e.measuredAt,citationCount:(e.citations||[]).length}}catch{return null}}).filter(Boolean)})}}
  return NextResponse.json({jobs});
 }catch(e){return NextResponse.json({error:e.message},{status:503})}
}

export async function PATCH(request){
 const secret=process.env.MEASURE_ADMIN_SECRET;
 if(!writeAllowed(request))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const body=await request.json();
  const id=String(body.id||'').trim().toLowerCase();
  const status=body.status;
  if(!/^[a-z0-9.-]{3,253}$/.test(id)||!['active','paused'].includes(status))return NextResponse.json({error:'Invalid job or status'},{status:400});
  const raw=await redis(['GET','aio:job:'+id]);
  if(!raw)return NextResponse.json({error:'Job not found'},{status:404});
  const job=JSON.parse(raw);
  job.status=status;
  job.updatedAt=new Date().toISOString();
  await redis(['SET','aio:job:'+id,JSON.stringify(job)]);
  return NextResponse.json({ok:true,id,status});
 }catch{return NextResponse.json({error:'Could not update job'},{status:503})}
}
export async function DELETE(request){
 const secret=process.env.MEASURE_ADMIN_SECRET;
 if(!writeAllowed(request))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const id=String(new URL(request.url).searchParams.get('id')||'').trim().toLowerCase();
  if(!/^[a-z0-9.-]{3,253}$/.test(id))return NextResponse.json({error:'Invalid job'},{status:400});
  await redis(['SREM','aio:jobs',id]);
  await redis(['DEL','aio:job:'+id]);
  return NextResponse.json({ok:true,id,historyRetained:true});
 }catch{return NextResponse.json({error:'Could not delete job'},{status:503})}
}
