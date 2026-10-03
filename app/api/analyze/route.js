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
function candidateUrls(start){
 const out=[start.href];
 const host=start.hostname;
 const alt=new URL(start.href);
 alt.hostname=host.startsWith('www.')?host.slice(4):'www.'+host;
 out.push(alt.href);
 if(start.protocol==='https:'){const h=new URL(start.href);h.protocol='http:';out.push(h.href)}
 return [...new Set(out)];
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

function visualProfile(doc,start){
 const html=doc?.html||''; const base=doc?.url||start.href;
 const abs=(x)=>{try{return new URL(x,base).href}catch{return ''}};
 const imgs=[...html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)].map(m=>abs(m[1])).filter(x=>/^https?:/i.test(x));
 const logoMatch=html.match(/<img[^>]+(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]+(?:src|data-src)=["']([^"']+)["']/i)||html.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]+(?:class|id|alt)=["'][^"']*logo[^"']*["']/i);
 const colors=[...html.matchAll(/#[0-9a-fA-F]{6}\b/g)].map(m=>m[0].toLowerCase());
 const usable=colors.filter(x=>!['#ffffff','#000000','#fefefe','#fafafa','#f5f5f5'].includes(x));
 return {logo:logoMatch?abs(logoMatch[1]):'',heroImage:imgs.find(x=>x!==(logoMatch?abs(logoMatch[1]):''))||'',images:[...new Set(imgs)].slice(0,6),accent:usable[0]||'#245c49',secondary:usable[1]||'#eef5f1',source:'現行サイトから抽出'};
}
function contentAudit(text='',title='このサイト'){
 const t=String(text).replace(/\s+/g,' ').trim();
 const sentences=t.split(/(?<=[。！？!?])/).map(x=>x.trim()).filter(x=>x.length>=12&&x.length<=220);
 const pick=(re)=>sentences.find(x=>re.test(x))?.slice(0,180)||'該当する明確な記載を確認できませんでした。';
 const companyRe=/会社概要|企業情報|会社名|所在地|代表者|設立|資本金|株式会社/;
 const serviceRe=/サービス|事業内容|提供|制作|支援|ソリューション|商品/;
 const faqRe=/よくある質問|FAQ|Q&A|質問/;
 const proofRe=/実績|事例|導入|取引|お客様|受賞|件以上|年の実績|数字で見る/;
 return [
  {key:'company',title:'会社概要',found:companyRe.test(t),plain:'AIが「誰が運営しているサイトか」を確認するための情報です。',evidence:pick(companyRe),advice:companyRe.test(t)?'会社名だけでなく、所在地・代表者・事業内容・問い合わせ先まで一か所で確認できるとより明確です。':'会社名、所在地、代表者、事業内容、問い合わせ先をまとめた会社概要を追加してください。'},
  {key:'service',title:'サービス内容',found:serviceRe.test(t),plain:'AIが「何を提供している会社か」を理解する中心情報です。',evidence:pick(serviceRe),advice:serviceRe.test(t)?'対象顧客・提供内容・対応範囲・料金の目安まで具体化すると回答に使われやすくなります。':'誰向けに何を提供するかを、ページ冒頭の1〜2文で明記してください。'},
  {key:'faq',title:'よくある質問',found:faqRe.test(t),plain:'AIがユーザーの質問へ直接回答する材料になります。',evidence:pick(faqRe),advice:faqRe.test(t)?'実際の顧客質問を増やし、回答は結論から短く書くと効果的です。':'料金、納期、対応範囲、依頼方法など実際に聞かれる質問をFAQとして追加してください。'},
  {key:'proof',title:'実績・信頼情報',found:proofRe.test(t),plain:'AIと閲覧者が「この会社の情報を信用できるか」を判断する材料です。',evidence:pick(proofRe),advice:proofRe.test(t)?'実績を社名・件数・期間・成果など具体的な事実や数値で示してください。':'制作事例、導入実績、取引件数、受賞歴など検証できる実績を追加してください。'}
 ];
}
function siteSamples(text='',title='このサイト'){
 const s=String(text).replace(/\s+/g,' ').trim();
 const sentences=s.split(/(?<=[。！？!?])/).map(x=>x.trim()).filter(x=>x.length>=20&&x.length<=180);
 const generic=sentences.find(x=>/サービス|提供|対応|会社|企業|制作|事業|特徴|実績|お客様|顧客/.test(x))||sentences[0]||'サイト内の主要なサービス説明文';
 const short=generic.slice(0,150);
 return {
  source:short,
  improved:`${title}は、対象となるお客様に向けて提供内容と強みを明確に説明します。具体的には「誰に」「何を」「どこまで対応するか」を最初の1〜2文で示し、実績・料金・対応範囲を箇条書きや表で補足します。`,
  citation:`「${title}とは何か」を1文で定義し、その直後に特徴を3点の箇条書きで示します。`
 };
}
function clientExplanation(key,score,title='このサイト'){
 const map={
  entity:{plain:'AIに「何の会社で、誰に何を提供しているか」が伝わるかを見ています。',why:'ここが曖昧だと、AI検索で会社名やサービスを正しく紹介されにくくなります。',before:'私たちは幅広いニーズに応える高品質なサービスを提供しています。',after:`${title}は、〇〇に悩む企業向けに△△を提供するサービスです。□□まで一貫して対応します。`},
  structure:{plain:'ページの話題が、見出しを追うだけで理解できるかを見ています。',why:'人にもAIにも「どこに何が書いてあるか」が分かりやすくなります。',before:'H1や大見出しが複数あり、サービス説明・実績・料金が同じ階層に並んでいる。',after:'H1「〇〇サービス」→ H2「サービス概要」→ H2「選ばれる理由」→ H2「料金」→ H2「よくある質問」の順に整理。'},
  schema:{plain:'ページの内容をAIや検索エンジンへ機械的に伝える目印があるかを見ています。',why:'会社名、サービス、FAQなどを誤解なく読み取ってもらう助けになります。',before:'画面には会社情報があるが、機械向けの情報指定がない。',after:'Organization / Service / FAQPageの構造化データを追加し、画面の内容と一致させる。'},
  faq:{plain:'お客様が実際に聞きそうな質問に、ページ内で直接答えているかを見ています。',why:'AIは質問と明確な回答の組み合わせを回答材料として使いやすいためです。',before:'詳しくはお問い合わせください。',after:'Q. 費用はどのくらいですか？ A. 内容により異なりますが、〇〇は△△円〜です。見積前に条件を確認します。'},
  trust:{plain:'「誰が運営し、どんな根拠や実績があるか」を確認できるかを見ています。',why:'AIにも閲覧者にも、情報を信用してよいか判断する材料になります。',before:'実績豊富なスタッフが対応します。',after:'運営会社、所在地、担当領域、具体的な実績数、更新日、問い合わせ先を明記する。'},
  citation:{plain:'AIが回答文へそのまま引用しやすい情報の形になっているかを見ています。',why:'短い定義文、具体的な数値、比較表、箇条書きはAIが意味を切り出しやすくなります。',before:'お客様に合わせた最適なサービスを幅広くご提案します。',after:`${title}の特徴は3つです。①〇〇 ②△△ ③□□。対応範囲・料金・納期は比較表で明示します。`}
 };
 const benefit={
  entity:'AIが会社・サービスの正体を理解しやすくなり、関連する質問の回答候補になりやすくなります。',
  structure:'重要な情報をAIが見つけやすくなり、ページ内容の取り違えを減らせます。',
  schema:'会社名・サービス・FAQなどの意味を機械的に伝えやすくなります。',
  faq:'ユーザーの具体的な質問に、サイト内の情報を使って回答されやすくなります。',
  trust:'会社情報や実績の裏付けが増え、AIが回答材料として扱いやすくなります。',
  citation:'短く明確な一次情報が増え、AIの回答で参照・引用されやすくなります。'
 }[key]||'AIがサイト情報を理解し、回答材料として使いやすくなります。';
 const priority=score<40?'最優先':score<60?'高':score<80?'中':'維持';
 const simple={
  entity:'AIが「この会社は何をしている会社か」をすぐ理解できるかを見る項目です。',
  structure:'ページの内容が整理され、AIが重要な情報を順番に読み取れるかを見る項目です。',
  schema:'会社名やサービス情報を、AIにも分かる形式で伝えられているかを見る項目です。',
  faq:'お客様が聞きそうな質問に、AIがサイト内の情報を使って答えられるかを見る項目です。',
  trust:'運営会社や実績など、AIが信頼できる情報と判断する材料があるかを見る項目です。',
  citation:'AIが回答を作るとき、そのまま参考・引用しやすい情報があるかを見る項目です。'
 }[key];
 return {...map[key],score,simple,benefit,priority};
}
function executiveSummary(categories,crawlabilityIssue=false){
 const entries=Object.entries(categories||{}).sort((a,b)=>a[1].score-b[1].score);
 const labels={entity:'企業・サービスの分かりやすさ',structure:'情報構造',schema:'構造化データ',faq:'FAQ',trust:'信頼情報',citation:'引用されやすさ'};
 const weakest=entries[0]?.[0], strongest=[...entries].sort((a,b)=>b[1].score-a[1].score)[0]?.[0];
 if(crawlabilityIssue)return {
  good:'今回の診断ではページ本文を十分に取得できなかったため、良い点の詳細評価は保留です。',
  issue:'AI側からサイト内容を読み取りにくい可能性があります。まず取得しやすさの確認が必要です。',
  first:'robots.txt、WAF・Bot対策、JavaScript依存などを確認し、AIが公開HTMLへ到達できる状態を整えます。'
 };
 return {
  good:`${labels[strongest]||'一部項目'}は比較的整っています。現在の良い部分を残しながら改善できます。`,
  issue:`最も改善余地が大きいのは「${labels[weakest]||'AIO/GEO対応'}」です。ここから直すと優先順位が明確です。`,
  first:`まず「${labels[weakest]||'優先項目'}」の改善から着手し、その後に次点の項目へ進むのがおすすめです。`
 };
}
function buildImplementationPlan(categories,crawlabilityIssue=false){
 const plans={
  entity:{title:'企業・サービス情報をAI向けに明確化',impact:'高',type:'content',codeTarget:'title / meta description / ファーストビュー',instruction:'誰が・誰向けに・何を提供する会社かを1〜2文で明示する。'},
  structure:{title:'見出しと情報階層を整理',impact:'高',type:'html',codeTarget:'H1 / H2 / H3',instruction:'H1をページの主題1つに絞り、H2/H3で質問単位・テーマ単位に構造化する。'},
  schema:{title:'構造化データを実装',impact:'高',type:'jsonld',codeTarget:'JSON-LD',instruction:'Organization / Service / FAQPageなどページ内容に合うschema.orgを追加する。'},
  faq:{title:'AIが回答に使えるFAQを追加',impact:'中',type:'content+jsonld',codeTarget:'FAQ section / FAQPage',instruction:'実際の顧客質問に短い結論から回答し、FAQPage構造化データと一致させる。'},
  trust:{title:'信頼情報を明示',impact:'高',type:'content',codeTarget:'会社概要 / 著者・監修 / 更新日',instruction:'運営者、所在地、連絡先、実績、更新日など検証可能な情報を明示する。'},
  citation:{title:'AIが引用しやすい本文へ改善',impact:'高',type:'content',codeTarget:'本文 / 表 / 箇条書き',instruction:'定義、数値、比較、一次情報を短い段落・表・箇条書きで提示する。'}
 };
 const ordered=Object.entries(categories).sort((a,b)=>a[1].score-b[1].score).map(([key,v],i)=>({priority:i+1,key,score:v.score,...plans[key]}));
 if(crawlabilityIssue)ordered.unshift({priority:0,key:'crawlability',score:0,title:'AIクローラビリティを改善',impact:'最優先',type:'server',codeTarget:'robots.txt / WAF / SSR',instruction:'AIクローラが公開HTMLへ到達できるようrobots、WAF/Bot制御、SSR/静的HTML配信を確認する。'});
 return ordered;
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
function internalLinksFromText(text,base){
 const out=[]; let baseUrl;
 try{baseUrl=new URL(base)}catch{return out}
 for(const m of String(text||'').matchAll(/\]\((https?:\/\/[^)\s]+)\)/gi)){
  try{
   const u=new URL(m[1],baseUrl);
   u.hash='';
   if(/^https?:$/.test(u.protocol)&&u.origin===baseUrl.origin&&!/\.(?:pdf|jpe?g|png|gif|webp|svg|zip)(?:$|\?)/i.test(u.pathname+u.search))out.push(u.href);
  }catch{}
 }
 return [...new Set(out)];
}

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
function classifyPage(d,start){
 let path=''; try{path=new URL(d.url).pathname.toLowerCase()}catch{}
 const t=(d.text||'').slice(0,12000);
 const home=path==='/'||path==='';
 if(home)return {role:'home',label:'トップページ',weight:2.0};
 if(/service|business|solution|product|事業|サービス|製品/.test(path+' '+t.slice(0,1000)))return {role:'service',label:'サービス・事業',weight:1.7};
 if(/company|about|profile|corporate|会社概要|企業情報/.test(path+' '+t.slice(0,1000)))return {role:'company',label:'会社概要',weight:1.5};
 if(/faq|question|よくある質問|q&a/.test(path+' '+t.slice(0,1500)))return {role:'faq',label:'FAQ',weight:1.4};
 if(/case|works|result|portfolio|実績|事例|導入/.test(path+' '+t.slice(0,1500)))return {role:'proof',label:'実績・事例',weight:1.4};
 if(/contact|inquiry|お問い合わせ/.test(path))return {role:'contact',label:'お問い合わせ',weight:.7};
 if(/news|blog|column|article|topics|お知らせ/.test(path))return {role:'article',label:'記事・お知らせ',weight:.8};
 return {role:'other',label:'その他',weight:1.0};
}
function weightedAvg(docs,key,start){
 let total=0,weights=0;
 for(const d of docs){const w=classifyPage(d,start).weight;total+=d.score[key]*w;weights+=w}
 return Math.round(total/Math.max(weights,1));
}
function roleCoverage(docs,start){
 const roles=docs.map(d=>classifyPage(d,start).role);
 const defs=[['home','トップページ'],['service','サービス・事業'],['company','会社概要'],['faq','FAQ'],['proof','実績・事例']];
 return defs.map(([role,label])=>({role,label,found:roles.includes(role),count:roles.filter(x=>x===role).length}));
}
function pageDetail(d){
 const html=d.html||'', text=d.text||'';
 const title=html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.replace(/<[^>]+>/g,' ').trim()||d.url;
 const score=Math.round(Object.values(d.score).reduce((a,b)=>a+b,0)/Object.keys(d.score).length);
 const h1=count(/<h1\b/gi,html)+(d.fallback?count(/^#\s+/gm,text):0);
 const hasDescription=/name=["']description["']/i.test(html);
 const hasSchema=/application\/ld\+json/i.test(html);
 const hasFaq=/FAQPage|よくある質問|FAQ|Q&A/i.test(html+text);
 const hasTrust=/会社概要|代表者|所在地|住所|お問い合わせ|運営会社|実績|更新日/i.test(text);
 const issues=[];
 if(!title||title===d.url)issues.push('ページ内容を表すtitleを明確にする');
 if(!hasDescription)issues.push('meta descriptionを追加する');
 if(h1!==1)issues.push(h1===0?'H1を1つ設定する':'H1を1ページ1つに整理する');
 if(!hasSchema)issues.push('ページ内容に合う構造化データを検討する');
 if(!hasFaq)issues.push('必要に応じて具体的なFAQを追加する');
 if(!hasTrust)issues.push('運営者・実績など信頼情報への導線を明確にする');
 const role=classifyPage(d);
 return {url:d.url,title,score,categories:d.score,source:d.source,role:role.role,roleLabel:role.label,weight:role.weight,checks:{h1,description:hasDescription,schema:hasSchema,faq:hasFaq,trust:hasTrust},issues:issues.slice(0,5)};
}
async function firecrawlFallback(target,debug=false,attempt=0){
 try{
  const headers={'content-type':'application/json','accept':'application/json'};
  const rawKey=String(process.env.FIRECRAWL_API_KEY||'');
  const apiKey=rawKey
   .replace(/[\u200B-\u200D\u2060\uFEFF\r\n\t]/g,'')
   .trim()
   .replace(/^["']|["']$/g,'')
   .replace(/^Bearer\s+/i,'')
   .trim();
  if(apiKey) headers.authorization='Bearer '+apiKey;
  const res=await fetch('https://api.firecrawl.dev/v2/scrape',{
   method:'POST',
   headers,
   body:JSON.stringify({
    url:target,
    formats:['markdown'],
    location:{country:'JP',languages:['ja']}
   }),
   signal:AbortSignal.timeout(45000),
   cache:'no-store'
  });
  const raw=await res.text();
  let json={};
  try{json=JSON.parse(raw)}catch{}
  if(!res.ok){
   if(attempt<1&&res.status>=500)return firecrawlFallback(target,debug,attempt+1);
   return debug?{error:'HTTP '+res.status,detail:raw.slice(0,500),source:'firecrawl'}:null;
  }
  const text=json?.data?.markdown || json?.markdown || '';
  if(typeof text!=='string'||text.trim().length<100)return debug?{error:'empty-markdown',detail:raw.slice(0,500),source:'firecrawl'}:null;
  return {text,source:'firecrawl'};
 }catch(e){
  if(attempt<1)return firecrawlFallback(target,debug,attempt+1);
  return debug?{error:e?.message||String(e),source:'firecrawl'}:null;
 }
}


async function firecrawlBatchFallback(targets){
 try{
  if(!Array.isArray(targets)||targets.length<2)return null;
  const rawKey=String(process.env.FIRECRAWL_API_KEY||'');
  const apiKey=rawKey.replace(/[\u200B-\u200D\u2060\uFEFF\r\n\t]/g,'').trim().replace(/^["']|["']$/g,'').replace(/^Bearer\s+/i,'').trim();
  if(!apiKey)return null;
  const headers={'content-type':'application/json','accept':'application/json','authorization':'Bearer '+apiKey};
  const started=await fetch('https://api.firecrawl.dev/v2/batch/scrape',{
   method:'POST',headers,
   body:JSON.stringify({urls:targets,formats:['markdown'],location:{country:'JP',languages:['ja']},maxConcurrency:2}),
   signal:AbortSignal.timeout(10000),cache:'no-store'
  });
  if(!started.ok)return null;
  const startJson=await started.json();
  const id=startJson?.id;
  if(!id)return null;
  const deadline=Date.now()+32000;
  while(Date.now()<deadline){
   await new Promise(resolve=>setTimeout(resolve,1500));
   const statusRes=await fetch('https://api.firecrawl.dev/v2/batch/scrape/'+encodeURIComponent(id),{
    headers:{'accept':'application/json','authorization':'Bearer '+apiKey},
    signal:AbortSignal.timeout(10000),cache:'no-store'
   });
   if(!statusRes.ok)return null;
   const status=await statusRes.json();
   if(status?.status==='failed'||status?.status==='cancelled')return null;
   if(status?.status==='completed'){
    const data=Array.isArray(status.data)?status.data:[];
    return targets.map(target=>{
     const item=data.find(x=>x?.metadata?.sourceURL===target)||data.find(x=>{try{return new URL(x?.metadata?.sourceURL).pathname===new URL(target).pathname}catch{return false}});
     const text=item?.markdown;
     if(typeof text!=='string'||text.trim().length<100)return null;
     const sliced=text.slice(0,30000);
     return {url:target,html:'',text:sliced,fallback:true,source:'firecrawl',score:scorePage('',sliced,true)};
    });
   }
  }
  return null;
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
   signal:AbortSignal.timeout(7000),
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
  const res=await fetch(proxy,{headers:{'accept':'text/html,*/*','user-agent':'Mozilla/5.0'},signal:AbortSignal.timeout(7000),cache:'no-store'});
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
   signal:AbortSignal.timeout(7000),
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
  const res=await fetch(realReader,{headers:{'accept':'text/plain','user-agent':'Mozilla/5.0'},signal:AbortSignal.timeout(7000),cache:'no-store'});
  if(!res.ok)return null;
  const text=await res.text();
  if(text.trim().length<100)return null;
  return {text,source:'jina'};
 }catch{return null}
}
async function fetchPage(target){
 const tasks=[
  directFetch(target),
  readerFallback(target),
  firecrawlFallback(target)
 ].map(p=>p.then(v=>v||Promise.reject(new Error('empty'))).catch(()=>Promise.reject(new Error('failed'))));
 let got=null;
 try{got=await Promise.any(tasks)}catch{return null}
 if(got.html){
  const text=cleanText(got.html).slice(0,30000);
  return {url:target,html:got.html,text,fallback:got.source!=='direct',source:got.source,score:scorePage(got.html,text,got.source!=='direct')};
 }
 if(got.text){
  const text=got.text.slice(0,30000);
  return {url:target,html:'',text,fallback:true,source:got.source,score:scorePage('',text,true)};
 }
 return null;
}

export const maxDuration = 60;

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
  const sitemap=await sitemapUrls(start);
  const queue=[start.href,...sitemap]; const seen=new Set(); const docs=[]; const failed=[];
  const MAX_PAGES=200;
  while(queue.length&&seen.size<MAX_PAGES){
   const batch=[];
   while(queue.length&&batch.length<10&&seen.size+batch.length<MAX_PAGES){
    const target=queue.shift();
    if(!target||seen.has(target)||batch.includes(target))continue;
    batch.push(target);
   }
   if(!batch.length)break;
   batch.forEach(x=>seen.add(x));
   const batchPages=await firecrawlBatchFallback(batch);
   const results=batchPages?batch.map((target,i)=>({target,page:batchPages[i]})):await Promise.all(batch.map(async target=>({target,page:await fetchPage(target)})));
   for(const {target,page} of results){
    if(!page){failed.push(target);continue}
    const fingerprint=page.text.slice(0,2000);
    if(!docs.some(d=>d.text.slice(0,2000)===fingerprint))docs.push(page);
    const links=page.html?internalLinks(page.html,target):internalLinksFromText(page.text,target);
    for(const l of links){
     if(!seen.has(l)&&!queue.includes(l)&&queue.length<MAX_PAGES*2)queue.push(l);
    }
   }
  }
  if(!docs.length){
   return NextResponse.json({
    url:start.href,
    title:start.hostname,
    score:18,
    pagesAnalyzed:0,
    pages:[],
    categories:{
     entity:{score:20,findings:['外部AIクローラから主要コンテンツを取得できませんでした。企業・サービス情報がAIに認識されにくい状態です。']},
     structure:{score:25,findings:['ページ本文を取得できないため情報構造を十分に評価できません。クローラがHTML本文へ到達できる状態を確認してください。']},
     schema:{score:20,findings:['構造化データを外部から確認できませんでした。Organization / Service等のJSON-LDを公開HTMLで確認できる状態にしてください。']},
     faq:{score:15,findings:['FAQ情報をAIクローラから確認できませんでした。質問と回答を公開HTMLに明示してください。']},
     trust:{score:20,findings:['会社概要・運営者・連絡先などの信頼情報を外部取得できませんでした。']},
     citation:{score:10,findings:['AIが本文を取得できないため引用されにくい状態です。AIクローラビリティの改善を最優先してください。']}
    },
    actions:[
     'AIクローラが公開HTMLを取得できるようWAF・Bot対策・robots設定を確認する',
     '会社・サービス概要をJavaScript実行不要のHTMLにも含める',
     'Organization / Service等のJSON-LDを公開HTMLへ実装する',
     'FAQ・会社情報・実績など引用しやすい一次情報を公開する'
    ],
    summary:'今回の診断では、外部からページ本文を取得できませんでした。AI検索サービスによって取得条件は異なるため、すべてのAIが閲覧できないことを意味するものではありません。',
    summarySimple:'AI側からこのサイトの中身をうまく読み取れませんでした。人には普通に見えていても、AIには情報が届きにくい可能性があります。robots.txt、WAF・Bot対策、JavaScript依存などを確認すると改善できる可能性があります。',
    fallbackUsed:true,
    fetchSources:[],
    crawlabilityIssue:true,
    executiveSummary:executiveSummary({entity:{score:20},structure:{score:25},schema:{score:20},faq:{score:15},trust:{score:20},citation:{score:10}},true),
    clientGuide:Object.fromEntries(Object.entries({entity:{score:20},structure:{score:25},schema:{score:20},faq:{score:15},trust:{score:20},citation:{score:10}}).map(([k,v])=>[k,clientExplanation(k,v.score,start.hostname)])),
    implementationPlan:buildImplementationPlan({
     entity:{score:20},structure:{score:25},schema:{score:20},faq:{score:15},trust:{score:20},citation:{score:10}
    },true)
   });
  }

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
   const s=weightedAvg(docs,k,start);
   categories[k]={score:s,findings:s>=80?['現状は比較的良好です。継続的に情報を更新してください。']:findings[k]};
  }
  const score=Math.round(keys.reduce((a,k)=>a+categories[k].score,0)/keys.length);
  const actions=[...keys].sort((a,b)=>categories[a].score-categories[b].score).slice(0,4).map(k=>findings[k][0]);
  const firstTitle=docs[0].html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.replace(/<[^>]+>/g,' ').trim();
  const usedFallback=docs.some(d=>d.fallback);

  return NextResponse.json({
   url:start.href,title:firstTitle||start.hostname,score,pagesAnalyzed:docs.length,pagesDiscovered:seen.size,pagesFailed:failed.length,complete:failed.length===0&&queue.length===0,pages:docs.map(d=>d.url),pageResults:docs.map(pageDetail),roleCoverage:roleCoverage(docs,start),scoringMethod:'重要ページ加重評価',failedPages:failed.slice(0,50),categories,actions,
   summary:`${docs.length}ページを取得し、AIO/GEO観点の6カテゴリを診断しました。現時点の総合スコアは ${score}/100 です。${usedFallback?' 一部ページは代替取得経路を使用しました。':''}`,
   summarySimple:`AIがこのサイトを理解・回答・引用しやすいかを100点満点で確認した結果、${score}点でした。点数が低い項目から直すと、AIに内容が伝わりやすくなります。`,
   fallbackUsed:usedFallback,
   fetchSources:[...new Set(docs.map(d=>d.source))],
   executiveSummary:executiveSummary(categories,false),
   contentAudit:contentAudit(docs.map(d=>d.text).join(' ').slice(0,120000),firstTitle||start.hostname),
   clientGuide:Object.fromEntries(Object.entries(categories).map(([k,v])=>{const g=clientExplanation(k,v.score,firstTitle||start.hostname);const sample=siteSamples(docs.map(d=>d.text).join(' ').slice(0,120000),firstTitle||start.hostname);return [k,{...g,siteBefore:sample.source,siteAfter:k==='citation'?sample.citation:sample.improved}]})),
   visualProfile:visualProfile(docs[0],start),\n   implementationPlan:buildImplementationPlan(categories,false)
  });
 }catch(e){
  return NextResponse.json({error:`診断処理でエラーが発生しました（${stage}）: ${e?.message||String(e)}`},{status:500});
 }
}

export async function GET(req){
 const u=new URL(req.url);
 if(u.searchParams.get('health')==='1'){
  return NextResponse.json({ok:true,service:'aio-geo-audit',version:'health-v2',hasFirecrawlKey:Boolean(process.env.FIRECRAWL_API_KEY)});
 }
 if(u.searchParams.get('debug')!=='1') return NextResponse.json({ok:true,service:'aio-geo-audit'});
 const target=u.searchParams.get('url')||'https://www.e-xpress.jp/';
 const result=await firecrawlFallback(target,true);
 return NextResponse.json({target,hasKey:Boolean(process.env.FIRECRAWL_API_KEY),result});
}
