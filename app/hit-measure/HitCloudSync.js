'use client';
import {useState} from 'react';
export default function HitCloudSync({site,getLocal,onRemote}){
 const [tenantId,setTenantId]=useState(''),[password,setPassword]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[logged,setLogged]=useState(false);
 async function call(path,options={}){
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
  const json=await response.json();
  if(!response.ok)throw Error(json.error||'通信に失敗しました');
  return json;
 }
 async function login(){
  setBusy(true);setStatus('');
  try{await call('/api/hit-measure/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({tenantId,password})});setLogged(true);setPassword('');setStatus('ログインしました。同期する方向を選んでください。')}
  catch(e){setStatus(e.message)}finally{setBusy(false)}
 }
 async function sync(direction){
  if(!site)return;
  setBusy(true);setStatus('');
  try{
   if(direction==='download'){
    const r=await call('/api/hit-measure/tenant-history?site='+encodeURIComponent(site));
    if(!r.record){setStatus('クラウドに保存済みの履歴がありません');return}
    if(!window.confirm('この端末の設定・測定履歴をクラウドのデータで置き換えます。続けますか？'))return;
    onRemote(r.record);setStatus('クラウドの履歴をこの端末へ読み込みました');
   }else{
    const record=getLocal();
    if(!record){setStatus('先に測定設定または履歴を保存してください');return}
    if(!window.confirm('この端末の履歴でクラウドの保存データを置き換えます。続けますか？'))return;
    await call('/api/hit-measure/tenant-history',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(record)});
    setStatus('クラウドへ保存しました');
   }
  }catch(e){setStatus(e.message)}finally{setBusy(false)}
 }
 async function logout(){setBusy(true);try{await call('/api/hit-measure/session',{method:'DELETE'});setLogged(false);setStatus('ログアウトしました')}catch(e){setStatus(e.message)}finally{setBusy(false)}}
 return <section className="hitCloudSync"><h3>クラウド履歴同期（試験機能）</h3><p>別の端末で同じ履歴を利用できます。同期は手動で、上書き前に確認します。</p>{!logged?<div className="hitCloudFields"><input aria-label="顧客ID" placeholder="顧客ID" value={tenantId} onChange={e=>setTenantId(e.target.value)}/><input aria-label="パスワード" placeholder="パスワード" type="password" value={password} onChange={e=>setPassword(e.target.value)}/><button disabled={busy||!tenantId||!password} onClick={login}>ログイン</button></div>:<div className="hitCloudFields"><button disabled={busy} onClick={()=>sync('upload')}>この端末 → クラウドへ保存</button><button disabled={busy} onClick={()=>sync('download')}>クラウド → この端末へ読込</button><button disabled={busy} onClick={logout}>ログアウト</button></div>}{status&&<p role="status">{status}</p>}</section>
}
