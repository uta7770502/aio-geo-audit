'use client';
import {useEffect,useState} from 'react';
import '../../style.css';
export default function HitReport(){
 const [report,setReport]=useState(null);
 useEffect(()=>{try{const site=new URLSearchParams(location.search).get('site');if(!site)return;const host=new URL(site).hostname;const raw=localStorage.getItem('aioHitMeasure:'+host);if(raw)setReport(JSON.parse(raw))}catch{}},[]);
 if(!report)return <main className="pdfPage"><h1>測定データがありません</h1><p>ヒット測定画面で測定結果を保存してから開いてください。</p><a href="/hit-measure">測定画面へ</a></main>;
 const rows=report.history||[],latest=rows[rows.length-1],first=rows[0],entries=latest?.entries||[];
 const competitorNames=[...new Set(report.competitors||[])].slice(0,10);
 const stats=competitorNames.map(name=>({name,hits:entries.filter(x=>(x.competitorMentions||[]).includes(name)).length}));
 const chart=(field)=>rows.slice(-12).map((r,i,a)=>{const x=a.length===1?50:8+i*84/(a.length-1);return (i?'L':'M')+x+' '+(92-Math.max(0,Math.min(100,Number(r[field])||0))*.8)}).join(' ');
 return <main className="hitPrintReport">
  <div className="hitPrintToolbar"><button onClick={()=>history.back()}>← 測定画面へ</button><button onClick={()=>window.print()}>印刷・PDF保存</button></div>
  <header><p>AIO / GEO PERFORMANCE REPORT</p><h1>AI検索 ヒット測定レポート</h1><p>{report.companyName||'企業名未登録'} ／ {report.url||''}</p><p>出力日：{new Date().toLocaleDateString('ja-JP')}　測定回数：{rows.length}回</p></header>
  {!latest?<p>保存済みの測定結果がありません。</p>:<>
  <section><h2>最新の測定結果</h2><div className="hitPrintMetrics"><div>会社名登場率<strong>{latest.appearance}%</strong></div><div>おすすめ率<strong>{latest.recommended}%</strong></div><div>サイト引用率<strong>{latest.cited}%</strong></div><div>測定質問数<strong>{latest.count}問</strong></div></div>{first&&rows.length>1&&<p>初回比：登場率 {latest.appearance-first.appearance>=0?'+':''}{latest.appearance-first.appearance}pt ／ 引用率 {latest.cited-first.cited>=0?'+':''}{latest.cited-first.cited}pt</p>}</section>
  <section><h2>測定推移</h2><svg viewBox="0 0 100 100" role="img" aria-label="登場率と引用率の推移"><path d="M8 12V92H94" stroke="#9caab3" fill="none" strokeWidth=".6"/>{[0,25,50,75,100].map(n=><g key={n}><path d={'M8 '+(92-n*.8)+'H94'} stroke="#dce5e9" strokeWidth=".3"/><text x="0" y={93-n*.8} fontSize="3">{n}</text></g>)}<path d={chart('appearance')} stroke="#137b58" strokeWidth="1.5" fill="none"/><path d={chart('cited')} stroke="#3279d3" strokeWidth="1.5" fill="none"/></svg><p>緑：会社名登場率 ／ 青：サイト引用率　（直近12回）</p></section>
  {stats.length>0&&<section><h2>競合との比較（最新測定）</h2><table><thead><tr><th>企業名</th><th>登場質問数</th><th>登場率</th></tr></thead><tbody><tr><td>{report.companyName||'自社'}</td><td>{entries.filter(x=>x.appeared).length} / {latest.count}</td><td>{latest.appearance}%</td></tr>{stats.map(x=><tr key={x.name}><td>{x.name}</td><td>{x.hits} / {latest.count}</td><td>{Math.round(x.hits/Math.max(1,latest.count)*100)}%</td></tr>)}</tbody></table></section>}
  <section><h2>最新測定の質問別エビデンス</h2>{entries.map((e,i)=><article key={i}><h3>{i+1}. {e.question}</h3><p>会社名登場：{e.appeared?'あり':'なし'} ／ おすすめ：{e.recommended?'あり':'なし'} ／ 自社引用：{e.cited?'あり':'なし'}</p><p>測定元：{e.provider||'手動確認'} ／ 測定日時：{e.measuredAt?new Date(e.measuredAt).toLocaleString('ja-JP'):'記録なし'}</p>{e.evidence&&<p className="hitPrintEvidence">{String(e.evidence).slice(0,1500)}</p>}{(e.citations||[]).map((url,j)=><p className="hitPrintUrl" key={j}>{j+1}. {url}</p>)}</article>)}</section>
  </>}
  <footer>本レポートは保存された測定記録に基づきます。OpenAI APIのWeb検索はChatGPTアプリ等の実際の掲載結果と一致するとは限りません。会社名・競合名の自動照合には誤判定があり得ます。</footer>
 </main>
}
