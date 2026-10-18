'use client';
import {useEffect,useState} from 'react';
export default function UsagePanel(){
 const [usage,setUsage]=useState(null);
 useEffect(()=>{fetch('/api/hit-measure/usage',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(setUsage).catch(()=>{})},[]);
 if(!usage)return null;
 return <section><h2>API利用枠</h2><p>本日：{usage.daily.used} / {usage.daily.limit} 回</p><p>今月：{usage.monthly.used} / {usage.monthly.limit} 回</p><p>IP別の1日上限：{usage.perClientDailyLimit} 回</p><small>{usage.note}</small>{usage.tenantUsage?.length>0&&<><h3>顧客別の本日利用回数</h3><ul>{usage.tenantUsage.map(t=><li key={t.tenantId}>{t.tenantId}：{t.used} / {usage.tenantDailyLimit} 回</li>)}</ul></>}</section>;
}
