'use client';
import {useEffect,useMemo,useState} from 'react';
import '../style.css';

const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
export default function Preview(){
 const [r,setR]=useState(null),[tab,setTab]=useState('company');
 useEffect(()=>{try{const x=sessionStorage.getItem('aioGeoPreview');if(x)setR(JSON.parse(x))}catch{}},[]);
 const data=useMemo(()=>r?.improvementTargets||{},[r]);
 if(!r)return <main className="previewPage"><div className="previewEmpty"><h1>改善ラフ</h1><p>先にサイトを診断してください。</p><button onClick={()=>location.href='/'}>診断画面へ戻る</button></div></main>;
 const pickPage=(kind)=>{const list=r?.pageResults||[]; const roleMap={company:'company',service:'service',proof:'proof',faq:'faq'}; return list.find(p=>p.role===roleMap[kind])||list.find(p=>{const s=((p.title||'')+' '+(p.url||'')).toLowerCase();return kind==='company'?/company|about|会社|企業/.test(s):kind==='service'?/service|business|solution|事業|サービス/.test(s):kind==='proof'?/works|case|result|実績|事例/.test(s):/faq|question|よくある質問/.test(s)})||null};\n const page=pickPage(tab); const target=data[tab]||page||null; const v=target?.visual||r.visualProfile||{};\n useEffect(()=>{let off=false;setLive(null);const u=page?.url||target?.url;if(!u)return;fetch('/api/preview',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:u})}).then(x=>x.json()).then(x=>{if(!off)setLive(x)}).catch(()=>{});return()=>{off=true}},[tab,page?.url,target?.url]);
 const company=(r.title||'').split(/[｜|]/)[0]||'この会社'; const raw=clean(target?.currentText||page?.textSample||page?.evidence||'');
 const intro=tab==='company'?company+'が「誰に、何を提供している会社なのか」を会社情報の冒頭で明確にします。':tab==='service'?'サービスの対象・提供内容・得られる価値を、ページ冒頭で短く明確に説明します。':tab==='proof'?'実績や取引情報を、信頼できる具体的な根拠として整理して掲載します。':'実際によく聞かれる質問に、結論から短く答える構成へ整理します。';
 const rows=raw.match(/(?:会社名|設立|所在地|本社所在地|代表|役員|資本金|取引銀行|主な取引先|加盟団体|認証資格|海外拠点)[^。]{0,180}/g)?.slice(0,10)||[];
 const style={'--site-accent':v.accent||'#087fa5','--site-soft':v.secondary||'#e7f3f7'};
 return <main className="previewPage" style={style}>
  <div className="previewToolbar"><div><b>この部分を直すと、こう変わります</b><span>BETA</span><small>診断した実ページをもとにした改善ラフ</small></div><button onClick={()=>history.back()}>診断結果へ戻る</button></div>
  <div className="targetTabs">{[['company','会社概要'],['service','サービス'],['proof','実績・信頼'],['faq','FAQ']].map(([k,n])=><button key={k} className={tab===k?'on':''} onClick={()=>setTab(k)}>{n}</button>)}</div>
  <section className="compareWrap">
   <article className="comparePane currentPane"><div className="compareLabel">BEFORE <b>現行</b></div><div className="currentMock"><h2>{page?.title||target?.title||'現行ページ'}</h2><small className="sourceUrl">{page?.url||target?.url||''}</small><p>{raw.slice(0,1200)||'この診断結果には本文データが保存されていません。下の改善ラフは診断項目をもとに表示しています。'}</p></div></article>
   <div className="compareArrow">↓</div>
   <article className="comparePane improvedPane"><div className="compareLabel">AFTER <b>改善ラフ</b></div>
    <div className="roughPage">
     <div className="roughTitle"><small>{tab==='company'?'COMPANY':tab==='service'?'SERVICE':tab==='proof'?'TRUST & RESULTS':'FAQ'}</small><h2>{target?.label||'改善イメージ'}</h2></div>
     <div className="aioPatch"><span>AIO/GEO 改善</span><h3>{tab==='company'?company+'について':tab==='service'?'サービス内容をひと目で理解できるように':tab==='proof'?'信頼できる根拠を分かりやすく':'よくある質問に直接答える'}</h3><p>{intro}</p><i>文章を追加・整理することで、閲覧者にもAIにも内容が伝わりやすくなります。</i></div>
     {tab==='company'&&<div className="companyRough"><h3>会社情報</h3>{rows.length?rows.map((x,i)=><div className="companyRow" key={i}><b>{x.split(/\s/)[0]}</b><p>{x}</p></div>):<><div className="companyRow"><b>会社名</b><p>{company}</p></div><div className="companyRow"><b>事業内容</b><p>提供サービスと対応領域を具体的に記載</p></div><div className="companyRow"><b>実績</b><p>主要取引先・実績など信頼材料を整理</p></div></>}</div>}
     {tab==='service'&&<div className="roughCards"><div><b>01</b><h3>対象</h3><p>誰のためのサービスか</p></div><div><b>02</b><h3>提供内容</h3><p>何を提供するのか</p></div><div><b>03</b><h3>価値</h3><p>何が解決できるのか</p></div></div>}
     {tab==='proof'&&<div className="roughCards"><div><b>実績</b><p>件数・年数・事例を具体化</p></div><div><b>主要取引</b><p>信頼につながる一次情報</p></div><div><b>会社情報</b><p>運営主体を明確に</p></div></div>}
     {tab==='faq'&&<div className="roughFaq"><b>Q. どのような相談に対応していますか？</b><p>A. 対応範囲を最初に結論で答え、その後に条件や詳細を説明します。</p></div>}
     <div className="codePatch"><b>画面の裏側でも改善</b><span>構造化データ</span><span>title / description</span><span>見出し構造</span></div>
    </div>
   </article>
  </section>
  <div className="renewNote"><b>ポイント</b><p>完成デザインではなく、現行ページの情報とトーンを残したまま「コード・文章・レイアウトを直すとどう変わるか」を見せる提案ラフです。</p></div>
 </main>
}