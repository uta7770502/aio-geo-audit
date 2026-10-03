'use client';
import {useEffect,useState} from 'react';
import '../style.css';

export default function Preview(){
 const [r,setR]=useState(null); const [mode,setMode]=useState('after');
 useEffect(()=>{try{const x=sessionStorage.getItem('aioGeoPreview');if(x)setR(JSON.parse(x))}catch{}},[]);
 if(!r)return <main className="previewPage"><div className="previewEmpty"><h1>改善後プレビュー</h1><p>先にサイトを診断してください。</p><button onClick={()=>location.href='/'}>診断画面へ戻る</button></div></main>;
 const a=Object.fromEntries((r.contentAudit||[]).map(x=>[x.key,x])); const v=r.visualProfile||{};
 const company=(r.title||'').split(/[｜|]/)[0]||new URL(r.url).hostname;
 const service=a.service?.evidence&&!a.service.evidence.includes('確認できません')?a.service.evidence:'誰に、何を提供し、どんな価値がある会社なのかを明確に伝えます。';
 const proof=a.proof?.evidence&&!a.proof.evidence.includes('確認できません')?a.proof.evidence:'実績・事例・会社情報を具体的な根拠として掲載します。';
 const before=r.clientGuide?.entity?.siteBefore||service;
 const style={'--site-accent':v.accent||'#245c49','--site-soft':v.secondary||'#eef5f1'};
 return <main className="previewPage" style={style}>
  <div className="previewToolbar"><div><b>リニューアル提案ラフ</b><span>BETA</span><small>診断したサイトの情報・色・素材を使った改善イメージです</small></div><button onClick={()=>history.back()}>診断結果へ戻る</button></div>
  <div className="previewSwitch"><button className={mode==='before'?'on':''} onClick={()=>setMode('before')}>現行イメージ</button><button className={mode==='after'?'on':''} onClick={()=>setMode('after')}>改善イメージ</button></div>
  <section className={'renewSite '+mode}>
   <header>{v.logo?<img src={v.logo} alt={company}/>:<b>{company}</b>}<nav><span>サービス</span><span>会社情報</span><span>実績</span><span>お問い合わせ</span></nav></header>
   {mode==='before'?<section className="renewHero beforeHero">{v.heroImage&&<img src={v.heroImage} alt=""/>}<div><small>CURRENT SITE</small><h1>{company}</h1><p>{before}</p><button>詳しく見る</button></div></section>:
   <><section className="renewHero afterHero">{v.heroImage&&<img src={v.heroImage} alt=""/>}<div><label>AIO/GEO 改善 01</label><small>WHO / WHAT / VALUE</small><h1>{company}は、<br/>「何を提供する会社か」が<br/>ひと目で伝わるサイトへ。</h1><p>{service}</p><button>サービス内容を見る</button><i>企業・サービス内容をAIが理解しやすい形に整理</i></div></section>
   <section className="renewIntro"><div><label>AIO/GEO 改善 02</label><small>SERVICE</small><h2>サービスを、探す人にもAIにも<br/>分かりやすく整理。</h2></div><p>{service}</p></section>
   <section className="renewCards"><article><b>01</b><h3>何を提供するか</h3><p>サービス内容を短い定義文から始め、詳細へ自然につなげます。</p></article><article><b>02</b><h3>誰のためのサービスか</h3><p>対象顧客と解決できる課題を明確にして、検索意図と結びつけます。</p></article><article><b>03</b><h3>選ばれる根拠</h3><p>{proof}</p></article></section>
   <section className="renewProof">{v.images?.[1]&&<img src={v.images[1]} alt=""/>}<div><label>AIO/GEO 改善 03</label><small>TRUST / EVIDENCE</small><h2>「実績豊富」ではなく、<br/>信頼できる理由を具体的に。</h2><p>{proof}</p><ul><li>会社・運営者情報を明確化</li><li>実績・事例を具体的な事実で掲載</li><li>問い合わせへの導線を整理</li></ul></div></section>
   <section className="renewFaq"><label>AIO/GEO 改善 04</label><small>FAQ</small><h2>お客様が知りたいことに、サイト内で答える。</h2><details open><summary>どのようなサービスですか？</summary><p>{service}</p></details><details><summary>どのような相談に対応できますか？</summary><p>対応範囲や対象を具体的に回答することで、AIの回答材料にもなります。</p></details></section>
   <section className="renewInvisible"><b>さらに、見た目を変えずに裏側も改善</b><span>Organization / Service 構造化データ</span><span>title・description</span><span>H1/H2構造</span><span>FAQPage</span></section></>}
  </section>
  <div className="renewNote"><b>これは完成デザインではなく「改善したらどう見えるか」の提案ラフです。</b><p>現行サイトのデザイントーンを残しながら、診断で見つかった改善点を画面に落とし込んでいます。</p></div>
 </main>
}