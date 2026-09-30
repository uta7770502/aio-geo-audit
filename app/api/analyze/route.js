import {NextResponse} from 'next/server';

function cleanText(html=''){return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&amp;|&quot;|&#39;/g,' ').replace(/\s+/g,' ').trim()}
function count(re,s){return (s.match(re)||[]).length}
function normalizeInput(raw){
 let v=String(raw??'').normalize('NFKC');
 v=v.replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').trim();
 v=v.replace(/[\r\n\t]/g,'').replace(/\s+/g,'');
 if(!/^https?:\/\//i.test(v))v='https://'+v;
 return v;
}
function isBlockedHost(hostname){
 const h=hostname.toLowerCase();
 return h==='localhost'||h.endsWith('.localhost')||h==='0.0.0.0'||h==='127.0.0.1'||h==='::1'||
 /^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h)||
 /^172\.(1[6-9]|2\d|3[01])\./.test(h);
}
function scorePage(html,text,fallback=false){
 const title=/<title[^>]*>(.*?)<\/title>/is.test(html)||/^Title:/mi.test(text);
 const meta=/name=["']description["'][^>]*content=["'][^"']{50,}["']/i.test(html)||/content=["'][^"']{50,}["'][^>]*name=["']description["']/i.test(html);
 const h1=count(/<h1\b/gi,html)+(fallback?count(/^#\s+/gm,text):0);
 const h2=count(/<h2\b/gi,html)+(fallback?count(/^##\s+/gm,text):0);
 const jsonld=count(/application\/ld\+json/gi,html);
 const faq=/FAQPage|よくある質問|FAQ|Q&A/i.test(html+text);
 const org=/Organization|LocalBusiness|Corporation|会社概要|企業情報|事業内容|株式会社|会社名/i.test(html+text);
 const trust=/代表者|所在地|住所|電話|お問い合わせ|運営会社|監修|著者|更新日|プライバシー|設立|資本金/i.test(text);
 const answer=/とは|について|方法|理由|メリット|デメリット|料金|価格|サービス|特徴|実績|事業/i.test(text);
 return {
  entity:Math.min(100,(org?60:25)+(title?20:0)+(meta?20:0)),
  structure:Math.min(100,(title?20:0)+(meta?20:0)+(h1===1?25:h1>0?15:0)+Math.min(35,h2*7)),
  schema:fallback?Math.min(45,(org?25:0)+(faq?20:0)):Math.min(100,jsonld*30+(org?25:0)+(faq?25:0)),
  faq:Math.min(100,(faq?55:10)+(answer?30:0)+(h2>=3?15:0)),
  trust:Math.min(100,(trust?60:20)+(org?20:0)+(text.length>1200?20:10)),
  citation:Math.min(100,(meta?20:0)+(answer?30:0)+(h2>=3?20:0)+(text.length>1500?30:text.length>700?15:5))
 }
}
function avg(xs,k){return Math.round(xs.reduce((a,x)=>a+x[k],0)/xs.length)}
function internalLinks(html,base){
 const out=[]; let baseUrl;
 try{baseUrl=new URL(base)}catch{return out}
 for(const m of html.matchAll(/href=["']([^"'#]+)["']/gi)){
  try{
   const href=String(m[1]||'').trim();
   if(!href||/^(javascript:|mailto:|tel:|data:)/i.test(href))continue;
   const u=new URL(href,baseUrl);
   if(/^https?:$/.test(u.protocol)&&u.origin===baseUrl.origin)out.push(u.href);
  }catch{}
 }
 return [...new Set(out)];
}

async function firecrawlFallback(target){
 try{
  const res=await fetch('https://api.firecrawl.dev/v2/scrape',{
   method:'POST',
   headers:{'content-type':'application/json','accept':'application/json'},
   body:JSON.stringify({
    url:target,
    formats:['markdown'],
    onlyMainContent:false,
    proxy:'auto'
   }),
   signal:AbortSignal.timeout(30000),
   cache:'no-store'
  });
  if(!res.ok)return null;
  const json=await res.json();
  const text=json?.data?.markdown || json?.markdown || '';
  if(typeof text!=='string'||text.trim().length<100)return null;
  return {text,source:'firecrawl'};
 }catch{return null}
}

async function directFetch(target){
 try{
  const res=await fetch(target,{
   redirect:'follow',
   headers:{
    'user-agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    'accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language':'ja,en-US;q=0.9,en;q=0.8'
   },
   signal:AbortSignal.timeout(12000),
   cache:'no-store'
  });
  const ct=res.headers.get('content-type')||'';
  if(!res.ok||!ct.includes('text/html'))return null;
  return {html:await res.text(),source:'direct'};
 }catch{return null}
}
async function allOriginsFallback(target){
 try{
  const proxy='https://api.allorigins.win/raw?url='+encodeURIComponent(target);
  const res=await fetch(proxy,{headers:{'accept':'text/html,*/*','user-agent':'Mozilla/5.0'},signal:AbortSignal.timeout(18000),cache:'no-store'});
  if(!res.ok)return null;
  const html=await res.text();
  if(html.trim().length<100)return null;
  return {html,source:'allorigins'};
 }catch{return null}
}

async function microlinkFallback(target){
 try{
  const api='https://api.microlink.io/?url='+encodeURIComponent(target)+'&data.content.attr=markdown&meta=false';
  const res=await fetch(api,{
   headers:{'accept':'application/json','user-agent':'Mozilla/5.0'},
   signal:AbortSignal.timeout(20000),
   cache:'no-store'
  });
  if(!res.ok)return null;
  const json=await res.json();
  const text=json?.data?.content;
  if(typeof text!=='string'||text.trim().length<100)return null;
  return {text,source:'microlink'};
 }catch{return null}
}

async function readerFallback(target){
 try{
  const parsed=new URL(target);
  const reader='https://r.jina.ai/http://r.jina.ai/http://invalid.local';
  const realReader='https://r.jina.ai/'+parsed.href;
  const res=await fetch(realReader,{headers:{'accept':'text/plain','user-agent':'Mozilla/5.0'},signal:AbortSignal.timeout(18000),cache:'no-store'});
  if(!res.ok)return null;
  const text=await res.text();
  if(text.trim().length<100)return null;
  return {text,source:'jina'};
 }catch{return null}
}
async function fetchPage(target){
 const fc=await firecrawlFallback(target);
 if(fc){
  const text=fc.text.slice(0,30000);
  return {url:target,html:'',text,fallback:true,source:fc.source,score:scorePage('',text,true)};
 }
 const direct=await directFetch(target);
 if(direct){
  const text=cleanText(direct.html).slice(0,30000);
  return {url:target,html:direct.html,text,fallback:false,source:direct.source,score:scorePage(direct.html,text,false)};
 }
 const proxied=await allOriginsFallback(target);
 if(proxied){
  const text=cleanText(proxied.html).slice(0,30000);
  return {url:target,html:proxied.html,text,fallback:true,source:proxied.source,score:scorePage(proxied.html,text,true)};
 }
 const micro=await microlinkFallback(target);
 if(micro){
  const text=micro.text.slice(0,30000);
  return {url:target,html:'',text,fallback:true,source:micro.source,score:scorePage('',text,true)};
 }
 const fb=await readerFallback(target);
 if(fb){
  const text=fb.text.slice(0,30000);
  return {url:target,html:'',text,fallback:true,source:fb.source,score:scorePage('',text,true)};
 }
 return null;
}

export async function POST(req){
 let stage='request';
 try{
  const body=await req.json();
  const normalized=normalizeInput(body?.url);
  if(!normalized||normalized==='https://')return NextResponse.json({error:'URLを入力してください'},{status:400});
  stage='url-parse';
  let start;
  try{start=new URL(normalized)}catch{
   return NextResponse.json({error:'URLの形式を認識できませんでした。https://example.com の形式で入力してください。'},{status:400});
  }
  if(!['http:','https:'].includes(start.protocol))return NextResponse.json({error:'http または https のURLを入力してください。'},{status:400});
  if(isBlockedHost(start.hostname))return NextResponse.json({error:'このホストは診断対象にできません。'},{status:400});

  stage='crawl';
  const queue=[start.href]; const seen=new Set(); const docs=[];
  while(queue.length&&docs.length<5){
   const target=queue.shift();
   if(!target||seen.has(target))continue;
   seen.add(target);
   const page=await fetchPage(target);
   if(!page)continue;
   docs.push(page);
   if(page.html){
    for(const l of internalLinks(page.html,target)){if(queue.length<20&&!seen.has(l))queue.push(l)}
   }
  }
  if(!docs.length)return NextResponse.json({
   error:'ページを取得できませんでした。Firecrawlを含む5経路を試しましたが、すべて失敗しました。',
   debug:{firecrawl:'failed',direct:'failed',allorigins:'failed',microlink:'failed',jina:'failed'}
  },{status:422});

  stage='scoring';
  const keys=['entity','structure','schema','faq','trust','citation']; const categories={};
  const findings={
   entity:['会社・サービスが一文で理解できる説明を主要ページに明示する','titleとdescriptionで誰向けの何のサービスかを具体化する'],
   structure:['H1を1ページ1つに統一しH2/H3で論理構造を作る','ページごとの検索意図をtitle・見出し・本文で揃える'],
   schema:['Organization / Service / FAQPage等のJSON-LDを実装する','企業名・URL・ロゴ・所在地等を構造化データで統一する'],
   faq:['実際の顧客質問をFAQとして追加する','質問→短い結論→根拠の順で回答を書く'],
   trust:['会社概要・運営者・連絡先・実績・更新情報を明示する','記事や解説に執筆者・監修者・更新日を付ける'],
   citation:['AIが抜き出しやすい短い定義文・比較表・箇条書きを増やす','独自データや一次情報を具体的な数値と出典付きで掲載する']
  };
  for(const k of keys){
   const s=avg(docs.map(d=>d.score),k);
   categories[k]={score:s,findings:s>=80?['現状は比較的良好です。継続的に情報を更新してください。']:findings[k]};
  }
  const score=Math.round(keys.reduce((a,k)=>a+categories[k].score,0)/keys.length);
  const actions=[...keys].sort((a,b)=>categories[a].score-categories[b].score).slice(0,4).map(k=>findings[k][0]);
  const firstTitle=docs[0].html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.replace(/<[^>]+>/g,' ').trim();
  const usedFallback=docs.some(d=>d.fallback);

  return NextResponse.json({
   url:start.href,title:firstTitle||start.hostname,score,pagesAnalyzed:docs.length,pages:docs.map(d=>d.url),categories,actions,
   summary:`${docs.length}ページを取得し、AIO/GEO観点の6カテゴリを診断しました。現時点の総合スコアは ${score}/100 です。${usedFallback?' 一部ページは代替取得経路を使用しました。':''}`,
   fallbackUsed:usedFallback,
   fetchSources:[...new Set(docs.map(d=>d.source))]
  });
 }catch(e){
  return NextResponse.json({error:`診断処理でエラーが発生しました（${stage}）: ${e?.message||String(e)}`},{status:500});
 }
}