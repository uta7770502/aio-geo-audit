'use client';
import {useEffect,useState} from 'react';
import '../style.css';

export default function Preview(){
 const [r,setR]=useState(null);
 useEffect(()=>{try{const x=sessionStorage.getItem('aioGeoPreview');if(x)setR(JSON.parse(x))}catch{}},[]);
 if(!r)return <main className="previewPage"><div className="previewEmpty"><h1>改善後プレビュー</h1><p>先にサイトを診断してから「改善後のサイトをプレビュー」を押してください。</p><button onClick={()=>location.href='/'}>診断画面へ戻る</button></div></main>;
 const audit=Object.fromEntries((r.contentAudit||[]).map(x=>[x.key,x]));
 const company=r.title||(()=>{try{return new URL(r.url).hostname}catch{return 'この企業'}})();
 const service=audit.service?.evidence&&!audit.service.evidence.includes('確認できません')?audit.service.evidence:'提供するサービスの内容と、誰のどんな課題を解決するのかをここで明確に説明します。';
 const proof=audit.trust?.evidence&&!audit.trust.evidence.includes('確認できません')?audit.trust.evidence:'会社情報・実績・運営者情報など、安心して選べる根拠を分かりやすく掲載します。';
 return <main className="previewPage">
  <div className="previewToolbar"><div><b>改善後プレビュー</b><span>BETA</span><small>診断結果をもとにした仮イメージです。実サイトにはまだ反映されません。</small></div><button onClick={()=>history.back()}>診断結果へ戻る</button></div>
  <section className="mockSite">
   <header><b>{company}</b><nav><span>サービス</span><span>選ばれる理由</span><span>実績</span><span>よくある質問</span><button>お問い合わせ</button></nav></header>
   <section className="mockHero"><div><em>AIにも、人にも、ひと目で伝わるサイトへ</em><h1>{company}のサービス内容と価値を<br/>わかりやすく伝えます。</h1><p>{service}</p><div><button>サービスを見る</button><button className="ghost">お問い合わせ</button></div></div><aside><small>今回の診断スコア</small><strong>{r.score}<i>/100</i></strong><p>改善提案を反映した場合の<br/>情報設計イメージ</p></aside></section>
   <section className="mockSection"><small>WHAT WE DO</small><h2>何をしている会社なのかを明確に</h2><p>{service}</p><div className="mockCards"><article><b>01</b><h3>サービス内容</h3><p>提供内容・対象ユーザー・得られる価値を、AIが誤解しにくい文章で整理します。</p></article><article><b>02</b><h3>選ばれる理由</h3><p>強みや違いを具体的な根拠とともに掲載し、比較される情報を明確にします。</p></article><article><b>03</b><h3>信頼できる根拠</h3><p>{proof}</p></article></div></section>
   <section className="mockProof"><div><small>TRUST & EVIDENCE</small><h2>実績・会社情報を、判断材料として見せる</h2><p>{proof}</p></div><div className="proofGrid"><p><b>会社情報</b><span>運営主体を明確に表示</span></p><p><b>実績・事例</b><span>具体的な数字や事例を掲載</span></p><p><b>更新情報</b><span>情報の鮮度を明示</span></p></div></section>
   <section className="mockFaq"><small>FAQ</small><h2>よくある質問</h2><details open><summary>どのようなサービスですか？</summary><p>{service}</p></details><details><summary>どんな企業・ユーザーに向いていますか？</summary><p>対象となるユーザーと利用シーンを具体的に回答します。</p></details><details><summary>相談や問い合わせはできますか？</summary><p>問い合わせ方法や次の行動を明確に案内します。</p></details></section>
   <section className="invisibleFix"><b>画面には見えないAIO/GEO改善</b><div><span>✓ Organization / Service 構造化データ</span><span>✓ FAQPage 構造化データ</span><span>✓ title・description最適化</span><span>✓ H1/H2情報構造の整理</span></div></section>
  </section>
 </main>
}