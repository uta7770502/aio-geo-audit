import {createHmac,timingSafeEqual} from 'node:crypto';
export function isAdmin(request){
 const key=process.env.MEASURE_ADMIN_SECRET;
 if(!key)return false;
 const day=new Date().toISOString().slice(0,10);
 const expected=day+'.'+createHmac('sha256',key).update(day).digest('hex');
 const actual=request.cookies.get('aio_admin')?.value||'';
 const a=Buffer.from(actual),b=Buffer.from(expected);
 return a.length===b.length&&timingSafeEqual(a,b);
}
