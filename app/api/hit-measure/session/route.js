import {NextResponse} from 'next/server';
import {issueSession,safeEqual,tenants,validTenantId,tenantFromRequest} from '../tenant-auth';
export const runtime='nodejs';
export async function POST(request){
 try{
  const {tenantId,password}=await request.json();
  const id=String(tenantId||'').toLowerCase();
  const entry=tenants()[id];
  if(!validTenantId(id)||!entry||typeof entry.password!=='string'||entry.password.length<16||!safeEqual(password||'',entry.password))return NextResponse.json({error:'認証情報が正しくありません'},{status:401});
  const token=issueSession(id);
  const response=NextResponse.json({ok:true,tenantId:id});
  response.cookies.set('aio_tenant_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:43200});
  return response;
 }catch{return NextResponse.json({error:'ログインできませんでした'},{status:400})}
}
export async function GET(request){
 const tenantId=tenantFromRequest(request);
 return NextResponse.json({authenticated:!!tenantId,tenantId});
}
export async function DELETE(){
 const response=NextResponse.json({ok:true});
 response.cookies.set('aio_tenant_session','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
 return response;
}
