import {NextRequest,NextResponse} from 'next/server';
import {SEARCH_COOKIE,searchSessionValid} from '@/lib/creator-api-search/auth';
import {managerViewAllowed,managerViewToken,creatorActionToken,creatorActionIdentity} from '@/lib/available-creators-auth';
import {readAvailableCreators,updateAvailableCreator,markAvailableCreatorMessaged,hideAvailableCreator,dismissAvailableCreator} from '@/lib/available-creators-store';
import {SearchError} from '@/lib/creator-api-search/service';
import {ProviderError} from '@/lib/creator-api-search/provider';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=60;
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
function leadership(req:NextRequest){return req.cookies.get('first-class-space-auth')?.value==='true'&&searchSessionValid(req.cookies.get(SEARCH_COOKIE)?.value);}
async function handle(req:NextRequest){
  if(['atlas','events'].includes(process.env.SITE_MODE||''))return NextResponse.json({error:'Not found'},{status:404,headers});
  const admin=leadership(req),manager=managerViewAllowed(req.nextUrl.searchParams.get('access'));
  if(!admin&&!manager)return NextResponse.json({error:'Use your manager link or sign in through Leadership.'},{status:401,headers});
  if(req.method==='POST'&&req.headers.get('origin')&&req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Invalid request origin.'},{status:403,headers});
  try{
    if(req.method==='GET'){const data=await readAvailableCreators();return NextResponse.json({...data,rows:data.rows.filter(row=>!manager||!row.hiddenFromManager).map(row=>({...row,actionToken:manager?creatorActionToken(row):undefined}))},{headers});}
    const body=await req.json();
    if(body.action==='messaged'||body.action==='hide'||body.action==='dismiss'){
      if(!manager)return NextResponse.json({error:'Use a current manager link to mark messages.'},{status:403,headers});
      const identity=creatorActionIdentity(body.actionToken,body.username);
      if(!identity)return NextResponse.json({error:'Refresh the panel and try again.'},{status:403,headers});
      return NextResponse.json(body.action==='dismiss'?await dismissAvailableCreator(identity):body.action==='hide'?await hideAvailableCreator(identity):await markAvailableCreatorMessaged(body.username,body.messaged,identity),{headers});
    }
    if(!admin)return NextResponse.json({error:'Leadership access required.'},{status:401,headers});
    if(body.action==='share')return NextResponse.json({path:'/available-creators?access='+encodeURIComponent(managerViewToken()),expiresInDays:30},{headers});
    if(body.action==='enrich')return NextResponse.json(await updateAvailableCreator(body.username,body.includeHistory===true,body.historyDays??3),{headers});
    return NextResponse.json({error:'Choose a valid panel action.'},{status:400,headers});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not load Available Creators.',...(error instanceof ProviderError?{retryAt:error.retryAt,quota:error.quota,retryable:error.retryable}:{})},{status:error instanceof SearchError||error instanceof ProviderError?error.status:500,headers});}
}
export const GET=handle;
export const POST=handle;
