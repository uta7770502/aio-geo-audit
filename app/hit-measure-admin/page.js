'use client';
import {useState} from 'react';
import '../style.css';
export default function MeasurementAdmin(){
 const [password,setPassword]=useState(''),[jobs,setJobs]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[logged,setLogged]=useState(false);
 async function api(path,options={}){
  const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'処理に失敗しました');
  return data;
 }
 async function refresh(){
  setBusy(true);
  try{const r=await api('/api/hit-measure/jobs');setJobs(r.jobs||[]);setLogged(true);setMessage('最新情報を取得しました')}
  catch(e){setMessage(e.message);if(e.message==='Unauthorized')setLogged(false)}
  finally{setBusy(false)}
 }
 async function login(){
  setBusy(true);
  try{await api('/api/hit-measure/admin-session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});setPassword('');setLogged(true);const r=await api('/api/hit-measure/jobs');setJobs(r.jobs||[]);setMessage('ログインしました')}
  catch(e){setMessage(e.message)}finally{setBusy(false)}
 }
 async function change(job,status){
  if(!window.confirm(job.company+' の測定を'+(status==='paused'?'停止':'再開')+'しますか？'))return;
  setBusy(true);
  try{await api('/api/hit-measure/jobs',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:job.id,status})});await refresh()}
  catch(e){setMessage(e.message)}finally{setBusy(false)}
 }
 async function remove(job){
  if(!window.confirm(job.company+' の定期測定登録を解除しますか？測定履歴は保持されます。'))return;
  setBusy(true);
  try{await api('/api/hit-measure/jobs?id='+encodeURIComponent(job.id),{method:'DELETE'});await refresh()}
  catch(e){setMessage(e.message)}finally{setBusy(false)}
 }
 async function logout(){await api('/api/hit-measure/admin-session',{method:'DELETE'});setLogged(false);setJobs([]);setMessage('ログアウトしました')}
 return <main className="hitAdmin"><header><a href="/hit-measure">← AI検索ヒット測定</a><h1>定期測定 管理ダッシュボード</h1><p>運営者専用・定期測定の登録状況と実行履歴</p></header>
 {!logged?<section><h2>管理者ログイン</h2><input aria-label="管理者パスワード" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/><button disabled={busy||!password} onClick={login}>ログイン</button></section>:<><div className="hitAdminActions"><button disabled={busy} onClick={refresh}>情報を更新</button><button onClick={logout}>ログアウト</button></div><p>登録数：{jobs.length}件 ／ 稼働中：{jobs.filter(j=>j.status==='active').length}件 ／ 停止中：{jobs.filter(j=>j.status==='paused').length}件</p>{jobs.length===0&&<p>登録済みの定期測定はありません。</p>}{jobs.map(job=><section key={job.id}><h2>{job.company||job.id}</h2><p>{job.site} ／ 状態：{job.status==='active'?'稼働中':'停止中'} ／ 実行：{job.runs||0}回 ／ 対象質問：{job.questions?.length||0}問</p><p>開始日：{job.createdAt?new Date(job.createdAt).toLocaleDateString('ja-JP'):'不明'} ／ 期間：{job.months}か月</p><div className="hitAdminActions"><button disabled={busy} onClick={()=>change(job,job.status==='active'?'paused':'active')}>{job.status==='active'?'停止':'再開'}</button><button disabled={busy} onClick={()=>remove(job)}>登録解除</button></div><h3>直近の実行履歴</h3>{!job.recentRuns?.length?<p>実行履歴はありません。</p>:<ul>{job.recentRuns.map((run,i)=><li key={i}>{run.measuredAt?new Date(run.measuredAt).toLocaleString('ja-JP'):'日時不明'}：{run.question}（引用 {run.citationCount}件）</li>)}</ul>}</section>)}</>}
 {message&&<p role="status">{message}</p>}
 <p className="hitAdminNote">定期測定は現在、全登録サイトを通じて1日最大1質問の処理です。次回実行日時は確約されません。</p>
 </main>;
}
