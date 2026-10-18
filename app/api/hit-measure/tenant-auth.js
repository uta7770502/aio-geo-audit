import {createHmac,timingSafeEqual} from 'node:crypto';
const secret=()=>process.env.MEASURE_SESSION_SECRET||'';
export function safeEqual(a,b){const x=Buffer.from(String(a));const y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y)}
export function tenants(){
 try{const v=JSON.parse(process.env.MEASURE_TENANTS_JSON||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return {}}
}
export function validTenantId(id){return /^[a-z0-9][a-z0-9_-]{2,39}$/.test(id)}
function signature(payload){return createHmac('sha256',secret()).update(payload).digest('base64url')}
export function issueSession(id){
 if(!secret()||!validTenantId(id))throw Error('Session not configured');
 const payload=Buffer.from(JSON.stringify({id,exp:Date.now()+12*3600000})).toString('base64url');
 return payload+'.'+signature(payload);
}
export function tenantFromRequest(request){
 if(!secret())return null;
 const cookie=request.cookies.get('aio_tenant_session')?.value||'';
 const [payload,sig,...extra]=cookie.split('.');
 if(extra.length||!payload||!sig||!safeEqual(signature(payload),sig))return null;
 try{
  const obj=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));
  if(!validTenantId(obj.id)||!Number.isFinite(obj.exp)||obj.exp<Date.now())return null;
  if(!Object.prototype.hasOwnProperty.call(tenants(),obj.id))return null;
  return obj.id;
 }catch{return null}
}
