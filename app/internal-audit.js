// Observable document signals only. No inference of AI visibility or business outcomes.
export function inspectDocument({html='',text='',url='',source='direct'}) {
 const native=source==='direct'&&Boolean(html);
 const visible=String(text).replace(/\s+/g,' ').trim();
 const strip=value=>value.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
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
 const headingJump=headingLevels.some((level,i)=>i>0&&level>headingLevels[i-1]+1);
 const primaryKinds=[['survey',/自社調査|当社調査|アンケート/],['expert',/専門家|監修|考察/],['experiment',/実験|検証結果|テスト結果/],['case',/導入事例|事例紹介|ケーススタディ/]].filter(([,re])=>re.test(visible)).map(([key])=>key);
 const path=(()=>{try{return new URL(url).pathname;}catch{return '';}})();
 const pageKind=/\/(?:company|about|corporate|profile)(?:\/|$)/i.test(path)?'corporate':/\/(?:service|product|solution)(?:\/|$)/i.test(path)?'service':'unclassified';
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].filter(m=>/\btype\s*=\s*["']application\/ld\+json["']/i.test(m[1]));
 const nodes=[];let invalid=0;
 function walk(v){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object'){if(v['@type'])nodes.push(v);if(v['@graph'])walk(v['@graph']);}}
 for(const m of scripts){try{walk(JSON.parse(m[2]));}catch{invalid++;}}
 const types=[...new Set(nodes.flatMap(n=>[n['@type']].flat()))];
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
  definition:definitions.length>0,
  semantic:native?/<main\b/i.test(body)&&/<(?:article|section)\b/i.test(body):null,
  hierarchy:native?headingLevels.length>0&&!headingJump:null,
  canonical:native?canonicalTags.length===1&&canonicals.length===1:null,
  sourceLink:native?externalSources.length>0:null,
  conditions:/対象|条件|前提|調査期間|集計期間|除外|適用範囲/.test(visible),
  primary:primaryKinds.length>0
 },details:{definitionExamples:definitions.slice(0,2).map(p=>p.slice(0,180)),externalSources:[...new Set(externalSources)].slice(0,5),canonicals,primaryKinds,pageKind},jsonld:native?{scripts:scripts.length,invalid,types,organizations}:null,links:native?[...new Set(links)]:null};
}

export function buildInternalAudit(documents=[]) {
 const docs=documents.map(d=>d.internalEvidence||inspectDocument(d));
 let rows=[];
 const add=(id,group,title,signal,advice,impact=2,effort=2)=>{
  const eligible=signal?docs.filter(d=>signal(d)!==null&&signal(d)!==undefined):[];
  const hits=eligible.filter(d=>signal(d));
  const state=!eligible.length?'unknown':hits.length?'observed':'not_observed';
  rows.push({id,group,title,state,method:eligible.length?'document_signal':'manual_review',checked:eligible.length,matched:hits.length,evidence:hits.slice(0,5).map(d=>d.url),advice,impact,effort,priority:state==='not_observed'?impact*3-effort:state==='unknown'?1:0});
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
 const priorities=[...items,...supplemental].filter(x=>x.state!=='observed').sort((a,b)=>b.priority-a.priority);
 return {version:2,scope:'取得できた代表ページのみ。未検出はサイト全体での不存在を意味しません。検出は品質・正確性・AI引用の保証ではありません。',items,supplemental,priorities,jsonld:docs.filter(d=>d.jsonld).map(d=>({url:d.url,...d.jsonld})),pageGuidance:docs.filter(d=>d.details).map(d=>({url:d.url,...d.details,instruction:d.details.pageKind==='corporate'?'運営主体・事業領域・沿革・実績の関係を明確にし、公式名称と定義を揃える。':d.details.pageKind==='service'?'対象顧客の課題、解決内容、比較条件、費用、根拠を同じ文脈で説明する。':'URLから用途を分類できません。企業紹介かサービス説明かを担当者が選び、ページの目的を明確にする。'})),measurementPlan:{state:'unmeasured',note:'以下は計測計画です。HTML診断からブランド想起・流入・商談成果は算出していません。',metrics:[{name:'AIの言及・引用',method:'質問セット・モデル・実行日時を固定して既存ヒット測定で回答と出典を記録する。'},{name:'AI経由の流入',method:'GA4等で参照元・期間・計測条件を定義する。解析アカウントとの連携は未実装。'},{name:'問い合わせ・商談',method:'イベントと成約の定義を担当者と決める。流入元との関連付けと成果計測は未実装。'}],review:'実装前の基準値と改修履歴を保存し、同じ条件で再確認する。CMS・テンプレート・権限・担当者を決めてから改修する。'},planning:{measured:false,questions:['どのようなサービスか','他の選択肢と何が違うか','費用と契約条件は何か','導入までに何が必要か','成果をどう検証できるか'],instruction:'質問候補のひな型です。実際のAIサブクエリは未観測です。中心ページ→各質問の解説→根拠や事例を対応付けてください。'}};
}

// Fit the research-derived checks into the original six cards and action list.
// Keep the original page/report layout and score scale; never score manual checks.
export function applyAuditKnowledge(categories={},audit){
 const groups={
  entity:['entity','definition','theme'],
  structure:['html','hierarchy','semantic','links','canonical','directory','cluster','crawler','performance'],
  schema:['jsonld'],faq:['faq','fanout'],
  trust:['contact','author','evidence','primary','sourceLink','conditions','ownership','review'],
  citation:['answer','rewrite','visibility','priority']
 };
 const checks=[...(audit?.items||[]),...(audit?.supplemental||[])];
 const categoryEntries=Object.entries(categories).map(([key,value])=>{
  const rows=(groups[key]||[]).map(id=>checks.find(x=>x.id===id)).filter(Boolean);
  if(!rows.length)return [key,value];
  const pending=rows.filter(x=>x.state==='not_observed').sort((a,b)=>b.priority-a.priority);
  const manual=rows.filter(x=>x.state==='unknown');
  const observed=rows.filter(x=>x.state==='observed');
  const findings=pending.slice(0,2).map(x=>`取得${x.checked}ページでは「${x.title}」の手掛かりを検出できませんでした。${x.advice}`);
  if(!findings.length&&observed.length){const x=observed[0];findings.push(`「${x.title}」の手掛かりを${x.matched}/${x.checked}ページで検出しました。品質や正確性の確認は別途必要です。${x.advice}`);}
  if(manual.length){const x=manual[0];findings.push(`未測定・要確認：${x.title}。${x.advice}`);}
  else findings.push('取得できた代表ページ内の確認です。サイト全体での有無やAIによる引用実績を示すものではありません。');
  return [key,{...value,findings:findings.slice(0,3)}];
 });
 const ordered=audit?.priorities||[];
 const detected=ordered.filter(x=>x.state==='not_observed');
 const manual=ordered.filter(x=>x.state==='unknown');
 const selected=[...detected.slice(0,3),...(manual.length?[manual.find(x=>x.id==='fanout')||manual[0]]:[])];
 const actions=selected.length?selected.map(x=>`${x.state==='unknown'?'要確認（未測定）':'取得範囲で未検出'}：${x.advice}`):['検出済みの記載と画面・実際の事実との一致を確認し、同じ条件で継続診断する'];
 return {categories:Object.fromEntries(categoryEntries),actions,notice:'スコアは取得文書の参考評価です。AIでの順位・引用率・流入、速度や社内運用の実測値ではありません。'};
}
