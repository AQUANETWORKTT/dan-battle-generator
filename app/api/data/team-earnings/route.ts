import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {SEARCH_COOKIE,searchSessionValid} from '@/lib/creator-api-search/auth';
import {database} from '@/lib/creator-api-search/db';
import {loadTeamEarningsSources,earningsExchangeRate} from '@/lib/team-earnings-server';
import {defaultEarningsSettings,EARNINGS_GROUPS,resolveEarningsManagers,type EarningsSettings} from '@/lib/team-earnings';
export const dynamic='force-dynamic';
export const maxDuration=120;
const name=(month:string)=>'team-earnings-settings-v1:'+month;
function percent(value:unknown){if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100)throw Error('Percentages must be between 0 and 100.');return value;}
function validate(input:any,old:EarningsSettings):EarningsSettings{
 const result=defaultEarningsSettings();
 result.incrementalOverride=input.incrementalOverride===null?null:percent(input.incrementalOverride);
 if(input.usdToGbpOverride!==null&&(!Number.isFinite(input.usdToGbpOverride)||input.usdToGbpOverride<=0||input.usdToGbpOverride>10))throw Error('Enter a valid pounds-per-dollar exchange rate.');
 result.usdToGbpOverride=input.usdToGbpOverride;
 for(const group of EARNINGS_GROUPS){const v=input.groups?.[group];result.groups[group]={ownerPercent:percent(v?.ownerPercent),managerPercent:percent(v?.managerPercent),juniorPercent:percent(v?.juniorPercent)};}
 for(const [key,value] of Object.entries(input.overrides||{})){if(key.length>150)throw Error('Invalid team.');result.overrides[key]=percent(value);}
 for(const [key,value] of Object.entries(input.parents||{})){if(typeof value!=='string'&&value!==null)throw Error('Invalid manager parent.');result.parents[key]=value as string|null;}
 result.incentives=old.incentives;return result;
}
async function handle(request:NextRequest){
 const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
 if(!searchSessionValid(request.cookies.get(SEARCH_COOKIE)?.value))return json({error:'Leadership access required.'},401);
 if(['atlas','events'].includes(process.env.SITE_MODE||''))return json({error:'Not found'},404);
 const expected=request.nextUrl.protocol+'//'+(request.headers.get('host')||request.nextUrl.host);
 if(request.method!=='GET'&&request.headers.get('origin')&&request.headers.get('origin')!==expected)return json({error:'Invalid request origin.'},403);
 try{
  const sources=await loadTeamEarningsSources(),db=database(),stored=await db.from('poster_templates').select('id,updated_at,template_json').eq('name',name(sources.month)).maybeSingle();if(stored.error)throw Error(stored.error.message);
  const settings={...defaultEarningsSettings(),...stored.data?.template_json} as EarningsSettings;
  if(request.method==='GET'){
   let fx:Awaited<ReturnType<typeof earningsExchangeRate>>|null=null,fxError='';
   try{fx=await earningsExchangeRate(settings.usdToGbpOverride);}catch(error){fxError=error instanceof Error?error.message:'Exchange rate unavailable.';}
   return json({...sources,settings,updatedAt:stored.data?.updated_at||null,fx,fxError});
  }
  const body=await request.json();
  if(body.updatedAt!==(stored.data?.updated_at||null))return json({error:'Someone else updated these earnings settings. Reload before saving.'},409);
  let next=settings;
  if(request.method==='PUT'){
   next=validate(body.settings,settings);resolveEarningsManagers(sources.managers,next);
  }else if(request.method==='POST'&&body.action==='add-incentive'){
   const creator=String(body.creator||'').trim().replace(/^@/,''),description=String(body.description||'').trim(),amount=Number(body.amount);
   if(!creator||creator.length>100||!description||description.length>300||!Number.isFinite(amount)||amount<.01||amount>1000000||Math.abs(amount*100-Math.round(amount*100))>.000001||!['USD','GBP'].includes(body.currency))return json({error:'Enter a creator, incentive, positive amount with up to two decimals, and currency.'},400);
   const fx=body.currency==='GBP'?{rate:1,date:new Date().toISOString().slice(0,10)}:await earningsExchangeRate(settings.usdToGbpOverride),amountCents=Math.round(amount*100);
   next={...settings,incentives:[...settings.incentives,{id:randomUUID(),creator,description,currency:body.currency,amountCents,gbpCents:Math.round(amountCents*fx.rate),rate:fx.rate,rateDate:fx.date,createdAt:new Date().toISOString()}]};
  }else if(request.method==='POST'&&body.action==='remove-incentive')next={...settings,incentives:settings.incentives.filter(i=>i.id!==body.id)};
  else return json({error:'Invalid earnings action.'},400);
  const updatedAt=new Date().toISOString(),values={name:name(sources.month),template_json:next,updated_at:updatedAt,background_url:null};
  const saved=stored.data?await db.from('poster_templates').update(values).eq('id',stored.data.id).eq('updated_at',stored.data.updated_at).select('updated_at').maybeSingle():await db.from('poster_templates').insert(values).select('updated_at').maybeSingle();
  if(saved.error?.code==='23505'||!saved.error&&!saved.data)return json({error:'Settings changed while saving. Reload and try again.'},409);
  if(saved.error)throw Error(saved.error.message);
  let fx=null;try{fx=await earningsExchangeRate(next.usdToGbpOverride);}catch{}
  return json({settings:next,updatedAt:saved.data!.updated_at,fx});
 }catch(error){return json({error:error instanceof Error?error.message:'Could not load earnings.'},400);}
}
export const GET=handle;export const PUT=handle;export const POST=handle;
