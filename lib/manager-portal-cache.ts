import 'server-only';
import {invalidateLocalPortal} from './local-portal-snapshot';
import {revalidateTag} from 'next/cache';
import {after} from 'next/server';
export const PORTAL_DATA_TAG='first-class-portal-data';
export function invalidatePortalData(){
 invalidateLocalPortal();
 // Expire immediately: a visitor must wait for fresh results, never receive
 // the previous upload while it revalidates in the background.
 revalidateTag(PORTAL_DATA_TAG,{expire:0});
 after(async()=>{
  try{
   const {prepareManagerPortals}=await import('./prepare-manager-portals');
   await prepareManagerPortals();
  }catch(error){
   console.error('Portal preparation failed',error instanceof Error?error.message:'Unknown error');
  }
 });
}
