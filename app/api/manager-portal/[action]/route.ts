import {NextRequest,NextResponse} from 'next/server';
import {SEARCH_COOKIE,searchSessionValid} from '@/lib/creator-api-search/auth';
import {MANAGER_COOKIE,accountForSession,createSession,endSession,loginManager,publicAccount,syncAccounts,updateAccount} from '@/lib/manager-portal';
import {loadOverview} from '@/lib/manager-overview-server';
export const dynamic='force-dynamic';
async function handle(req:NextRequest,context:{params:Promise<{action:string}>}){
 const {action}=await context.params;
 const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(process.env.SITE_MODE==='atlas'||process.env.SITE_MODE==='events')return json({error:'Not found'},404);
 if(req.method!=='GET'){const origin=req.headers.get('origin');if(origin&&origin!==req.nextUrl.protocol+'//'+(req.headers.get('host')||req.nextUrl.host))return json({error:'Origin not allowed'},403);}
 try{
  const token=req.cookies.get(MANAGER_COOKIE)?.value;
  const session=async(a:Parameters<typeof createSession>[0])=>{const response=json({account:publicAccount(a)});response.cookies.set(MANAGER_COOKIE,await createSession(a),{httpOnly:true,secure:req.nextUrl.protocol==='https:',sameSite:'lax',path:'/',maxAge:604800});return response;};
  if(action==='login'&&req.method==='POST'){const b=await req.json();if(typeof b.username!=='string'||typeof b.password!=='string'||b.username.length>64||b.password.length>128)return json({error:'Enter your username and password.'},400);return session(await loginManager(b.username,b.password,req.headers.get('x-forwarded-for')?.split(',')[0]||'local'));}
  if(action==='logout'&&req.method==='POST'){await endSession(token);const r=json({ok:true});r.cookies.set(MANAGER_COOKIE,'',{path:'/',maxAge:0});return r;}
  if(action==='accounts'||action==='agency-overview'){
   if(!searchSessionValid(req.cookies.get(SEARCH_COOKIE)?.value))return json({error:'Please sign in through Leadership to manage accounts.'},401);
   if(req.method==='GET')return json(action==='accounts'?{accounts:await syncAccounts()}:await loadOverview(null));
   if(action==='accounts'&&req.method==='POST'){const b=await req.json();if(typeof b.id!=='string'||!Number.isSafeInteger(b.version)||b.version<0||typeof b.username!=='string'||typeof b.enabled!=='boolean'||(b.password!==undefined&&typeof b.password!=='string'))return json({error:'Invalid account update.'},400);return json({account:publicAccount(await updateAccount(b.id,b.version,{username:b.username,enabled:b.enabled,...(b.password?{password:b.password}:{})}))});}
   return json({error:'Not allowed'},405);
  }
  const account=await accountForSession(token);if(!account)return json({error:'Please sign in to your manager account.'},401);
  if(action==='me'&&req.method==='GET')return json({account:publicAccount(account)});
  if(action==='overview'&&req.method==='GET')return json(await loadOverview(account.manager_key));
  return json({error:'Not found'},404);
 }catch(e){return json({error:e instanceof Error?e.message:'Unable to complete this request.'},400);}
}
export const GET=handle;export const POST=handle;
