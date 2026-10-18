import {reserveSearchBudget} from './budget';
import {assessCompanyMention,assessSiteCitation} from './identity';
import {NextResponse} from 'next/server';
export const maxDuration=60;
export async function POST(request){
 try{
  const key=process.env.OPENAI_API_KEY;
  if(!key)return NextResponse.json({error:'自動測定用のOpenAI APIキーが未設定です。VercelにOPENAI_API_KEYを設定してください。',code:'missing_key'},{status:503});
  const body=await request.json();
  const question=String(body.question||'').trim().slice(0,500);
  const company=String(body.company||'').trim().slice(0,120);
  const site=String(body.site||'').trim().slice(0,300);
  const aliases=Array.isArray(body.aliases)?body.aliases.slice(0,8).map(x=>String(x).slice(0,100)):[];
  const competitorNames=Array.isArray(body.competitors)?body.competitors.slice(0,10).map(x=>String(x).trim().slice(0,100)).filter(Boolean):[];
  if(!question||!company||!/^https?:\/\//.test(site))return NextResponse.json({error:'測定条件が不足しています'},{status:400});
  let budget;
  try{budget=await reserveSearchBudget(request)}catch{return NextResponse.json({error:'利用上限を確認できないため、測定を一時停止しています。',code:'budget_unavailable'},{status:503})}
  if(!budget.allowed)return NextResponse.json({error:'AI検索の利用上限に達しました。翌日以降に再度お試しください。',code:'rate_limited'},{status:429,headers:{'Retry-After':String(budget.retryAfter)}});
  const res=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+key},body:JSON.stringify({model:'gpt-4.1',tools:[{type:'web_search_preview'}],input:[{role:'system',content:'あなたは日本語で企業を調べる検索アシスタントです。質問に対して公開Web情報を参照し、確認できた事実だけで簡潔に答えてください。企業名を無理に含めたり、特定の企業を優遇したりしないでください。'},{role:'user',content:question}],max_output_tokens:800}),signal:AbortSignal.timeout(48000),cache:'no-store'});
  const json=await res.json();
  if(!res.ok)return NextResponse.json({error:'検索APIで測定できませんでした',detail:json?.error?.message||''},{status:502});
  const messages=(json.output||[]).filter(x=>x.type==='message');
  const parts=messages.flatMap(x=>x.content||[]);
  const answer=parts.filter(x=>x.type==='output_text').map(x=>x.text||'').join('\n');
  const citations=parts.flatMap(x=>x.annotations||[]).filter(x=>x.type==='url_citation').map(x=>x.url).filter(Boolean);
  if(!answer)return NextResponse.json({error:'回答本文を取得できませんでした'},{status:502});
  const mention=assessCompanyMention(answer,company,aliases);
  const citation=assessSiteCitation(citations,site);
  const competitorMentions=competitorNames.filter(name=>assessCompanyMention(answer,name).appeared);
  const {appeared}=mention;
  const {cited}=citation;
  return NextResponse.json({ok:true,provider:'OpenAI API（Web検索）',question,answer,citations,appeared,cited,matchedAlias:mention.matchedAlias,matchConfidence:mention.confidence,matchedCitationUrls:citation.matchedUrls,competitorMentions,recommended:null,measuredAt:new Date().toISOString(),note:'この測定はOpenAI APIのWeb検索結果です。ChatGPTアプリ・Google AI・Gemini・Perplexityの実際の表示結果とは異なる場合があります。'});
 }catch(e){return NextResponse.json({error:'測定中にエラーが発生しました',detail:String(e?.message||'')},{status:500})}
}
