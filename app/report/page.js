'use client';
import {useEffect,useState} from 'react';
import '../style.css';

const labels={entity:'企業・サービス理解',structure:'情報構造',schema:'構造化データ',faq:'FAQ・回答性',trust:'信頼情報',citation:'引用されやすさ'};
function status(score){return score>=80?'良好':score>=60?'改善推奨':'要改善'}

export default function ReportPage(){
 const [r,setR]=useState(null);
 useEffect(()=>{try{const raw=sessionStorage.getItem('aioGeoReport');if(raw)setR(JSON.parse(raw))}catch{}},[]);
 if(!r)return <main className="pdfPage"><div className="pdfEmpty"><h1>レポートデータがありません</h1><p>診断画面から「PDFレポートを保存」を押してください。</p><button onClick={()=>location.href='/'}>診断画面へ戻る</button></div></main>;
 return <main className="pdfPage">
  <div className="pdfToolbar"><button onClick={()=>history.back()}>← 診断へ戻る</button><div><strong>日本語PDFレポート</strong><small>下の「印刷・PDF保存」を押してください</small></div><button className="printBtn" onClick={()=>window.print()}>印刷・PDF保存</button></div>
  <section className="pdfReport">
   <header className="pdfCover"><div className="eyebrow">AIO / GEO AUDIT REPORT</div><h1>{r.title||'AIO/GEO診断レポート'}</h1><p className="pdfUrl">{r.url}</p><div className="pdfScore"><span>総合AIO/GEOスコア<small>AI検索への対応度</small></span><strong>{r.score}<i>/100</i></strong></div><p>{r.summary}</p>{r.summarySimple&&<div className="pdfSimple"><strong>かんたんに言うと</strong><p>{r.summarySimple}</p></div>}</header>
   <section className="pdfSection"><h2>01｜6項目の診断結果</h2><div className="pdfGrid">{Object.entries(r.categories||{}).map(([k,v])=>{const g=r.clientGuide?.[k];return <article key={k}><div className="pdfCatHead"><h3>{labels[k]||k}</h3><b>{v.score}/100</b></div><span className={'pdfStatus '+(v.score>=80?'good':v.score>=60?'mid':'bad')}>{status(v.score)}</span>{g&&<><p>{g.plain}</p>{g.simple&&<div className="pdfSimple mini"><strong>かんたんに言うと</strong><p>{g.simple}</p></div>}<div className="pdfWhy"><strong>なぜ重要？</strong> {g.why}</div><div className="pdfBA"><div><em>BEFORE</em><p>{g.siteBefore||g.before}</p></div><div><em>AFTER</em><p>{g.siteAfter||g.after}</p></div></div></>}<h4>改善提案</h4><ul>{(v.findings||[]).slice(0,3).map((x,i)=><li key={i}>{x}</li>)}</ul></article>})}</div></section>
   {r.contentAudit&&<section className="pdfSection"><h2>02｜AIに伝わるための基本情報</h2><div className="pdfGrid">{r.contentAudit.map(x=><article key={x.key}><span className={'pdfStatus '+(x.found?'good':'bad')}>{x.found?'確認できました':'不足・要確認'}</span><h3>{x.title}</h3><p>{x.plain}</p><div className="pdfEvidence"><strong>判定の根拠</strong><p>{x.evidence}</p></div><div className="pdfAdvice"><strong>具体的にどう直す？</strong><p>{x.advice}</p></div></article>)}</div></section>}
   <section className="pdfSection"><h2>03｜まず何を直せばいい？</h2><p className="pdfLead">専門知識がなくても進めやすいよう、効果の大きい順に並べています。</p><ol className="pdfActions">{(r.actions||[]).map((x,i)=><li key={i}><b>{String(i+1).padStart(2,'0')}</b><span>{x}</span></li>)}</ol></section>
   {r.implementationPlan&&<section className="pdfSection"><h2>04｜実装プラン</h2><div className="pdfGrid">{r.implementationPlan.slice(0,6).map(x=><article key={x.key}><div className="pdfCatHead"><h3>{x.title}</h3><b>{x.impact}</b></div><small>{x.codeTarget}</small><p>{x.instruction}</p></article>)}</div></section>}
   <footer>このレポートはAIO/GEO AUDITによる診断結果です。</footer>
  </section>
 </main>
}