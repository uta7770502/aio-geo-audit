import {NextResponse} from 'next/server';
export const maxDuration=30;
const clean=(html='')=>html.replace(/<script[\\s\\S]*?<\\/script>/gi,' ').replace(/<style[\\s\\S]*?<\\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&amp;|&#39;|&quot;/g,' ').replace(/\\s+/g,' ').trim();
export async function POST(req){
 try{
  const {url}=await req.json(); if(!url)return NextResponse.json({error:'URLがありません'},{status:400});
  const res=await fetch(url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36','accept':'text/html,application/xhtml+xml','accept-language':'ja,en;q=0.8'},signal:AbortSignal.timeout(9000),cache:'no-store'});
  if(!res.ok)throw new Error('HTTP '+res.status); const html=await res.text();
  const title=(html.match(/<title[^>]*>([^<]*)<\\/title>/i)||[])[1]?.trim()||'';
  const h1=(html.match(/<h1[^>]*>([\\s\\S]*?)<\\/h1>/i)||[])[1]?.replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').trim()||'';
  const colors=[...html.matchAll(/#[0-9a-fA-F]{6}\\b/g)].map(x=>x[0].toLowerCase()).filter(x=>!['#ffffff','#000000','#f5f5f5','#fafafa'].includes(x));
  return NextResponse.json({ok:true,url:res.url||url,title,h1,text:clean(html).slice(0,6000),accent:colors[0]||'',source:'direct'});
 }catch(e){
  try{const {url}=await req.clone().json(); const rr=await fetch('https://r.jina.ai/'+url,{headers:{'accept':'text/plain'},signal:AbortSignal.timeout(9000),cache:'no-store'}); if(rr.ok){const text=await rr.text();return NextResponse.json({ok:true,url,text:text.slice(0,6000),source:'reader'});}}catch{}
  return NextResponse.json({ok:false,error:'現行ページを取得できませんでした。'},{status:200});
 }
}
