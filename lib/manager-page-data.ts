'use client';

// Navigation reuses these responses until a refresh, logout or new overview.
// Failed requests are removed so revisiting the page can retry.
const responses=new Map<string,Promise<Response>>();
export function clearManagerPageData(){responses.clear();}
export async function managerPageFetch(url:string){
 let pending=responses.get(url);
 if(!pending){
  pending=fetch(url,{cache:'no-store'}).then(response=>{
   if(!response.ok){responses.delete(url);throw Error('Could not load saved poster designs. Please try again.');}
   return response;
  }).catch(error=>{responses.delete(url);throw error;});
  responses.set(url,pending);
 }
 return (await pending).clone();
}
