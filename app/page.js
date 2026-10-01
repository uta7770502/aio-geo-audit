'use client';
import {useState} from 'react';
import {jsPDF} from 'jspdf';
import './style.css';
const labels={entity:'企業・サービス理解',structure:'情報構造',schema:'構造化データ',faq:'FAQ/回答性',trust:'信頼情報',citation:'引用されやすさ'};
function status(score){return score>=80?'良好':score>=60?'改善余地':'要改善'}
export default function Page(){
 const [url,setUrl]=useState(''); const [loading,setLoading]=useState(false); const [r,setR]=useState(null); const [err,setErr]=useState('');
 async function analyze(){
  setLoading(true);setErr('');setR(null);
  let stage='start';
  try{
   stage='endpoint';
   const endpoint=window.location.origin+'/api/analyze';
   stage='fetch';
   const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:String(url||'').trim()})});
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
 function pdf(){if(!r)return;const doc=new jsPDF({unit:'mm',format:'a4'});doc.setFont('helvetica');let y=18;const line=(t,size=10)=>{doc.setFontSize(size);const s=doc.splitTextToSize(String(t),175);if(y+s.length*5>282){doc.addPage();y=18}doc.text(s,18,y);y+=s.length*5+2};line('AIO / GEO Audit Report',18);line(r.url,9);line(`Overall Score: ${r.score}/100`,16);line(`Pages analyzed: ${r.pagesAnalyzed}`,10);line('');Object.entries(r.categories).forEach(([k,v])=>{line(`${labels[k]||k}: ${v.score}/100 - ${status(v.score)}`,12);v.findings.forEach(x=>line(`- ${x}`,9));line('')});line('Priority Actions',14);r.actions.forEach((x,i)=>line(`${i+1}. ${x}`,10));doc.save('aio-geo-audit.pdf')}
 return <main><section className="hero"><div className="eyebrow">AIO / GEO AUDIT</div><h1>URLを入れるだけで<br/>AI検索に強いサイトか診断。</h1><p>企業・サービス理解、構造化データ、FAQ、信頼性、引用されやすさを自動評価し、改善優先度まで提示します。</p><div className="form"><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://example.com"/><button onClick={analyze} disabled={loading||!url}>{loading?'診断中…':'無料診断する'}</button></div>{err&&<div className="error">{err}</div>}<div className="note">MVP版：公開URLを最大5ページ解析。目安30秒〜数分。</div></section>{r&&<section className="report"><div className="top"><div><div className="eyebrow">RESULT</div><h2>{r.title||r.url}</h2><p>{r.summary}</p></div><div className="score"><strong>{r.score}</strong><span>/100</span></div></div><div className="grid">{Object.entries(r.categories).map(([k,v])=><article key={k}><div className="row"><h3>{labels[k]||k}</h3><b>{v.score}</b></div><div className="bar"><i style={{width:`${v.score}%`}}/></div><small>{status(v.score)}</small><ul>{v.findings.slice(0,3).map((x,i)=><li key={i}>{x}</li>)}</ul></article>)}</div><div className="actions"><h3>優先して直すこと</h3><ol>{r.actions.map((x,i)=><li key={i}>{x}</li>)}</ol><button className="pdf" onClick={pdf}>PDFレポートを保存</button></div>{r.implementationPlan&&<div className="implementation"><div className="eyebrow">IMPLEMENTATION PLAN</div><h3>実装まで落とし込んだ改善プラン</h3><p>診断結果を、制作・コーディング担当がそのまま作業に移せる単位へ整理しています。</p><div className="implgrid">{r.implementationPlan.slice(0,6).map((x,i)=><article key={x.key}><div className="implhead"><span>優先 {x.priority===0?'最優先':x.priority}</span><b>{x.impact}</b></div><h4>{x.title}</h4><small>{x.codeTarget}</small><p>{x.instruction}</p><button disabled>修正コードを生成（準備中）</button></article>)}</div></div>}<details><summary>取得ページ</summary><ul>{r.pages.map(x=><li key={x}>{x}</li>)}</ul></details></section>}</main>
}