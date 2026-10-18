'use client';
import {getTrend} from './trend';
export default function HitTrend({rows}){
 const data=getTrend(rows);
 if(!data.length)return null;
 const line=field=>data.map((row,i)=>{const x=data.length===1?50:8+i*84/(data.length-1);const y=94-Math.min(100,Math.max(0,Number(row[field])))*.84;return (i?'L':'M')+x+' '+y}).join(' ');
 return <div className="hitTrend"><h3>AI検索ヒット率の推移</h3><p>保存された測定結果の直近12回を表示</p><div className="hitLegend"><span>登場率</span><span>引用率</span></div><svg viewBox="0 0 100 100" role="img" aria-label="会社名登場率とサイト引用率の推移"><path d="M8 10V94H94" fill="none" stroke="#9eafa7" strokeWidth=".6"/>{[0,25,50,75,100].map(n=><g key={n}><path d={'M8 '+(94-n*.84)+'H94'} stroke="#d9e3de" strokeWidth=".3"/><text x="0" y={95-n*.84} fontSize="3">{n}</text></g>)}<path d={line('appearance')} fill="none" stroke="#137b58" strokeWidth="1.3"/><path d={line('cited')} fill="none" stroke="#3279d3" strokeWidth="1.3"/></svg><div className="hitTrendDates"><span>{new Date(data[0].date).toLocaleDateString('ja-JP')}</span><span>{new Date(data[data.length-1].date).toLocaleDateString('ja-JP')}</span></div></div>;
}
