'use client';
import {useEffect,useState} from 'react';
import '../style.css';
const txt=s=>String(s||'').replace(/\s+/g,' ').trim();
export default function Preview(){
 const [r,setR]=useState(null),[tab,setTab]=useState('company');
 useEffect(()=>{try{const x=sessionStorage.getItem('aioGeoPreview');if(x)setR(JSON.parse(x))}catch{}},[]);
 if(!r)return <main className="previewPage"><div className="previewEmpty"><h1>改善ラフ</h1><p>先にサイトを診断してください。</p><button onClick={()=>location.href='/'}>診断画面へ戻る</button></div></main>;
 const pages=r.pageResults||[];
 const rules={company:/company|about|profile|corporate|会社|企業/,service:/service|business|solution|product|事業|サービス|製品/,proof:/case|works|result|portfolio|実績|事例|導入/,faq:/faq|question|よくある質問|q&a/};
 const role={company:'company',service:'service',proof:'proof',faq:'faq'}[tab];
 const page=pages.find(x=>x.role===role)||pages.find(x=>rules[tab].test(((x.title||'')+' '+(x.url||'')).toLowerCase()))||pages[0];
 const raw=txt(page?.textSample); const host=(()=>{try{return new URL(r.url).hostname.replace(/^www\./,'')}catch{return ''}})(); const company=raw.match(/株式会社[^　\s|｜]{2,20}/)?.[0]||((r.title||'').includes(host)?'この会社':(r.title||'この会社').split(/[｜|]/)[0]);
 const sample=raw.slice(0,220);
 const examples={company:company+'は、'+(sample||'お客様の課題に合わせたサービス')+'を提供する会社です。提供内容と強みを冒頭で簡潔に示し、誰にどんな価値を届ける会社なのかを明確にします。',service:'このサービスは、'+(sample||'お客様の課題')+'に対応します。対象となるお客様、提供する内容、対応範囲、利用することで得られる価値を最初に明確に伝えます。',proof:'実績・主要取引先・導入事例・具体的な成果を、確認できる事実として掲載します。例：〇〇社への導入、〇〇件の支援実績、〇〇％の改善など、数字や固有名詞で示します。',faq:'Q. どのような相談に対応していますか？ A. '+(sample||'対応しているサービスや相談内容')+'について対応しています。対象範囲・条件・依頼方法を結論から簡潔に回答します。'};
 const reasons={company:'会社名・事業内容・対象顧客・提供価値が一続きの文章になり、AIが「何の会社か」を判断しやすくなります。',service:'誰向けの何のサービスかが明確になり、AIが検索質問に対してこのページを回答候補として選びやすくなります。',proof:'抽象的なアピールではなく一次情報として確認できる事実が増え、AIにもユーザーにも信頼の根拠が伝わります。',faq:'実際の質問と回答をセットで明記すると、AIがそのまま回答根拠として理解・引用しやすくなります。'};
 const labels={company:['COMPANY','会社概要','会社の正体を、最初に伝える'],service:['SERVICE','サービス','誰に何を提供するかを、ひと目で伝える'],proof:['TRUST & RESULTS','実績・信頼情報','選ばれる根拠を、事実で伝える'],faq:['FAQ','よくある質問','顧客の疑問に、その場で答える']}; const L=labels[tab];
 return <main className="previewPage"><div className="previewToolbar"><div><b>この部分を直すと、こう変わります</b><span>BETA</span><small>診断した実ページを使った改善ラフ</small></div><button onClick={()=>history.back()}>診断結果へ戻る</button></div>
 <div className="targetTabs">{Object.entries({company:'会社概要',service:'サービス',proof:'実績・信頼',faq:'FAQ'}).map(([k,n])=><button key={k} className={tab===k?'on':''} onClick={()=>setTab(k)}>{n}</button>)}</div>
 <section className="compareWrap"><article className="comparePane currentPane"><div className="compareLabel">BEFORE <b>現行</b></div><div className="currentMock currentRebuild"><small>診断時に取得した現行ページ</small><h2>{page?.title||'現行ページ'}</h2><i>{page?.url}</i><div className="currentText">{raw?raw.split(/(?<=[。！？])/).filter(Boolean).slice(0,12).map((x,i)=><p key={i}>{x}</p>):<p>本文データを取得できませんでした。</p>}</div><a href={page?.url} target="_blank" rel="noreferrer">実際のページを開く ↗</a></div></article><div className="compareArrow">↓</div>
 <article className="comparePane improvedPane"><div className="compareLabel">AFTER <b>改善ラフ</b></div><div className={"roughPage tone-"+tab}><div className="roughTitle"><small>{L[0]}</small><h2>{L[1]}</h2></div><div className="aioPatch"><span>AIO/GEO 改善</span><h3>{L[2]}</h3><p>{tab==='company'?company+'が何をする会社で、誰にどんな価値を提供しているのかを1〜2文で明確にします。':tab==='service'?'対象顧客・提供内容・対応範囲・得られる価値を、最初に短く整理します。':tab==='proof'?'主要取引先・事例・数字・受賞歴などを、信頼できる根拠として整理します。':'料金・納期・対応範囲・依頼方法など、実際に聞かれる質問へ結論から答えます。'}</p></div>
 {tab==='company'&&<div className="companyRough"><h3>{company}について</h3><div className="companyRow"><b>事業内容</b><p>何を提供する会社かを明確に記載</p></div><div className="companyRow"><b>会社情報</b><p>所在地・代表者・設立・資本金などを整理</p></div><div className="companyRow"><b>信頼情報</b><p>主要取引先・加盟団体・認証・実績を判断材料として整理</p></div></div>}
 {tab==='service'&&<div className="roughCards"><div><b>01</b><h3>対象</h3><p>誰向けか</p></div><div><b>02</b><h3>提供内容</h3><p>何をするか</p></div><div><b>03</b><h3>価値</h3><p>何が解決できるか</p></div></div>}
 {tab==='proof'&&<div className="roughCards"><div><b>実績</b><p>具体的な事例・件数</p></div><div><b>取引先</b><p>信頼性を示す一次情報</p></div><div><b>成果</b><p>数字で示せる結果</p></div></div>}
 {tab==='faq'&&<div className="roughFaq"><b>Q. どのような相談に対応していますか？</b><p>A. 対応範囲を最初に結論で回答し、その後に条件や詳細を説明します。</p></div>}
 <div className="exampleCopy"><small>このページに入れたい推奨例文</small><p>{examples[tab]}</p><div><b>なぜこの文章がいい？</b><span>{reasons[tab]}</span></div></div><div className="codePatch"><b>画面の裏側でも改善</b><span>構造化データ</span><span>title / description</span><span>H1 / H2整理</span></div></div></article></section></main>
}
