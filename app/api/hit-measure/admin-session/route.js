import {NextResponse} from 'next/server';
import {createHmac,timingSafeEqual} from 'node:crypto';
function token(){
 const key=process.env.MEASURE_ADMIN_SECRET;
 if(!key)return '';
 const day=new Date().toISOString().slice(0,10);
 return day+'.'+createHmac('sha256',key).update(day).digest('hex');
}
export async function POST(request){
 const origin=request.headers.get('origin');
 if(!origin||origin!==new URL(request.url).origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 const key=process.env.MEASURE_ADMIN_SECRET;
 const {password}=await request.json().catch(()=>({}));
 const a=Buffer.from(String(password||'')),b=Buffer.from(key||'');
 if(!key||a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:'ログインに失敗しました'},{status:401});
 const response=NextResponse.json({ok:true});
 response.cookies.set('aio_admin',token(),{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/api/hit-measure',maxAge:86400});
 return response;
}
export async function DELETE(){
 const response=NextResponse.json({ok:true});
 response.cookies.set('aio_admin','',{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/api/hit-measure',maxAge:0});
 return response;
}
