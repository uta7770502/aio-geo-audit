import {NextResponse} from 'next/server';
import {redis} from '../storage';
export const runtime='nodejs';
function authorized(request){
 const secret=process.env.MEASURE_ADMIN_SECRET;
 return Boolean(secret)&&request.headers.get('authorization')==='Bearer '+secret;
}
function key(host){return 'aio:client-history:'+host}
function hostname(site){const u=new URL(site);if(!['http:','https:'].includes(u.protocol))throw Error('Invalid URL');return u.hostname.toLowerCase()}
export async function GET(request){
 if(!authorized(request))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const site=new URL(request.url).searchParams.get('site');
  const host=hostname(site);
  const raw=await redis(['GET',key(host)]);
  return NextResponse.json({ok:true,record:raw?JSON.parse(raw):null});
 }catch(e){return NextResponse.json({error:'Could not read measurement history'},{status:400})}
}
export async function PUT(request){
 if(!authorized(request))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const body=await request.json();
  const host=hostname(body.url);
  const history=Array.isArray(body.history)?body.history.slice(-120):[];
  const record={url:body.url,companyName:String(body.companyName||'').slice(0,120),selected:(body.selected||[]).slice(0,10),aliases:(body.aliases||[]).slice(0,8),competitors:(body.competitors||[]).slice(0,10),period:String(body.period||'1'),history,updatedAt:new Date().toISOString()};
  if(JSON.stringify(record).length>500000)return NextResponse.json({error:'History exceeds storage limit'},{status:413});
  await redis(['SET',key(host),JSON.stringify(record)]);
  return NextResponse.json({ok:true,host,historyCount:history.length});
 }catch(e){return NextResponse.json({error:'Could not save measurement history'},{status:400})}
}
