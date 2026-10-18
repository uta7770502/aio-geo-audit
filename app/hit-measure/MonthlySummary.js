'use client';
import {monthlyComparison} from './monthly';
export default function MonthlySummary({rows=[]}){
 const result=monthlyComparison(rows);
 if(!result.current)return null;
 const labels={appearance:'会社名登場率',recommended:'おすすめ率',cited:'サイト引用率'};
 return <section className="hitMonthly"><h2>月次測定サマリー</h2><p>保存済み測定結果の月別平均。質問・測定回数が異なる月の比較は参考値です。</p><p>対象月：{result.current.month} ／ 測定：{result.current.runs}回 ／ 質問：{result.current.questions}問</p><table><thead><tr><th>指標</th><th>今月</th><th>前月</th><th>差分</th></tr></thead><tbody>{result.changes.map(item=><tr key={item.key}><td>{labels[item.key]}</td><td>{item.current??'—'}%</td><td>{item.previous??'—'}%</td><td>{item.delta==null?'—':item.delta+'pt'}</td></tr>)}</tbody></table><h3>月別推移</h3><table><thead><tr><th>月</th><th>測定回数</th><th>登場率</th><th>引用率</th></tr></thead><tbody>{result.months.slice(-12).map(m=><tr key={m.month}><td>{m.month}</td><td>{m.runs}</td><td>{m.appearance??'—'}%</td><td>{m.cited??'—'}%</td></tr>)}</tbody></table></section>;
}
