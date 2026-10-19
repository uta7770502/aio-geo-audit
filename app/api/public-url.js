import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';

export function isPrivateAddress(value){
 const h=String(value||'').toLowerCase().replace(/^\[|\]$/g,'').replace(/\.$/,'');
 if(!h||h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h.endsWith('.internal'))return true;
 if(h.includes(':')){
  if(h==='::1'||h==='::'||h.startsWith('fe80:')||/^f[cd][0-9a-f]{2}:/.test(h))return true;
  if(h.startsWith('::ffff:'))return isPrivateAddress(h.slice(7));
  if(h.startsWith('2001:db8:')||h.startsWith('2001:0:')||h.startsWith('2002:'))return true;
  return isIP(h)!==6;
 }
 if(isIP(h)===4){
  const p=h.split('.').map(Number);
  return p[0]===0||p[0]===10||p[0]===127||p[0]>=224||p[0]===169&&p[1]===254||p[0]===172&&p[1]>=16&&p[1]<=31||p[0]===192&&p[1]===168||p[0]===100&&p[1]>=64&&p[1]<=127||p[0]===192&&p[1]===0||p[0]===198&&[18,19].includes(p[1])||p[0]===198&&p[1]===51&&p[2]===100||p[0]===203&&p[1]===0&&p[2]===113;
 }
 return false;
}
export async function assertPublicUrl(value){
 const u=new URL(value);
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port&& !['80','443'].includes(u.port)||isPrivateAddress(u.hostname))throw Error('Public HTTP(S) URL required');
 const addresses=await lookup(u.hostname,{all:true,verbatim:true});
 if(!addresses.length||addresses.some(x=>isPrivateAddress(x.address)))throw Error('Private address blocked');
 return u;
}
export async function safeFetch(url,options={}){
 let current=String(url);
 for(let i=0;i<4;i++){
  await assertPublicUrl(current);
  const response=await fetch(current,{...options,redirect:'manual'});
  if(![301,302,303,307,308].includes(response.status))return response;
  const location=response.headers.get('location');
  if(!location)throw Error('Redirect missing location');
  current=new URL(location,current).href;
 }
 throw Error('Too many redirects');
}
