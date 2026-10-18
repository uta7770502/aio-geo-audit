import {NextResponse} from 'next/server';
import {redis} from '../storage';
import {isAdmin} from '../admin-session/auth';
export const runtime='nodejs';
export async function GET(request){
 if(!isAdmin(request))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
  const day=new Date().toISOString().slice(0,10),month=day.slice(0,7);
  const dailyLimit=Number(process.env.AIO_SEARCH_DAILY_LIMIT)||30;
  const monthlyLimit=Number(process.env.AIO_SEARCH_MONTHLY_LIMIT)||500;
  const perClientDailyLimit=Number(process.env.AIO_SEARCH_CLIENT_DAILY_LIMIT)||5;
  const [daily,monthly]=await Promise.all([
   redis(['GET','aio:limit:day:'+day]),redis(['GET','aio:limit:month:'+month])
  ]);
  return NextResponse.json({ok:true,day,month,daily:{used:Number(daily)||0,limit:dailyLimit},monthly:{used:Number(monthly)||0,limit:monthlyLimit},perClientDailyLimit,note:'予約済みAPI実行枠です。失敗した呼び出しも含み、請求金額やトークン数を示すものではありません。顧客別の利用集計は未実装です。'});
 }catch{return NextResponse.json({error:'利用状況を取得できませんでした'},{status:503})}
}
