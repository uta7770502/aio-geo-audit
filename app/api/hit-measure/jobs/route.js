import {NextResponse} from 'next/server';
import {redis,cleanJob} from '../storage';
export async function POST(request){
 const secret=process.env.MEASURE_ADMIN_SECRET;
 if(!secret||request.headers.get('authorization')!=='Bearer '+secret)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const job=cleanJob(await request.json());
  await redis(['SET','aio:job:'+job.id,JSON.stringify(job)]);
  await redis(['SADD','aio:jobs',job.id]);
  return NextResponse.json({ok:true,id:job.id,scheduled:true,notice:'Daily cron processes at most one question per day. Configure storage and CRON_SECRET before use.'});
 }catch(e){return NextResponse.json({error:e.message},{status:400})}
}
export async function GET(request){
 const secret=process.env.MEASURE_ADMIN_SECRET;
 if(!secret||request.headers.get('authorization')!=='Bearer '+secret)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const ids=await redis(['SMEMBERS','aio:jobs'])||[];
  const jobs=[];
  for(const id of ids.slice(0,100)){const raw=await redis(['GET','aio:job:'+id]);if(raw)jobs.push(JSON.parse(raw))}
  return NextResponse.json({jobs});
 }catch(e){return NextResponse.json({error:e.message},{status:503})}
}
