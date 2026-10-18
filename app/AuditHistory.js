'use client';
import {auditTrend} from './audit-history';
export default function AuditHistory({rows=[]}){
 const data=auditTrend(rows);
 if(!data.length)return null;
 const points=data.map((item,i)=>{const x=data.length===1?50:8+i*84/(data.length-1);return (i?'L':'M')+x+' '+(92-Math.min(100,Math.max(0,Number(item.score)))*.8)}).join(' ');
 return <section className="auditHistory"><h2>診断スコアの推移</h2><p>このブラウザに保存された直近{data.length}回の診断結果です。</p><svg viewBox="0 0 100 100" role="img" aria-label="診断総合スコアの推移"><path d="M8 12V92H94" fill="none" stroke="#a4b2bf" strokeWidth=".6"/>{[0,25,50,75,100].map(n=><g key={n}><path d={'M8 '+(92-n*.8)+'H94'} stroke="#e1e7eb" strokeWidth=".3"/><text x="0" y={93-n*.8} fontSize="3">{n}</text></g>)}<path d={points} stroke="#236fa5" strokeWidth="1.6" fill="none"/></svg><div className="auditHistoryDates"><span>{new Date(data[0].date).toLocaleDateString('ja-JP')}</span><span>{new Date(data[data.length-1].date).toLocaleDateString('ja-JP')}</span></div><table><thead><tr><th>診断日</th><th>総合点</th><th>診断ページ数</th></tr></thead><tbody>{data.slice().reverse().map((row,i)=><tr key={row.date+i}><td>{new Date(row.date).toLocaleDateString('ja-JP')}</td><td>{row.score}/100</td><td>{row.pagesAnalyzed??'—'}</td></tr>)}</tbody></table></section>;
}
