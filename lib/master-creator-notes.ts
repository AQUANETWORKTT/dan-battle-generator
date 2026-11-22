import 'server-only';
import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
export const MASTER_NOTE_PREFIX='master-creator-note-v1:';
export function masterNoteName(id:string){return MASTER_NOTE_PREFIX+encodeURIComponent(id);}
function key(){
 const secret=process.env.CREATOR_SEARCH_SESSION_SECRET||process.env.SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY||'';
 if(secret.length<32)throw Error('Private note storage is not configured.');
 return createHash('sha256').update('master-creator-notes-v1:'+secret).digest();
}
export function encryptMasterNote(name:string,text:string){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);cipher.setAAD(Buffer.from(name));
 const data=Buffer.concat([cipher.update(text,'utf8'),cipher.final()]);
 return {iv:iv.toString('base64'),data:data.toString('base64'),tag:cipher.getAuthTag().toString('base64')};
}
export function decryptMasterNote(name:string,value:{iv:string;data:string;tag:string}){
 const decipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(value.iv,'base64'));decipher.setAAD(Buffer.from(name));decipher.setAuthTag(Buffer.from(value.tag,'base64'));
 return Buffer.concat([decipher.update(Buffer.from(value.data,'base64')),decipher.final()]).toString('utf8');
}
