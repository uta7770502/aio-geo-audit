export function buildReportInsights(rows=[]){
 const valid=(Array.isArray(rows)?rows:[]).filter(r=>r&&Number.isFinite(Number(r.appearance))&&Number.isFinite(Number(r.cited)));
 if(!valid.length)return {summary:'測定履歴がありません。',changes:[],recommendations:[],period:'記録なし'};
 const latest=valid[valid.length-1],previous=valid.length>1?valid[valid.length-2]:null;
 const appearance=Number(latest.appearance),cited=Number(latest.cited),recommended=Number(latest.recommended)||0;
 const changes=previous?[{label:'会社名登場率',value:appearance-Number(previous.appearance)},{label:'自社サイト引用率',value:cited-Number(previous.cited)},{label:'おすすめ率',value:recommended-(Number(previous.recommended)||0)}]:[];
 const summary=appearance>=70&&cited>=50?'企業名の認知と自社サイトの引用が比較的安定しています。':appearance<30?'AI検索回答内で企業名が確認される機会が限られています。':cited<30?'企業名の登場に対し、自社サイトの引用が少ない状況です。':'一定の企業名登場が確認できました。質問ごとの改善余地を確認してください。';
 const recommendations=[];
 if(appearance<70)recommendations.push({title:'企業・サービス情報の明確化',detail:'企業名、主要サービス、対象顧客、対応地域を公式サイトで明示し、サービスごとの説明を整理します。'});
 if(cited<50)recommendations.push({title:'引用されやすい根拠情報の整備',detail:'実績・事例・料金の考え方・FAQなど、質問に直接答えられる一次情報を公開します。'});
 if(recommended<50)recommendations.push({title:'選ばれる理由の具体化',detail:'競合との違い、実績、専門性、導入事例を具体的な根拠とともに整理します。'});
 if(!recommendations.length)recommendations.push({title:'定点観測と改善の継続',detail:'同じ質問で測定を継続し、引用元や競合の変化を確認します。'});
 const missing=(latest.entries||[]).filter(e=>e&&!e.appeared).slice(0,3).map(e=>String(e.question||'')).filter(Boolean);
 return {summary,changes,recommendations,missing,period:previous?'前回測定比':'初回測定'};
}
