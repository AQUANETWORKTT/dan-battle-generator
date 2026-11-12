import {listReminders,saveReminder,removeReminder,reminderDue} from '@/lib/manager-reminders';
import {POSTER_COOKIE,posterSessionToken} from '@/lib/poster-generator-auth';
import {MANAGER_POSTER_ONLY,MANAGER_POSTER_COOKIE,fullManagerAccess,KJB_PREVIEW_ACCESS} from '@/lib/manager-portal-mode';
import {database} from '@/lib/creator-api-search/db';
import {recruitmentManagerIdentity} from '@/lib/recruitment-manager-aliases';
import {GET as recruitmentLeaderboard} from '@/app/api/data-analysis/recruitment-leaderboard/route';
import {NextRequest,NextResponse} from 'next/server';
import {SEARCH_COOKIE,searchSessionValid} from '@/lib/creator-api-search/auth';
import {MANAGER_COOKIE,accountForSession,createSession,endSession,loginManager,publicAccount,syncAccounts,updateAccount,adminAccounts,resetDefaultPasswords} from '@/lib/manager-portal';
import {loginActivity,londonDate} from '@/lib/manager-login-activity';
import {loadCreatorDevelopment} from '@/lib/creator-development-server';
import {loadInactiveCreators} from '@/lib/inactive-creators';
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
  if(action==='poster-login'&&req.method==='POST'){const posterToken=posterSessionToken();if(!posterToken)return json({error:'Poster access is not configured.'},503);const response=json({ok:true});response.cookies.set(POSTER_COOKIE,posterToken,{httpOnly:true,secure:req.nextUrl.protocol==='https:',sameSite:'lax',path:'/',maxAge:30*86400});response.cookies.set(MANAGER_COOKIE,'',{path:'/',maxAge:0});response.cookies.set(MANAGER_POSTER_COOKIE,'',{path:'/',maxAge:0});return response;}
  if(action==='login'&&req.method==='POST'){const b=await req.json();if(typeof b.username!=='string'||typeof b.password!=='string'||b.username.length>64||b.password.length>128)return json({error:'Enter your username and password.'},400);return session(await loginManager(b.username,b.password,req.headers.get('x-forwarded-for')?.split(',')[0]||'local'));}
  if(action==='kjb-login'&&req.method==='POST'){if(!KJB_PREVIEW_ACCESS)return json({error:'Access unavailable.'},403);const b=await req.json();if(typeof b.password!=='string'||b.password.length>128)return json({error:'Enter your password.'},400);const a=await loginManager('KJB',b.password,req.headers.get('x-forwarded-for')?.split(',')[0]||'local');if(!fullManagerAccess(a))return json({error:'Access unavailable.'},403);return session(a);}
  if(action==='logout'&&req.method==='POST'){await endSession(token);await endSession(req.cookies.get(MANAGER_POSTER_COOKIE)?.value);const r=json({ok:true});r.cookies.set(MANAGER_COOKIE,'',{path:'/',maxAge:0});r.cookies.set(MANAGER_POSTER_COOKIE,'',{path:'/',maxAge:0});r.cookies.set(POSTER_COOKIE,'',{path:'/',maxAge:0});return r;}
  if(action==='reminder-admin'||action==='accounts'||action==='agency-overview'||action==='agency-inactive'||action==='agency-development'||action==='login-activity'||action==='defaults'){
   if(!searchSessionValid(req.cookies.get(SEARCH_COOKIE)?.value))return json({error:'Please sign in through Leadership to manage accounts.'},401);
   if(action==='reminder-admin'){const managers=await syncAccounts();if(req.method==='GET')return json({reminders:await listReminders(),managers});if(req.method==='POST'){const b=await req.json();if(b.remove){await removeReminder(b.remove);return json({ok:true});}return json({reminder:await saveReminder(b,managers.map(m=>m.managerKey))});}return json({error:'Not allowed'},405);}
   if(action==='login-activity'&&req.method==='GET')return json(await loginActivity(req.nextUrl.searchParams.get('day')||londonDate()));
   if(action==='agency-development'&&req.method==='GET')return json(await loadCreatorDevelopment(null));
   if(action==='agency-inactive'&&req.method==='GET')return json(await loadInactiveCreators(null));
   if(action==='defaults'&&req.method==='POST')return json({accounts:await resetDefaultPasswords()});
   if(req.method==='GET')return json(action==='accounts'?{accounts:await adminAccounts()}:await loadOverview(null));
   if(action==='accounts'&&req.method==='POST'){const b=await req.json();if(typeof b.id!=='string'||!Number.isSafeInteger(b.version)||b.version<0||typeof b.username!=='string'||typeof b.enabled!=='boolean'||(b.password!==undefined&&typeof b.password!=='string'))return json({error:'Invalid account update.'},400);return json({account:publicAccount(await updateAccount(b.id,b.version,{username:b.username,enabled:b.enabled,...(b.password?{password:b.password}:{})}))});}
   return json({error:'Not allowed'},405);
  }
  const account=await accountForSession(token);if(!account)return json({error:'Please sign in to your manager account.'},401);
  if(MANAGER_POSTER_ONLY&&!fullManagerAccess(account))return json({error:'This section is temporarily unavailable. Please use the poster generator.'},403);
  if(action==='reminders'&&req.method==='GET')return json({reminders:(await listReminders()).filter(r=>reminderDue(r)&&(r.all||r.managerKeys.includes(account.manager_key)))});
  if(action==='inactive'&&req.method==='GET')return json(await loadInactiveCreators(account.manager_key));
  if(action==='leaderboard'&&req.method==='GET'){const saved=await database().from('poster_templates').select('template_json').eq('name','manager-assignment-settings').maybeSingle();if(saved.error)throw Error(saved.error.message);const bTier=(saved.data?.template_json?.assignments?.bTierManagers||[]) as string[],tier=bTier.some(key=>recruitmentManagerIdentity(key)===account.manager_key)?'B':'A',response=await recruitmentLeaderboard(new Request(req.nextUrl.origin+'/api/data-analysis/recruitment-leaderboard?period=month&tier='+tier));if(!response.ok)throw Error('Could not load the manager leaderboard. Please retry.');const data=await response.json();return json({tier,endDate:data.endDate,managers:(data.managers||[]).filter((m:{group:string})=>m.group==='Team Dan / James'||m.group==='Team Mike / Indi')});}
  if(action==='development'&&req.method==='GET')return json(await loadCreatorDevelopment(account.manager_key));
  if(action==='overview'&&req.method==='GET')return json({...await loadOverview(account.manager_key),quoteSeed:Number(account.number)});
  return json({error:'Not found'},404);
 }catch(e){return json({error:e instanceof Error?e.message:'Unable to complete this request.'},400);}
}
export const GET=handle;export const POST=handle;
