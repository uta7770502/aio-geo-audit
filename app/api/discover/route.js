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
function normalizeInput(input){let s=String(input||'').trim();if(!/^https?:\/\//i.test(s))s='https://'+s;return s}
function blocked(h){return /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|::1)/i.test(h)}
export async function POST(req){try{const body=await req.json();const raw=normalizeInput(body?.url);let start;try{start=new URL(raw)}catch{return NextResponse.json({error:'URLの形式を確認してください'},{status:400})}if(!['http:','https:'].includes(start.protocol)||blocked(start.hostname))return NextResponse.json({error:'このURLは診断できません'},{status:400});const urls=await sitemapUrls(start);const all=[start.href,...urls.filter(x=>x!==start.href)];return NextResponse.json({ok:true,url:start.href,total:all.length,urls:all});}catch(e){return NextResponse.json({error:e?.message||'ページ探索に失敗しました'},{status:500})}}
