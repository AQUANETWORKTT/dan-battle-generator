import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {database} from '@/lib/creator-api-search/db';
import {SEARCH_COOKIE,searchSessionValid} from '@/lib/creator-api-search/auth';
import {MASTER_NOTE_PREFIX,masterNoteName,encryptMasterNote,decryptMasterNote} from '@/lib/master-creator-notes';
export const dynamic='force-dynamic';
async function handle(request:NextRequest){
 const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 if(!searchSessionValid(request.cookies.get(SEARCH_COOKIE)?.value))return json({error:'Owner access required.'},401);
 if(['atlas','events'].includes(process.env.SITE_MODE||''))return json({error:'Not found.'},404);
 if(request.method!=='GET'&&request.headers.get('origin')!==request.nextUrl.origin)return json({error:'Invalid request origin.'},403);
 try{
  const db=database();
  if(request.method==='GET'){
   const notes:Record<string,{text:string;revision:string;updatedAt:string}>={};
   for(let from=0;;from+=500){
    const page=await db.from('poster_templates').select('name,template_json,updated_at').like('name',MASTER_NOTE_PREFIX+'%').order('name').range(from,from+499);
    if(page.error)throw Error(page.error.message);
    for(const row of page.data){const value=row.template_json;notes[decodeURIComponent(row.name.slice(MASTER_NOTE_PREFIX.length))]={text:decryptMasterNote(row.name,value.encrypted),revision:value.revision,updatedAt:row.updated_at};}
    if(page.data.length<500)break;
   }
   return json({notes});
  }
  const body=await request.json();
  if(typeof body.creatorId!=='string'||!body.creatorId.trim()||body.creatorId.length>200||typeof body.text!=='string'||body.text.length>10000||(body.revision!==null&&typeof body.revision!=='string'))return json({error:'Enter a note up to 10,000 characters.'},400);
  const name=masterNoteName(body.creatorId),old=await db.from('poster_templates').select('id,template_json').eq('name',name).maybeSingle();
  if(old.error)throw Error(old.error.message);
  if((old.data?.template_json?.revision||null)!==body.revision)return json({error:'This note changed in another window. Your draft is kept. Reload notes before saving.'},409);
  const revision=randomUUID(),updatedAt=new Date().toISOString(),values={name,background_url:null,updated_at:updatedAt,template_json:{revision,encrypted:encryptMasterNote(name,body.text)}};
  const saved=old.data?await db.from('poster_templates').update(values).eq('id',old.data.id).eq('template_json->>revision',body.revision).select('id').maybeSingle():await db.from('poster_templates').insert(values).select('id').maybeSingle();
  if(saved.error?.code==='23505'||!saved.error&&!saved.data)return json({error:'This note changed while saving. Your draft is kept. Reload notes before saving.'},409);
  if(saved.error)throw Error(saved.error.message);
  return json({note:{text:body.text,revision,updatedAt}});
 }catch{return json({error:'Could not load or save master notes. Your draft has been kept.'},500);}
}
export const GET=handle;export const PUT=handle;
