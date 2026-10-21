// Observable document signals only. No inference of AI visibility or business outcomes.
function documentText(value=''){
 return String(value).replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/<[^>]+>/g,' ').replace(/^\s*#{1,6}\s+/gm,'').replace(/\s+/g,' ').trim();
}
export function inspectDocument({html='',text='',url='',source='direct'}) {
 const native=source==='direct'&&Boolean(html);
 const visible=String(text).replace(/\s+/g,' ').trim();
 const strip=documentText;
 const body=html.replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ');
 const paragraphs=native?[...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>strip(m[1])):String(text).split(/\n\s*\n/).map(strip);
 const definitions=paragraphs.filter(p=>p.length>=12&&p.length<=260&&/(?:とは|は、).{4,180}(?:です|指します|いいます|である|提供します)[。.]?/.test(p));
 const externalSources=[];
 for(const m of body.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  try{const u=new URL(m[1],url);if(/^https?:$/.test(u.protocol)&&u.origin!==new URL(url).origin&&/出典|参照|調査|研究|報告|source|reference/i.test(strip(m[2])))externalSources.push(u.href);}catch{}
 }
 const canonicalTags=[...body.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).filter(tag=>/\brel\s*=\s*["']canonical["']/i.test(tag));
 const canonicals=canonicalTags.map(tag=>{const href=tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];try{const u=new URL(href||'',url);return href&&/^https?:$/.test(u.protocol)?u.href:null;}catch{return null;}}).filter(Boolean);
 const headingLevels=[...body.matchAll(/<h([1-6])\b/gi)].map(m=>Number(m[1]));
 const headingsText=native?[...body.matchAll(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi)].map(m=>strip(m[1])).filter(Boolean).slice(0,8):[...String(text).matchAll(/^#{1,2}\s+(.+)$/gm)].map(m=>m[1].trim()).slice(0,8);
 const title=strip(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
 const descriptionTag=[...body.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]).find(tag=>/\bname\s*=\s*["']description["']/i.test(tag));
 const description=strip(descriptionTag?.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1]||'');
 const identifies=/ブランド|専門店|専門会社|メーカー|製造|販売|洋菓子|フランス菓子|提供する|支援する|手がける|運営する|開発する/;
 const intro=paragraphs.find(p=>p.length>=15&&p.length<=260&&identifies.test(p));
 const descriptionEvidence=definitions[0]?{text:definitions[0],location:'本文'}:intro?{text:intro,location:'本文'}:identifies.test(title)?{text:title,location:'ページタイトル'}:identifies.test(description)?{text:description,location:'ページの説明文'}:null;
 const h1Texts=[...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>strip(m[1])||m[1].match(/\balt=["']([^"']*)["']/i)?.[1]||'画像・文字なし');
 const faqPairs=native?[...body.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/gi)].map(m=>({question:strip(m[1]),answer:strip(m[2])})).filter(p=>p.question):[];
 const headingJumps=headingLevels.flatMap((level,i)=>i&&level>headingLevels[i-1]+1?[`H${headingLevels[i-1]}→H${level}`]:[]);
 const headingJump=headingLevels.some((level,i)=>i>0&&level>headingLevels[i-1]+1);
 const primaryKinds=[['survey',/自社調査|当社調査|アンケート/],['expert',/専門家|監修|考察/],['experiment',/実験|検証結果|テスト結果/],['case',/導入事例|事例紹介|ケーススタディ/]].filter(([,re])=>re.test(visible)).map(([key])=>key);
 const topics=[...new Set((documentText(text).match(/[\p{Script=Han}\p{Script=Katakana}A-Za-z]{2,20}(?:サービス|制作|支援|デザイン|マーケティング)/gu)||[]))].slice(0,5);
 const path=(()=>{try{return new URL(url).pathname;}catch{return '';}})();
 const pageKind=classifyPurpose(url,title);
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(m=>/\btype\s*=\s*["']application\/ld\+json["']/i.test(m[1]));
 const nodes=[];let invalid=0;
 function walk(v,depth=0){if(depth>40)return;if(Array.isArray(v))v.forEach(x=>walk(x,depth+1));else if(v&&typeof v==='object'){if(v['@type'])nodes.push(v);Object.values(v).filter(x=>x&&typeof x==='object').forEach(x=>walk(x,depth+1));}}
 for(const m of scripts){try{walk(JSON.parse(m[2]));}catch{invalid++;}}
 const types=[...new Set(nodes.flatMap(n=>[n['@type']].flat()).filter(x=>typeof x==='string'))];
 const alternativeMarkup=/\bitemscope\b|\btypeof\s*=/i.test(body);
 const organizations=nodes.filter(n=>[n['@type']].flat().some(t=>['Organization','Corporation','LocalBusiness'].includes(t))).map(n=>({name:typeof n.name==='string'?n.name:null,url:typeof n.url==='string'?n.url:null,id:n['@id']||null}));
 const links=[];
 for(const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)){try{const u=new URL(m[1],url);if(u.origin===new URL(url).origin&&/^https?:$/.test(u.protocol)){u.hash='';links.push(u.href);}}catch{}}
 return {url,source,native,signals:{
  answer:/とは|結論|料金|費用|手順|方法/.test(visible),
  blocks:native?/<(?:ul|ol|table)\b/i.test(html):/^\s*(?:[-*]|\d+\.)\s/m.test(text),
  faq:/よくある質問|Q\s*[.．:：]|FAQ/i.test(visible),
  evidence:/調査|出典|実績|事例|導入/.test(visible)&&/\d/.test(visible),
  headings:native?(html.match(/<h1\b/gi)||[]).length===1&&/<h2\b/i.test(html):null,
  author:/著者|執筆|監修|プロフィール/.test(visible),
  contact:/所在地|住所/.test(visible)&&/電話|お問い合わせ|連絡先/.test(visible),
  updated:/更新日|最終更新|dateModified/i.test(visible),
  service:/サービス|事業|提供|製品/.test(visible),
  definition:Boolean(descriptionEvidence),
  semantic:native?/<main\b/i.test(body)&&/<(?:article|section)\b/i.test(body):null,
  hierarchy:native?headingLevels.length>0&&!headingJump:null,
  canonical:native?canonicalTags.length===1&&canonicals.length===1:null,
  sourceLink:native?externalSources.length>0:null,
  conditions:/対象|条件|前提|調査期間|集計期間|除外|適用範囲/.test(visible),
  primary:primaryKinds.length>0
 },details:{title,description,descriptionEvidence,faqPairs,h1Texts:native?h1Texts:null,headingJumps:native?headingJumps:null,canonicalCount:native?canonicalTags.length:null,headingsText,topics,excerpt:paragraphs.find(p=>p.length>=20&&/[。.!?]/.test(p))?.slice(0,240)||paragraphs.find(p=>p.length>=20)?.slice(0,240)||documentText(text).slice(0,240),definitionExamples:definitions.slice(0,2).map(p=>p.slice(0,180)),externalSources:[...new Set(externalSources)].slice(0,5),canonicals,primaryKinds,pageKind},jsonld:native?{scripts:scripts.length,invalid,types,organizations,alternativeMarkup}:null,links:native?[...new Set(links)]:null};
}

export function buildInternalAudit(documents=[]) {
 const docs=documents.map(d=>d.internalEvidence||inspectDocument(d));
 let rows=[];
 const add=(id,group,title,signal,advice,impact=2,effort=2)=>{
  const applicable=docs.filter(d=>checkApplies(id,d));
  const eligible=signal?applicable.filter(d=>signal(d)!==null&&signal(d)!==undefined):[];
  const hits=eligible.filter(d=>signal(d));
  const state=docs.length&&!applicable.length?'not_applicable':!eligible.length?'unknown':hits.length===eligible.length?'observed':hits.length?'partial':'not_observed';
  const pages=docs.map(d=>({url:d.url,state:!checkApplies(id,d)?'not_applicable':!signal||signal(d)==null?'unknown':signal(d)?'observed':'not_observed',kind:d.details?.pageKind||classifyPurpose(d.url),excerpt:''}));
  rows.push({id,group,title,state,method:eligible.length?'document_signal':'manual_review',checked:eligible.length,matched:hits.length,evidence:hits.slice(0,5).map(d=>d.url),pages,advice,impact,effort,priority:['not_observed','partial'].includes(state)?impact*3-effort:state==='unknown'?1:0});
 };
 const s=k=>d=>d.signals[k];
 add('fanout','コンテンツ','質問を複数の意図へ分解',null,'顧客の中心的な質問から、意味・比較・費用・導入条件・検証方法の質問候補を作り、実際のAI回答とは分けて管理する。');
 add('cluster','コンテンツ','中心ページと補足ページの関係',null,'中心テーマと補足記事を対応付け、関連性と相互リンクを編集者が確認する。');
 add('answer','コンテンツ','短い回答と整理された補足',d=>d.signals.answer&&d.signals.blocks,'冒頭に端的な回答を置き、根拠・条件・比較や手順を補足する。',3,1);
 add('rewrite','コンテンツ','既存文章の編集と事実確認',null,'既存文を結論・根拠・適用条件の順に見直し、原文との事実一致を確認する。');
 add('faq','コンテンツ','顧客の疑問に答える記述',s('faq'),'実際の問い合わせから質問と回答を作り、回答の範囲と例外を明記する。');
 add('evidence','コンテンツ','数値を伴う根拠の手掛かり',s('evidence'),'一次データや事例に調査期間・条件・参照元を付け、内容の正確さを確認する。',3);
 add('jsonld','技術','JSON-LDの解析と型の検出',d=>d.jsonld?d.jsonld.scripts>0&&d.jsonld.invalid===0&&d.jsonld.types.length>0:null,'JSON構文を修正し、ページに合う型を選ぶ。表示内容との一致、必須属性、外部バリデータでの検証は別途必要。',3,1);
 add('html','技術','主見出しと小見出し',s('headings'),'主題をH1に置き、H2以下で情報を分ける。意味的な階層も確認する。',3,1);
 add('crawler','技術','取得制御ファイルの確認',null,'robots.txtの対象Bot別ルールとWAFを確認する。llms.txtは任意の補助資料であり、設置を引用の条件としない。',3);
 add('performance','技術','表示速度と操作性',null,'実ブラウザと速度計測ツールで表示・操作・読み込みを測定する。HTML取得成功だけでは判定しない。',3);
 add('links','サイト構造','同一サイトへのリンク',d=>d.links?d.links.length>0:null,'関連ページへの文脈のあるリンクを設ける。リンク先の取得可否と意味の一致は別途確認する。');
 add('directory','サイト構造','URL階層の点検',null,'取得URLの分類と階層を見直し、重複や不要なパラメータを確認する。');
 add('theme','サイト構造','提供領域の説明',s('service'),'対象顧客・専門領域・サービスを中心ページと補足ページで整合させる。');
 add('entity','信頼性','組織名とURLの機械可読情報',d=>d.jsonld?d.jsonld.organizations.some(n=>n.name&&n.url):null,'組織のname・url・@idを整理し、実在情報・画面表示・外部プロフィールとの一致を手動確認する。',3,1);
 add('author','信頼性','執筆・監修者の手掛かり',s('author'),'担当者の経験・専門領域と根拠を明示する。権威性そのものはこの検査で測定しない。');
 add('contact','信頼性','所在地と連絡方法の記載',s('contact'),'運営主体・所在地・連絡先を掲載し、情報が現状と一致するか確認する。',3,1);
 add('visibility','運用','AI回答・引用の定点観測',null,'ヒット測定で質問・モデル・実行日時・回答・参照URLを保存する。今回のHTML診断から引用実績を推定しない。',3);
 add('priority','運用','改善順序と担当の合意',null,'下記の改善候補を影響・工数の目安で並べ、事業上の重要度と担当者を決める。');
 add('ownership','運用','更新担当と確認基準',null,'編集・技術・計測の担当者と確認周期を決める。');
 add('review','運用','修正後の再確認と知識共有',null,'修正履歴と再診断結果を残し、判断基準を共有する。');
 const items=rows;
 rows=[];
 const signal=k=>d=>d.signals?.[k];
 add('definition','意味・文脈','用語やサービスの短い定義',signal('definition'),'名称を列挙するだけでなく、対象・意味・提供範囲を短い段落で説明する。語句の検出は定義の正確さを保証しない。',3,1);
 add('semantic','公開HTML','本文の領域を表すHTML',signal('semantic'),'main・article・sectionなどを内容の役割に合わせて選ぶ。タグの存在だけで適切な構造とは断定できない。');
 add('hierarchy','公開HTML','見出しレベルの連続性',signal('hierarchy'),'見出しを主題から詳細へ段階的に配置する。内容の連続性や意味的な妥当性は編集者が確認する。',2,1);
 add('canonical','公開HTML','代表URLを示す指定',signal('canonical'),'canonicalを1件、解決可能なHTTP(S)形式で指定する。代表URLの妥当性・インデックス登録・検索エンジンによる採用は未確認。',2,1);
 add('sourceLink','根拠','出典と分かる外部参照リンク',signal('sourceLink'),'数値や主張の近くに出典・調査条件を示す。リンクの存在と出典の信頼性・到達可否は別途検証する。',3,1);
 add('conditions','根拠','対象や適用条件の説明',signal('conditions'),'対象範囲・前提・期間・除外条件を主張と一緒に記載し、切り出した際にも誤解を防ぐ。',3,1);
 add('primary','根拠','調査・見解・検証・事例の記載',signal('primary'),'自社調査、専門的見解、検証、事例を事実確認して掲載する。関連語の検出だけでは独自性や一次情報であることを判定しない。',3,2);
 const supplemental=rows;
 const planning=buildQuestionPlan(docs);
 const recommendations=buildSpecificRecommendations(docs);
 const priorities=[...items,...supplemental].filter(x=>['not_observed','partial','unknown'].includes(x.state)).sort((a,b)=>b.priority-a.priority);
 return {version:3,recommendations,scope:'取得できた代表ページのみ。未検出はサイト全体での不存在を意味しません。検出は品質・正確性・AI引用の保証ではありません。',items,supplemental,priorities,jsonld:docs.filter(d=>d.jsonld).map(d=>({url:d.url,...d.jsonld})),pageGuidance:docs.filter(d=>d.details).map(d=>({url:d.url,...d.details,instruction:d.details.pageKind==='corporate'?'運営主体・事業領域・沿革・実績の関係を明確にし、公式名称と定義を揃える。':d.details.pageKind==='service'?'対象顧客の課題、解決内容、比較条件、費用、根拠を同じ文脈で説明する。':'URLから用途を分類できません。企業紹介かサービス説明かを担当者が選び、ページの目的を明確にする。'})),measurementPlan:{state:'unmeasured',note:'以下は計測計画です。HTML診断からブランド想起・流入・商談成果は算出していません。',metrics:[{name:'AIの言及・引用',method:'質問セット・モデル・実行日時を固定して既存ヒット測定で回答と出典を記録する。'},{name:'AI経由の流入',method:'GA4等で参照元・期間・計測条件を定義する。解析アカウントとの連携は未実装。'},{name:'問い合わせ・商談',method:'イベントと成約の定義を担当者と決める。流入元との関連付けと成果計測は未実装。'}],review:'実装前の基準値と改修履歴を保存し、同じ条件で再確認する。CMS・テンプレート・権限・担当者を決めてから改修する。'},planning};
}

// Fit the research-derived checks into the original six cards and action list.
// Keep the original page/report layout and score scale; never score manual checks.
export function applyAuditKnowledge(categories={},audit){
 if(Array.isArray(audit?.recommendations))return applySpecificRecommendations(categories,audit.recommendations);
 const groups={entity:['entity','definition','theme'],structure:['html','hierarchy','links','canonical'],schema:['jsonld'],faq:['faq','fanout'],trust:['contact','author','evidence','primary','sourceLink','conditions'],citation:['answer','rewrite','visibility']};
 const checks=[...(audit?.items||[]),...(audit?.supplemental||[])];
 const categoryEntries=Object.entries(categories).map(([key,value])=>{
  const rows=(groups[key]||[]).map(id=>checks.find(x=>x.id===id)).filter(Boolean);
  const pending=rows.filter(x=>['not_observed','partial'].includes(x.state)).sort((a,b)=>b.priority-a.priority);
  const manual=rows.filter(x=>x.state==='unknown');
  const observed=rows.filter(x=>x.state==='observed');
  const findings=pending.slice(0,2).map(x=>formatRecommendation(x));
  if(!findings.length&&observed.length){const x=observed[0];findings.push(`${plainAdvice(x.id).label}に関する記載を確認できました。内容が最新か、掲載事実と一致しているかを確認してください。`);}
  if(manual.length){const x=manual[0];findings.push(formatRecommendation(x));}
  if(key==='structure'&&audit.planning?.cluster?.hub&&audit.planning.cluster.spokes.length){
   const note='関連する商品・サービスの説明から、選び方やよくある質問へリンクを付けてください。どのページ同士を結ぶかは、内容の関連性を確認して決めます。';
   if(findings.length<3)findings.push(note);
  }
  if(!findings.length)findings.push('この種類のページに一律の追加修正は求めていません。掲載目的に合う情報が揃っているかを確認してください。');
  return [key,{...value,findings:findings.slice(0,3)}];
 });
 const detected=(audit?.priorities||[]).filter(x=>['not_observed','partial'].includes(x.state));
 const actions=detected.slice(0,3).map(formatRecommendation);
 if(!actions.length)actions.push('自動確認で優先修正を特定できませんでした。未測定の設定は制作担当者に確認してください。');
 return {categories:Object.fromEntries(categoryEntries),actions,notice:'取得したページの内容に基づく参考評価です。AIに引用された回数や検索順位を測定したものではありません。'};
}

export function classifyPurpose(url='',title=''){
 let path='';try{path=new URL(url).pathname.toLowerCase();}catch{}
 const name=String(title).split(/[｜|]/)[0];
 if(/faq|question|よくある質問/i.test(path+' '+name))return 'faq';
 if(/privacy|terms|policy|プライバシー|利用規約/i.test(path+' '+name))return 'policy';
 if(/contact|inquiry|お問い合わせ/i.test(path+' '+name))return 'contact';
 if(/company|about|corporate|profile|会社概要|企業情報/i.test(path+' '+name))return 'corporate';
 if(/case|works|result|事例|実績/i.test(path+' '+name))return 'proof';
 if(/news|blog|column|article|お知らせ/i.test(path+' '+name))return 'article';
 if(/service|product|solution|business|item|商品|サービス/i.test(path+' '+name))return 'service';
 if(path==='/'||/^\/index\.(?:html?|php)$/.test(path))return 'home';
 return 'unclassified';
}
function checkApplies(id,doc){
 const kind=doc.details?.pageKind&&doc.details.pageKind!=='unclassified'?doc.details.pageKind:classifyPurpose(doc.url,doc.details?.title);
 const limited={entity:['home','corporate'],definition:['home','corporate','service'],theme:['home','corporate','service'],contact:['home','corporate','contact'],author:['article','proof'],evidence:['article','proof','service'],primary:['article','proof','service'],sourceLink:['article','proof'],conditions:['service','faq','proof'],faq:['faq','service'],answer:['service','faq','article','proof']};
 return !limited[id]||limited[id].includes(kind);
}
export function plainAdvice(id){
 const map={
  entity:['会社情報をAIに伝える設定','トップページか会社概要に、正式な会社名・公式サイト・所在地を機械向けの会社情報として追加してください。画面の会社概要と同じ内容にします。設定作業は制作担当者へ依頼してください。'],
  definition:['会社・商品が何かを伝える説明','ページ冒頭に「誰に、どんな商品やサービスを提供しているか」を1〜2文で追加してください。社名や商品名だけで終わらせず、特徴や用途を具体的に書きます。'],
  theme:['商品・サービスの説明','対象のお客様、提供する内容、対応範囲を冒頭にまとめてください。関連商品の詳しい説明へ進めるリンクも付けます。'],
  html:['見出しの整理','ページ全体の題名を大見出しにし、その下を「商品について」「選び方」「購入方法」など内容ごとの見出しで分けてください。タグの設定は制作担当者が確認します。'],
  hierarchy:['見出しの順番','大見出しの下に小見出しを順番に置き、途中の階層を飛ばさないよう制作担当者に調整を依頼してください。'],
  semantic:['本文の範囲','メニューと本文を区別できるよう、本文の範囲を示す設定を制作担当者に確認してください。'],
  canonical:['ページの代表URL','同じ内容の別URLがある場合、どれを正式なページとするかを決め、代表URLの設定を制作担当者へ依頼してください。'],
  links:['関連ページへの案内','このページに関係する商品の説明、購入方法、よくある質問へリンクを付けてください。「こちら」だけでなく、リンク先の内容が分かる名前にします。'],
  jsonld:['検索サービス向けの情報設定','制作担当者に、ページの内容を検索サービスへ伝える設定を確認してもらってください。会社紹介には会社情報、商品ページには実際に表示している商品情報を登録し、入力エラーや画面との食い違いがないか確認します。'],
  faq:['質問への答え方','配送、支払い、保存方法、利用条件など実際によく聞かれる質問に、最初の1文で答えてください。その後に条件や例外を補足します。'],
  fanout:['質問候補の整理','実際の問い合わせを集め、「どんなものか」「どう選ぶか」「費用や条件」「利用方法」に分け、答えが必要なページを決めてください。'],
  contact:['運営会社と連絡先','会社概要またはお問い合わせページに、正式な会社名・所在地・問い合わせ方法をまとめてください。商品ページすべてに重ねて掲載する必要はありません。'],
  author:['記事の執筆・確認担当','専門的な解説記事には、執筆者や確認担当者と、その人の経験・担当分野を明記してください。'],
  evidence:['実績や説明を裏付ける情報','商品やサービスの特徴を説明する箇所に、確認できる実績・具体例・調査結果を加えてください。数値を載せる場合は、対象と時期も併記します。'],
  primary:['自社だから出せる情報','開発の工夫、実際の利用例、担当者の説明など、自社で確認できる情報を追加してください。実績や数値を推測で作らないようにします。'],
  sourceLink:['説明の出典','外部の調査や資料を根拠に説明している箇所には、参照した資料名とリンクを付けてください。外部の主張を使っていないページへの一律追加は不要です。'],
  conditions:['適用条件の説明','商品・サービスの説明や回答の近くに、対象、利用条件、除外事項を記載してください。説明だけが切り出されても誤解されないようにします。'],
  answer:['要点を先に伝える文章','最初に答えや要点を書き、その後に理由、条件、具体例を続けてください。比較は表、手順は番号付きの一覧にすると読み取りやすくなります。'],
  rewrite:['本文の見直し','主な商品やサービスの説明を選び、「要点→理由→条件」の順に並べ直してください。実際の原文を使った下書きは、改善プレビューで確認できます。'],
  visibility:['改善後の確認','ヒット測定で同じ質問を使い、実際のAI回答に会社名やサイトが出るかを記録してください。今回のページ診断では引用実績は未測定です。'],
  directory:['ページの分類','商品、サービス、質問などのページを分類し、同じ内容のページが重複していないか確認してください。'],
  cluster:['関連情報のつながり','中心となる説明ページから、選び方・使い方・よくある質問へ案内するリンクを付けてください。'],
  crawler:['ページ取得の設定','制作担当者に、公開ページを外部から取得できる設定か確認してもらってください。'],
  performance:['表示速度','表示速度は今回測定していません。実際の端末や速度測定ツールで確認してください。']
 };
 const [label,how]=map[id]||['掲載情報の確認','掲載内容と実際の事実が一致するかを担当者が確認してください。'];
 return {label,how};
}
export function formatRecommendation(check){
 const advice=plainAdvice(check.id);
 if(check.state==='unknown')return `確認待ち：${advice.label}。${check.id==='jsonld'||check.id==='html'||check.id==='entity'?'元のHTMLを確認できていないため、不足とは判定していません。':''}${advice.how}`;
 const target=check.pages?.find(p=>p.state==='not_observed');
 return `${advice.label}：${advice.how}${check.checked>1?`（この確認に適した${check.checked}ページのうち、${check.checked-check.matched}ページで記載・設定を確認できませんでした）`:''}${target?`\n対象ページ：\n${target.url}\n`:''}`;
}

// Recommend changes only from attributable observations. Optional settings and
// unsupported content assumptions stay out of the "fix first" list.
export function buildSpecificRecommendations(documents=[]){
 const rank={home:0,corporate:1,service:2,faq:3,contact:4,article:5,proof:5,unclassified:6,policy:7};
 const docs=[...documents].sort((a,b)=>(rank[a.details?.pageKind]??6)-(rank[b.details?.pageKind]??6));
 const out=[];
 const add=(key,state,priority,title,evidence,change,verify,pages=[],related=[])=>out.push({key,state,priority,title,evidence,change,verify,pages:pages.map(d=>d.url),related:related.map(d=>d.url)});
 const html=docs.filter(d=>d.native&&Array.isArray(d.details?.h1Texts));
 const noH1=html.filter(d=>d.details.h1Texts.length===0);
 if(noH1.length)add('structure','fix',9,'ページの主題を見出しで示す',`取得したHTMLで、主題を示すH1見出しが0個のページを${noH1.length}件確認しました。`,'対象ページの題名を主見出しに設定してください。画像の題名がある場合は、同じ意味が文字や代替テキストでも伝わるよう制作担当者と確認します。','HTMLのH1と画面の題名が一致しているか確認する。',noH1);
 const jumps=html.filter(d=>d.details.h1Texts.length>0&&d.details.headingJumps?.length);
 if(jumps.length)add('structure','fix',7,'飛んでいる見出しの階層をつなぐ',`${jumps.length}ページで見出しが途中の階層を飛ばしています。最初の対象では${jumps[0].details.headingJumps[0]}を確認しました。`,'見出しの文章は残し、上位・下位の関係に合わせて階層を調整してください。見た目の文字サイズだけを理由に見出しレベルを選ばないようにします。','対象の見出しが上から順に追えるか確認する。',jumps);
 const multiple=html.filter(d=>d.details.h1Texts.length>1);
 if(multiple.length)add('structure','review',2,'複数の主見出しの役割を確認する',`最初の対象でH1を${multiple[0].details.h1Texts.length}個確認しました。複数あることだけで不正とは判定しません。`,'主題が複数に分かれて見えないか確認し、必要な場合だけ見出しを整理してください。','ページの主題と各見出しの役割を編集担当者が確認する。',multiple);
 const duplicate=html.filter(d=>d.details.canonicalCount>1);
 if(duplicate.length)add('structure','fix',8,'重複した代表URL指定を整理する',`${duplicate.length}ページに代表URLの指定が複数あります。`,'テンプレートとプラグインの両方から出ていないかを調べ、正式なURLの指定を1つに統一してください。','公開HTMLに代表URLの指定が1件だけ出ることを確認する。',duplicate);
 const badJson=docs.filter(d=>d.jsonld?.invalid>0);
 if(badJson.length)add('schema','fix',10,'読み取れない構造化データを修正する',`${badJson.length}ページのJSON-LDでJSONの構文エラーを確認しました。最初の対象では${badJson[0].jsonld.invalid}件です。`,'制作担当者に該当スクリプトの括弧・引用符・カンマを修正してもらってください。会社や商品の新しいデータを増やす前に、現在の設定を読み取れる状態にします。','再診断で構文エラーが0件になり、構造化データの型を読み取れるか確認する。',badJson);
 const structured=docs.filter(d=>d.jsonld&&(d.jsonld.types.length||d.jsonld.alternativeMarkup));
 if(!badJson.length&&structured.length)add('schema','observed',0,'既存の情報設定を確認できました',`${structured.length}ページに構造化データ、または別形式の情報指定があります。`,'JSON-LDがないという理由だけで別形式の設定を追加・重複させる必要はありません。表示内容と設定の一致を確認してください。','既存設定が会社・商品などの表示内容と一致するか、外部の検証ツールでも確認する。',structured);
 if(!badJson.length&&!structured.length){const inspectable=docs.filter(d=>d.jsonld);add('schema','review',1,'構造化データの導入を検討する',inspectable.length?`取得したHTML${inspectable.length}ページではJSON-LDの型や別形式の情報指定を確認できませんでした。`:'元のHTMLを取得できず、構造化データは未測定です。','会社紹介や商品情報を検索サービスへ明示する必要があるか、制作担当者と判断してください。未設置だけでページの誤りやAI引用の不利益とは断定しません。','導入する場合は、画面上の事実と一致し、既存設定と重複しないことを確認する。',inspectable.slice(0,1));}
 const core=docs.filter(d=>['home','corporate','service'].includes(d.details?.pageKind));
 const described=core.filter(d=>d.details.descriptionEvidence);
 if(described.length){const d=described[0];add('entity','observed',0,'会社・ブランドの説明は既にあります',`${d.details.descriptionEvidence.location}に「${d.details.descriptionEvidence.text.slice(0,160)}」という説明を確認しました。`,'同じ定義文を全ページに追加する必要はありません。事業や商品の説明が変わる場合だけ、この記述と関連ページの名称を揃えてください。','会社名・ブランド名と提供内容が矛盾していないか確認する。',[d]);}
 else if(core.length)add('entity','review',3,'主な事業や商品の説明を確認する','トップ・会社概要・商品説明の取得範囲で、対象と提供内容が一緒に分かる短い説明を特定できませんでした。','既に画像や別のページで説明している場合は、その案内を確認してください。説明が不足している場合だけ、冒頭に事業・商品の種類と特徴を1〜2文で補います。','新しい説明が既存の会社概要や実際の商品と一致するか確認する。',core.slice(0,1));
 const contacts=docs.filter(d=>d.signals?.contact&&['home','corporate','contact'].includes(d.details?.pageKind));
 const home=docs.find(d=>d.details?.pageKind==='home');
 if(contacts.length){
  add('trust','observed',0,'運営者情報の掲載を確認できました','取得した会社案内・お問い合わせ等に、所在地と連絡方法の記載があります。','既にある情報を全ページへ複製する必要はありません。正式な会社名と現状の連絡先が一致するか確認してください。','掲載先の名称・所在地・連絡先が最新か確認する。',contacts.slice(0,1));
  if(home?.links){const reached=new Set([home.url,...home.links]);docs.filter(d=>reached.has(d.url)).forEach(d=>(d.links||[]).forEach(u=>reached.add(u)));if(!contacts.some(d=>reached.has(d.url)))add('trust','fix',6,'既存の会社案内への導線を作る','会社情報は取得できましたが、トップから2段階以内の取得リンクでは、その掲載先に到達できませんでした。','会社情報を新しく作り直さず、既存の掲載先をトップや案内メニューから見つけられるようにしてください。','トップからリンクをたどって会社情報へ到達できるか確認する。',[home],contacts.slice(0,1));}
 }else if(docs.length)add('trust','review',1,'会社案内の掲載先を確認する','取得した会社案内・お問い合わせ等では、所在地と連絡方法の組み合わせを確認できませんでした。','未取得ページに既に掲載されていれば追加は不要です。既存の掲載先と導線を確認し、本当に不足している場合だけ会社概要へ補ってください。','会社情報の掲載先と、そこへ進めるリンクを確認する。',core.slice(0,1));
 const faqs=docs.filter(d=>d.details?.pageKind==='faq');
 const unanswered=faqs.filter(d=>d.details.faqPairs?.some(p=>!p.answer));
 if(unanswered.length){const pair=unanswered[0].details.faqPairs.find(p=>!p.answer);add('faq','fix',8,'回答本文が空の質問を補う',`質問「${pair.question.slice(0,100)}」の直後の回答欄で、読み取れる文字を確認できませんでした。`,'画像だけで答えている場合も、答えの要点を短い文章で併記してください。別ページに答えがある場合は、その説明へのリンクを追加します。','質問の直後に回答または回答先への案内が読み取れるか再確認する。',unanswered);}

 if(!unanswered.length&&faqs.length)add('faq','review',1,'既存のFAQの回答内容を見直す',`取得範囲にFAQページが${faqs.length}件あります。質問・回答の正しさや網羅性は自動判定していません。`,'新しいFAQページを増やす前に、実際の問い合わせと照らし合わせ、答えが不足する質問だけ補ってください。既に別ページに詳しい説明があれば、その掲載先へ案内します。','問い合わせで多い質問に回答でき、回答先の条件と一致しているか確認する。',faqs.slice(0,1));
 else if(!faqs.length)add('faq','review',1,'質問への回答が必要な場所を決める','今回の取得範囲では独立したFAQページを特定できませんでした。FAQが必須という判定ではありません。','実際によく受ける質問がある場合に、商品・サービスの説明へ回答を追加するか、既存の案内ページを使うかを選んでください。','問い合わせ内容をもとに必要性を確認する。');
 add('citation','review',1,'主な説明文から改善対象を選ぶ','結論が先に書かれているか、根拠が適切かは、語句や箇条書きの有無だけでは判断できません。','主な商品・サービスの説明文を1つ選び、要点・根拠・条件が分かれるよう見直してください。改善プレビューの原文案を出発点に、担当者が文脈を確認します。','元の事実・数値・適用条件を変えていないか確認する。',docs.filter(d=>d.details?.pageKind==='service').slice(0,1));
 return out;
}
function formatSpecific(item){
 const state=item.state==='fix'?'修正':item.state==='review'?'確認・検討':'確認できたこと';
 return `${state}：${item.title}\n理由：${item.evidence}\n対応：${item.change}\n確認方法：${item.verify}${item.pages.length?`\n対象ページ：\n${item.pages.slice(0,2).join('\n')}\n`:''}${item.related.length?`\n既存の掲載先：\n${item.related.join('\n')}\n`:''}`;
}
function applySpecificRecommendations(categories,items){
 const result=Object.fromEntries(Object.entries(categories).map(([key,value])=>{
  const relevant=items.filter(x=>x.key===key).sort((a,b)=>b.priority-a.priority);
  const findings=relevant.slice(0,2).map(formatSpecific);
  if(!findings.length)findings.push('この項目では、取得した情報から具体的な修正を特定できませんでした。未確認の内容を不足とは判定していません。');
  return [key,{...value,findings}];
 }));
 const fixes=items.filter(x=>x.state==='fix').sort((a,b)=>b.priority-a.priority);
 const actions=fixes.slice(0,3).map(formatSpecific);
 if(!actions.length)actions.push('今回の自動確認では、優先して直すべき具体的な不備を特定できませんでした。「確認・検討」の内容は担当者が必要性を判断してください。');
 return {categories:result,actions,notice:'「修正」は取得した情報で確認できた問題、「確認・検討」は必要性の判断が残る内容です。未取得ページの有無や、AI引用・検索順位への効果は測定していません。'};
}

export function buildQuestionPlan(docs=[]){
 const useful=s=>typeof s==='string'&&s.length>=2&&s.length<=60&&!/^(ホーム|TOP|HOME|会社概要|企業情報|お問い合わせ|サービス|事業内容|概要|条件|特徴|料金|詳細|ご案内|メニュー)$/i.test(s)&&!/^https?:/i.test(s);
 const ranked=[...docs].sort((a,b)=>(b.details?.pageKind==='service'?1:0)-(a.details?.pageKind==='service'?1:0));
 const candidates=ranked.flatMap(d=>(d.details?.headingsText||[]).map(topic=>({topic,url:d.url}))).concat(ranked.flatMap(d=>(d.details?.topics||[]).map(topic=>({topic,url:d.url}))));
 const selected=candidates.find(x=>useful(x.topic))||ranked.map(d=>({topic:d.details?.title?.split(/[｜|]/)[0]?.trim(),url:d.url})).find(x=>useful(x.topic));
 const topic=selected?.topic||'対象サービス';
 const questions=[`${topic}とは何か、どんな課題に対応するか？`,`${topic}を他の選択肢と比較する基準は？`,`${topic}の費用と適用条件は？`,`${topic}の導入手順と必要な準備は？`,`${topic}の実績や成果を確認できる根拠は？`];
 const linkable=ranked.filter(d=>d.links!==null&&Array.isArray(d.links));
 return {measured:false,topic:topic==='対象サービス'?null:topic,sourceUrl:selected?.url||null,questions,instruction:'取得した見出し・題名から作った編集用候補です。実際のAIサブクエリや検索需要は未測定です。',cluster:{hub:selected?.url||null,spokes:ranked.filter(d=>d.url!==selected?.url).slice(0,5).map(d=>({url:d.url,title:d.details?.title||d.url,linkedFromHub:linkable.find(p=>p.url===selected?.url)?.links.includes(d.url)??null})),note:'中心・補足ページの候補です。リンク有無のみ確認し、話題の関連性は手動確認が必要です。'}};
}

export function enrichPageResults(pages=[],audit){
 if(Array.isArray(audit?.recommendations))return pages.map(page=>{const relevant=audit.recommendations.filter(x=>x.pages.includes(page.url)&&x.state!=='observed').sort((a,b)=>b.priority-a.priority);return {...page,issues:relevant.slice(0,4).map(formatSpecific)};});
 const checks=[...(audit?.items||[]),...(audit?.supplemental||[])];
 return pages.map(page=>{
  const missing=checks.filter(x=>x.pages?.some(p=>p.url===page.url&&p.state==='not_observed')).sort((a,b)=>b.priority-a.priority);
  const unknown=checks.filter(x=>x.pages?.some(p=>p.url===page.url&&p.state==='unknown'));
  const issues=missing.slice(0,4).map(x=>`${plainAdvice(x.id).label}：${plainAdvice(x.id).how}`);
  if(unknown.length)issues.push(`未測定・要確認：${unknown.slice(0,2).map(x=>plainAdvice(x.id).label).join('、')}。取得できなかった情報は、不足とは判定していません。`);
  return {...page,issues:issues.length?issues:(page.issues||[])};
 });
}

export function buildRewriteDraft(text='',kind='service'){
 const sentences=documentText(text).split(/(?<=[。！？!?])/).map(s=>s.trim()).filter(s=>s.length>=6&&s.length<=350&&!/^https?:/i.test(s));
 const match={company:/会社|事業|企業|提供/,service:/提供|サービス|対応|支援|製品/,proof:/実績|事例|調査|結果|導入/,faq:/料金|費用|期間|条件|対応|方法/}[kind]||/サービス|提供/;
 const first=sentences.find(s=>match.test(s))||sentences[0];
 if(!first)return '編集案（未完成）：取得文に十分な説明文がありません。「対象・提供内容・根拠・適用条件」を担当者が事実確認して記入してください。';
 const second=sentences.find(s=>s!==first&&/実績|事例|調査|条件|対象|対応|\d/.test(s));
 return `冒頭に置く候補（原文）：${first}${second?`\n補足に置く候補（原文）：${second}`:''}\n編集時の確認：対象・根拠・適用条件を確認し、不明な事実は補わず追記してください。原文の並べ替え案であり、内容の正確性やAI引用効果は未検証です。`;
}
