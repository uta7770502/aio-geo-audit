import {NextResponse} from 'next/server';
import {redis} from '../../hit-measure/storage';
export async function GET(request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const ids=await redis(['SMEMBERS','aio:jobs'])||[];
  const jobs=[];
  for(const id of ids.slice(0,50)){
   const raw=await redis(['GET','aio:job:'+id]);
   if(raw)jobs.push(JSON.parse(raw));
  }
  return NextResponse.json({ok:true,registered:jobs.length,pending:jobs.filter(x=>x.status==='active').length});
 }catch(e){return NextResponse.json({error:'Storage unavailable'},{status:503})}
}
