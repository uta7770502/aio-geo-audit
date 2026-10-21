const states={observed:'記載・構造の手掛かりあり',not_observed:'取得範囲では未検出',unknown:'未測定・要手動確認'};
function Check({item:x}){
 return <article><h4>{x.title} — {states[x.state]}</h4><p>{x.advice}</p><small>確認対象 {x.checked}ページ / 検出 {x.matched}ページ</small>{x.evidence.length>0&&<ul>{x.evidence.map(url=><li key={url}><a href={url}>{url}</a></li>)}</ul>}</article>;
}
export default function InternalAudit({audit}){
 if(!audit)return null;
 return <section className="internalAudit pdfSection">
  <h2>内部対策20項目</h2><p>{audit.scope}</p>
  <p>従来の6カテゴリの点数は参考指標です。AIでの順位・引用率・権威性の実測値ではありません。以下の項目は点数へ加算していません。</p>
  {['コンテンツ','技術','サイト構造','信頼性','運用'].map(group=><div key={group}><h3>{group}</h3>{audit.items.filter(x=>x.group===group).map(x=><Check key={x.id} item={x}/>)}</div>)}
  {audit.supplemental?.length>0&&<div><h3>意味・根拠・公開HTMLの追加確認</h3>{audit.supplemental.map(x=><Check key={x.id} item={x}/>)}</div>}
  <h3>改善・確認の優先候補</h3><p>未検出の項目を影響度×3−工数の目安で並べています。未測定項目は確認待ちです。引用増加の予測値ではありません。</p>
  <ol>{audit.priorities.map(x=><li key={x.id}>{x.title}（{states[x.state]}）</li>)}</ol>
  <h3>質問展開・トピック構成の下書き</h3><p>{audit.planning.instruction}</p><ul>{audit.planning.questions.map(q=><li key={q}>{q}</li>)}</ul>
  {audit.pageGuidance?.length>0&&<div><h3>ページの目的に応じた編集案</h3><p>用途はURLの文字列による仮分類です。正しい分類・名称と定義の一貫性・文脈のつながりは担当者が確認してください。</p>{audit.pageGuidance.map(x=><article key={x.url}><h4>{x.pageKind==='corporate'?'企業紹介':x.pageKind==='service'?'サービス説明':'用途の確認が必要'}</h4><p>{x.url}</p><p>{x.instruction}</p>{x.definitionExamples.length>0&&<div><b>定義に近い記述の抜粋（正確性は未確認）</b>{x.definitionExamples.map((p,i)=><p key={i}>{p}</p>)}</div>}{x.canonicals.length>0&&<p>代表URL指定：{x.canonicals.join('、')}</p>}{x.primaryKinds.length>0&&<p>根拠の種類の手掛かり：{x.primaryKinds.map(k=>({survey:'調査',expert:'見解',experiment:'検証',case:'事例'})[k]).join('、')}（一次性は未確認）</p>}</article>)}</div>}
  <h3>JSON-LD解析結果</h3>{audit.jsonld.length?audit.jsonld.map(x=><article key={x.url}><p>{x.url}</p><p>スクリプト {x.scripts}件 / 構文エラー {x.invalid}件 / 型：{x.types.join('、')||'未検出'}</p></article>):<p>元のHTMLを確認できず、判定を保留しています。</p>}
  {audit.measurementPlan&&<div><h3>効果を確認するための計測計画</h3><p>{audit.measurementPlan.note}</p><ul>{audit.measurementPlan.metrics.map(x=><li key={x.name}><b>{x.name}（未測定）</b>：{x.method}</li>)}</ul><p>{audit.measurementPlan.review}</p></div>}
 </section>;
}

