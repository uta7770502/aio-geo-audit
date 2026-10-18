'use client';
import {auditTrend} from '../audit-history';
export default function AuditReportTrend({rows=[]}){
 const data=auditTrend(rows);
 if(!data.length)return null;
 const first=data[0],last=data[data.length-1],delta=Number(last.score)-Number(first.score);
 const line=data.map((row,i)=>{const x=data.length===1?50:8+i*84/(data.length-1);const y=92-Math.min(100,Math.max(0,Number(row.score)))*.8;return (i?'L':'M')+x+' '+y}).join(' ');
 return <section className="pdfSection pdfAuditTrend"><h2>診断スコアの改善推移</h2><p>直近{data.length}回 ／ 初回{first.score}点 → 最新{last.score}点 ／ 差分 {delta>0?'+':''}{delta}点</p><svg viewBox="0 0 100 100" role="img" aria-label="診断スコアの履歴グラフ"><path d="M8 12V92H94" stroke="#a7b8c4" strokeWidth=".6" fill="none"/>{[0,25,50,75,100].map(n=><g key={n}><path d={'M8 '+(92-n*.8)+'H94'} stroke="#dce5ea" strokeWidth=".3"/><text x="0" y={93-n*.8} fontSize="3">{n}</text></g>)}<path d={line} fill="none" stroke="#236fa5" strokeWidth="1.7"/></svg><table><thead><tr><th>診断日</th><th>総合点</th><th>診断ページ数</th></tr></thead><tbody>{data.slice().reverse().map((item,i)=><tr key={i}><td>{new Date(item.date).toLocaleDateString('ja-JP')}</td><td>{item.score}/100</td><td>{item.pagesAnalyzed??'—'}</td></tr>)}</tbody></table><p className="pdfTrendNote">同一ブラウザに保存された診断履歴に基づく比較です。対象ページや診断条件が異なる場合、単純比較には注意が必要です。</p></section>;
}
