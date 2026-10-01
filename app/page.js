'use client';
import {useState} from 'react';
import './style.css';
const labels={entity:'企業・サービス理解',structure:'情報構造',schema:'構造化データ',faq:'FAQ/回答性',trust:'信頼情報',citation:'引用されやすさ'};
function status(score){return score>=80?'良好':score>=60?'改善余地':'要改善'}
export default function Page(){
 const [url,setUrl]=useState(''); const [loading,setLoading]=useState(false); const [r,setR]=useState(null); const [err,setErr]=useState(''); const [code,setCode]=useState(null);
 async function analyze(){
  setLoading(true);setErr('');setR(null);
  let stage='start';
  try{
   stage='endpoint';
   const endpoint=window.location.origin+'/api/analyze';
   stage='fetch';
   const payload=JSON.stringify({url:String(url||'').trim()});
   let res=null;
   let lastFetchError=null;
   for(let attempt=0;attempt<2;attempt++){
    try{
     res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:payload,cache:'no-store'});
     break;
    }catch(e){
     lastFetchError=e;
     if(attempt===0)await new Promise(resolve=>setTimeout(resolve,900));
    }
   }
   if(!res)throw new Error('診断サーバーとの通信に失敗しました。通信状態を確認して、もう一度「無料診断する」を押してください。');
   stage='read-body';
   const raw=await res.text();
   stage='parse-json';
   let data={}; try{data=JSON.parse(raw)}catch{throw new Error('API response was not JSON: '+raw.slice(0,160))}
   stage='status-check';
   if(!res.ok)throw new Error(data.error||'診断に失敗しました');
   stage='render';
   setR(data);
  }catch(e){
   setErr('['+stage+'] '+(e?.message||String(e)));
  }finally{setLoading(false)}
 }
 function makeCode(item){
  const host=(()=>{try{return new URL(r?.url||url).hostname}catch{return 'example.com'}})();
  const company=r?.title||host;
  let value='';
  if(item.key==='schema') value=`<script type="application/ld+json">\n${JSON.stringify({"@context":"https://schema.org","@type":"Organization","name":company,"url":r?.url||url,"description":"ここに企業・サービスの説明を入力してください"},null,2)}\n</script>`;
  else if(item.key==='faq') value=`<section class="faq">\n  <h2>よくある質問</h2>\n  <h3>サービスの特徴は？</h3>\n  <p>結論を最初に、具体的な根拠とともに回答します。</p>\n</section>\n\n<!-- FAQPageのJSON-LDも同じ質問・回答内容で実装してください -->`;
  else if(item.key==='crawlability') value=`# robots.txt 例\nUser-agent: *\nAllow: /\n\n# AIクローラをWAFやBot対策で遮断していないかも確認してください\nSitemap: https://${host}/sitemap.xml`;
  else if(item.key==='entity') value=`<title>${company}｜サービス内容が一目で分かるタイトル</title>\n<meta name="description" content="誰向けに、何を提供し、どんな価値があるサービスかを具体的に記載します。">\n<h1>${company}は〇〇を提供するサービスです</h1>\n<p>対象ユーザーと提供価値を1〜2文で明確に説明します。</p>`;
  else if(item.key==='structure') value=`<main>\n  <h1>ページの主題</h1>\n  <section><h2>サービス概要</h2><p>...</p></section>\n  <section><h2>選ばれる理由</h2><p>...</p></section>\n  <section><h2>料金・利用方法</h2><p>...</p></section>\n  <section><h2>よくある質問</h2><p>...</p></section>\n</main>`;
  else if(item.key==='trust') value=`<section class="company-trust">\n  <h2>運営会社・信頼情報</h2>\n  <dl><dt>会社名</dt><dd>${company}</dd><dt>所在地</dt><dd>正式な所在地</dd><dt>連絡先</dt><dd>問い合わせ先</dd><dt>更新日</dt><dd>YYYY-MM-DD</dd></dl>\n</section>`;
  else value=`<section>\n  <h2>AIが引用しやすい一次情報</h2>\n  <p><strong>結論：</strong>サービスの特徴を短い一文で明示します。</p>\n  <ul><li>具体的な数値・実績</li><li>比較可能な条件</li><li>一次情報の出典</li></ul>\n</section>`;
  setCode({title:item.title,value});
 }
 function pdf(){
  if(!r)return;
  try{
   sessionStorage.setItem('aioGeoReport',JSON.stringify(r));
   window.location.href='/report';
  }catch(e){
   setErr('PDFレポートを開けませんでした。もう一度診断してからお試しください。');
  }
 }

 return <main><section className="hero"><div className="eyebrow">AIO / GEO AUDIT</div><h1>URLを入れるだけで<br/>AI検索に強いサイトか診断。</h1><p>企業・サービス理解、構造化データ、FAQ、信頼性、引用されやすさを自動評価し、改善優先度まで提示します。</p><div className="form"><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com"/><button onClick={analyze} disabled={loading||!url}>{loading?'診断中…':'無料診断する'}</button></div>{err&&<div className="error">{err}</div>}<div className="note">MVP版：公開URLを最大5ページ解析。目安30秒〜数分。</div></section>{r&&<section className="report"><div className="top"><div><div className="eyebrow">RESULT</div><h2>{r.title||r.url}</h2><p>{r.summary}</p>{r.summarySimple&&<div className="simpleFollow"><strong>かんたんに言うと</strong><p>{r.summarySimple}</p></div>}</div><div className="scoreWrap"><div className="scoreLabel">総合AIO/GEOスコア<small>AI検索への対応度</small></div><div className="score"><strong>{r.score}</strong><span>/100</span></div></div></div><div className="grid">{Object.entries(r.categories).map(([k,v])=>{const g=r.clientGuide?.[k];return <article key={k}><div className="row"><h3>{labels[k]||k}</h3><b>{v.score}</b></div><div className="bar"><i style={{width:`${v.score}%`}}/></div><small>{status(v.score)}</small>{g&&<><p className="plain">{g.plain}</p><p className="why"><strong>なぜ重要？</strong> {g.why}</p><div className="ba"><div><em>BEFORE</em><p>{g.siteBefore||g.before}</p></div><div><em>AFTER</em><p>{g.siteAfter||g.after}</p></div></div></>}{g?.simple&&<div className="simpleFollow mini"><strong>かんたんに言うと</strong><p>{g.simple}</p></div>}<h4 className="diagnosis">このサイトへの改善提案</h4><ul>{v.findings.slice(0,3).map((x,i)=><li key={i}>{x}</li>)}</ul></article>})}</div>{r.contentAudit&&<div className="contentAudit"><div className="eyebrow">CONTENT CHECK</div><h3>AIに伝わるための基本情報</h3><p>専門知識がなくても確認できる、サイト内の重要な4項目です。</p><div className="contentAuditGrid">{r.contentAudit.map(x=><article key={x.key}><div className={x.found?'found ok':'found ng'}>{x.found?'確認できました':'不足・要確認'}</div><h4>{x.title}</h4><p>{x.plain}</p><div className="evidence"><strong>判定の根拠</strong><br/>「{x.evidence}」</div><div className="advice"><strong>このサイトでは</strong><br/>{x.advice}</div></article>)}</div></div>}<div className="actions"><h3>優先して直すこと</h3><ol>{r.actions.map((x,i)=><li key={i}>{x}</li>)}</ol><button className="pdf" onClick={pdf}>PDFレポートを保存</button><small className="pdfhint">日本語対応：A4レポート専用画面を開きます</small></div>{r.implementationPlan&&<div className="implementation"><div className="eyebrow">IMPLEMENTATION PLAN</div><h3>実装まで落とし込んだ改善プラン</h3><p>診断結果を、制作・コーディング担当がそのまま作業に移せる単位へ整理しています。</p><div className="implgrid">{r.implementationPlan.slice(0,6).map((x,i)=><article key={x.key}><div className="implhead"><span>優先 {x.priority===0?'最優先':x.priority}</span><b>{x.impact}</b></div><h4>{x.title}</h4><small>{x.codeTarget}</small><p>{x.instruction}</p><button onClick={()=>makeCode(x)}>修正コードを生成</button></article>)}</div></div>}{code&&<div className="codeModal"><div className="codeBox"><button className="close" onClick={()=>setCode(null)}>×</button><div className="eyebrow">AUTO CODE</div><h3>{code.title}</h3><pre>{code.value}</pre><button className="copy" onClick={()=>navigator.clipboard.writeText(code.value)}>コードをコピー</button></div></div>}<details><summary>取得ページ</summary><ul>{r.pages.map(x=><li key={x}>{x}</li>)}</ul></details></section>}</main>
}