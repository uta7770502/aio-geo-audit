import {NextResponse} from 'next/server';
export const maxDuration=60;
async function sitemapUrls(start){
 const found=new Set();
 const fetchMap=async(url,depth=0)=>{
  if(depth>2)return;
  try{
   const res=await fetch(url,{headers:{'user-agent':'Mozilla/5.0','accept':'application/xml,text/xml,*/*'},signal:AbortSignal.timeout(3000),cache:'no-store'});
   if(!res.ok)return;
   const xml=await res.text();
   const locs=[...xml.matchAll(/<loc[^>]*>([\s\S]*?)<\/loc>/gi)].map(m=>m[1].replace(/&amp;/g,'&').trim());
   for(const loc of locs){
    try{
     const u=new URL(loc,start);
     if(u.origin!==start.origin)continue;
     if(/\.xml(?:$|\?)/i.test(u.pathname+u.search))await fetchMap(u.href,depth+1);
     else if(/^https?:$/.test(u.protocol))found.add(u.href.split('#')[0]);
    }catch{}
   }
  }catch{}
 };
 await Promise.all([fetchMap(new URL('/sitemap.xml',start).href),fetchMap(new URL('/sitemap_index.xml',start).href)]);
 return [...found];
}
function htmlLinks(html,base,start){const out=[];for(const m of String(html||'').matchAll(/<a\\b[^>]*href=["']([^"']+)["']/gi)){try{const u=new URL(m[1],base);u.hash='';if(u.origin!==start.origin||!/^https?:$/.test(u.protocol))continue;if(/\\.(?:jpg|jpeg|png|gif|webp|svg|pdf|zip|mp4|mp3|css|js|xml)(?:$|\\?)/i.test(u.pathname+u.search))continue;if(/\\/(?:login|signin|logout|cart|checkout|wp-admin)(?:\\/|$)/i.test(u.pathname))continue;for(const k of [...u.searchParams.keys()])if(/^utm_|^(?:fbclid|gclid)$/i.test(k))u.searchParams.delete(k);out.push(u.href)}catch{}}return out}
async function discoverLinks(start,seeds){const found=new Set(seeds);const sample=[start.href,...seeds.filter(x=>/company|about|service|business|product|works|case|faq/i.test(x)).slice(0,24),...seeds.slice(0,12)];await Promise.all([...new Set(sample)].slice(0,36).map(async url=>{try{const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 Chrome/140 Safari/537.36','accept':'text/html'},signal:AbortSignal.timeout(5000),cache:'no-store'});if(!r.ok)return;const type=r.headers.get('content-type')||'';if(!type.includes('text/html'))return;const h=await r.text();htmlLinks(h,r.url||url,start).forEach(x=>found.add(x))}catch{}}));return [...found]}
function normalizeInput(input){let s=String(input||'').trim();if(!/^https?:\/\//i.test(s))s='https://'+s;return s}
function blocked(h){return /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|::1)/i.test(h)}
export async function POST(req){try{const body=await req.json();const raw=normalizeInput(body?.url);let start;try{start=new URL(raw)}catch{return NextResponse.json({error:'URLの形式を確認してください'},{status:400})}if(!['http:','https:'].includes(start.protocol)||blocked(start.hostname))return NextResponse.json({error:'このURLは診断できません'},{status:400});const urls=await sitemapUrls(start);const expanded=await discoverLinks(start,urls);const all=[...new Set([start.href,...expanded])];return NextResponse.json({ok:true,url:start.href,total:all.length,urls:all,sitemapPages:urls.length,internallyDiscovered:Math.max(0,all.length-urls.length-1)});}catch(e){return NextResponse.json({error:e?.message||'ページ探索に失敗しました'},{status:500})}}
