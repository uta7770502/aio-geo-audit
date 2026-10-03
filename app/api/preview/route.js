import {NextResponse} from 'next/server';
export const maxDuration=30;
const clean=(html='')=>html.replace(/<script[\\s\\S]*?<\\/script>/gi,' ').replace(/<style[\\s\\S]*?<\\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').trim();
export async function POST(req){
 let url='';
 try{
  const body=await req.json(); url=body?.url||''; if(!url)return NextResponse.json({error:'URLがありません'},{status:400});
  const res=await fetch(url,{redirect:'follow',headers:{'user-agent':'Mozilla/5.0 Chrome/140 Safari/537.36','accept':'text/html,application/xhtml+xml','accept-language':'ja,en;q=0.8'},signal:AbortSignal.timeout(9000),cache:'no-store'});
  if(!res.ok)throw new Error('fetch failed');
  const html=await res.text();
  const tm=html.match(/<title[^>]*>([^<]*)<\\/title>/i); const hm=html.match(/<h1[^>]*>([\\s\\S]*?)<\\/h1>/i);
  const title=tm?.[1]?.trim()||''; const h1=hm?.[1]?.replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').trim()||'';
  return NextResponse.json({ok:true,url:res.url||url,title,h1,text:clean(html).slice(0,6000),source:'direct'});
 }catch{
  if(url){try{const res=await fetch('https://r.jina.ai/'+url,{headers:{accept:'text/plain'},signal:AbortSignal.timeout(9000),cache:'no-store'});if(res.ok){const text=await res.text();return NextResponse.json({ok:true,url,text:text.slice(0,6000),source:'reader'});}}catch{}}
  return NextResponse.json({ok:false,error:'現行ページを取得できませんでした。'});
 }
}
