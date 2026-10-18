import {NextResponse} from 'next/server';
import {redis} from '../storage';
import {tenantFromRequest,tenants} from '../tenant-auth';
export const runtime='nodejs';
function allowedSite(tenant,site){
 const url=new URL(String(site||''));
 if(!['https:','http:'].includes(url.protocol))throw Error('Invalid site');
 const hosts=tenants()[tenant]?.hosts;
 if(!Array.isArray(hosts)||!hosts.some(h=>String(h).toLowerCase()===url.hostname.toLowerCase()))throw Error('Site not assigned to tenant');
 return url.hostname.toLowerCase();
}
function recordKey(tenant,host){return 'aio:tenant:'+tenant+':history:'+host}
export async function GET(request){
 const tenant=tenantFromRequest(request);
 if(!tenant)return NextResponse.json({error:'ログインが必要です'},{status:401});
 try{
  const host=allowedSite(tenant,new URL(request.url).searchParams.get('site'));
  const raw=await redis(['GET',recordKey(tenant,host)]);
  return NextResponse.json({ok:true,record:raw?JSON.parse(raw):null});
 }catch{return NextResponse.json({error:'対象サイトを読み込めません'},{status:403})}
}
export async function PUT(request){
 const tenant=tenantFromRequest(request);
 if(!tenant)return NextResponse.json({error:'ログインが必要です'},{status:401});
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 try{
  const body=await request.json();
  const host=allowedSite(tenant,body.url);
  const history=Array.isArray(body.history)?body.history.slice(-120):[];
  const record={url:body.url,companyName:String(body.companyName||'').slice(0,120),selected:Array.isArray(body.selected)?body.selected.slice(0,10):[],aliases:Array.isArray(body.aliases)?body.aliases.slice(0,8):[],competitors:Array.isArray(body.competitors)?body.competitors.slice(0,10):[],period:String(body.period||'1'),history,updatedAt:new Date().toISOString()};
  if(JSON.stringify(record).length>500000)return NextResponse.json({error:'保存容量の上限を超えました'},{status:413});
  await redis(['SET',recordKey(tenant,host),JSON.stringify(record)]);
  return NextResponse.json({ok:true,historyCount:history.length});
 }catch{return NextResponse.json({error:'保存できませんでした'},{status:400})}
}
