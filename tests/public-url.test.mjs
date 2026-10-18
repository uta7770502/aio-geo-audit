import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../app/api/public-url.js',import.meta.url),'utf8')
 .replace("import {lookup} from 'node:dns/promises';","const lookup=async host=>[{address:host==='unsafe.example'?'127.0.0.1':'93.184.215.14'}];");
const {isPrivateAddress,assertPublicUrl,safeFetch}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

for(const host of ['localhost','foo.localhost','router.local','metadata.google.internal','127.0.0.1','10.2.3.4','172.16.0.1','172.31.255.254','192.168.1.1','169.254.169.254','100.64.0.1','0.0.0.0','255.255.255.255','::1','fe80::1','fc00::1','fd12::1','::ffff:127.0.0.1'])assert.equal(isPrivateAddress(host),true,host);
for(const host of ['example.com','8.8.8.8','1.1.1.1','172.15.0.1','172.32.0.1','2001:4860:4860::8888'])assert.equal(isPrivateAddress(host),false,host);
await assert.rejects(()=>assertPublicUrl('https://unsafe.example'));
await assert.rejects(()=>assertPublicUrl('file:///etc/passwd'));
await assert.rejects(()=>assertPublicUrl('https://user:pass@example.com'));
const originalFetch=globalThis.fetch;
try{
 let calls=0;
 globalThis.fetch=async()=>{calls++;return {status:302,headers:new Headers({location:'http://127.0.0.1/private'})}};
 await assert.rejects(()=>safeFetch('https://example.com'));
 assert.equal(calls,1);
}finally{globalThis.fetch=originalFetch}
console.log('public URL security checks passed');
