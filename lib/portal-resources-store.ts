import 'server-only';
import {database} from './creator-api-search/db';
import {RESOURCE_DEFAULTS,type ResourceItem} from './portal-resources-types';
export const RESOURCE_BUCKET='manager-portal-resources';
const prefix='portal-resource-v1:';
export async function resources(){const map=new Map(RESOURCE_DEFAULTS.map(x=>[x.id,x]));for(let from=0;;from+=500){const r=await database().from('poster_templates').select('template_json').like('name',prefix+'%').order('name').range(from,from+499);if(r.error)throw Error(r.error.message);for(const row of r.data||[]){const item=row.template_json as ResourceItem;map.set(item.id,item);}if((r.data||[]).length<500)break;}return [...map.values()].filter(x=>!x.deleted);}
export async function writeResource(item:ResourceItem){const r=await database().from('poster_templates').upsert({name:prefix+item.id,template_json:item,background_url:null,updated_at:new Date().toISOString()},{onConflict:'name'});if(r.error)throw Error(r.error.message);}
export async function resourceBucket(){const db=database();const r=await db.storage.getBucket(RESOURCE_BUCKET);if(!r.error)return;if(!/not found/i.test(r.error.message)&&String(r.error.status)!=='404')throw Error(r.error.message);const made=await db.storage.createBucket(RESOURCE_BUCKET,{public:false,fileSizeLimit:50*1024*1024});if(made.error&&!/exists/i.test(made.error.message))throw Error(made.error.message);}
