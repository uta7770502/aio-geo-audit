// Observable document signals only. No inference of AI visibility or business outcomes.
export function inspectDocument({html='',text='',url='',source='direct'}) {
 const native=source==='direct'&&Boolean(html);
 const visible=String(text).replace(/\s+/g,' ').trim();
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
  service:/サービス|事業|提供|製品/.test(visible)
 },jsonld:native?{scripts:scripts.length,invalid,types,organizations}:null,links:native?[...new Set(links)]:null};
}

export function buildInternalAudit(documents=[]) {
 const docs=documents.map(d=>d.internalEvidence||inspectDocument(d));
 const rows=[];
 const add=(id,group,title,signal,advice,impact=2,effort=2)=>{
  const eligible=signal?docs.filter(d=>signal(d)!==null):[];
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
 return {version:1,scope:'取得できた代表ページのみ。未検出はサイト全体での不存在を意味しません。検出は品質・正確性・AI引用の保証ではありません。',items:rows,priorities:rows.filter(x=>x.state!=='observed').sort((a,b)=>b.priority-a.priority),jsonld:docs.filter(d=>d.jsonld).map(d=>({url:d.url,...d.jsonld})),planning:{measured:false,questions:['どのようなサービスか','他の選択肢と何が違うか','費用と契約条件は何か','導入までに何が必要か','成果をどう検証できるか'],instruction:'質問候補のひな型です。実際のAIサブクエリは未観測です。中心ページ→各質問の解説→根拠や事例を対応付けてください。'}};
}

