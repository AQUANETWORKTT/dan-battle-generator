import 'server-only';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {readFile,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const folder=path.join(process.cwd(),'.next','cache','first-class-portal');
const revisionFile=path.join(folder,'revision');
const pending=new Map<string,Promise<string>>();
export function invalidateLocalPortal(){if(process.env.NODE_ENV!=='development')return;mkdirSync(folder,{recursive:true});writeFileSync(revisionFile,randomUUID(),{mode:0o600});}
export async function localPortalSnapshot(key:unknown[],build:()=>Promise<string>){
 if(process.env.NODE_ENV!=='development')return build();
 mkdirSync(folder,{recursive:true});let revision='initial';try{revision=readFileSync(revisionFile,'utf8');}catch{}
 const file=path.join(folder,createHash('sha256').update(JSON.stringify([revision,...key])).digest('hex')+'.snapshot');
 try{return await readFile(file,'utf8');}catch{}
 const existing=pending.get(file);if(existing)return existing;
 const work=(async()=>{const value=await build(),tmp=file+'.'+randomUUID()+'.tmp';try{await writeFile(tmp,value,{mode:0o600});await rename(tmp,file);}finally{await unlink(tmp).catch(()=>{});}return value;})();pending.set(file,work);try{return await work;}finally{pending.delete(file);}
}
