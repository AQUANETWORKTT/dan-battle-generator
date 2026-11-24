import JSZip from 'jszip';

// Package the existing PNG bytes only. No scraping or poster rendering belongs
// in the download path. A failed image aborts the archive rather than omitting it.
export async function preparedPosterArchive(
 posters:{name:string;label:string}[],
 date:string,
 fetchImage:(name:string)=>Promise<Uint8Array>,
 onProgress?:(completed:number,total:number)=>void,
){
 const zip=new JSZip(),used=new Set<string>();let completed=0;
 for(let start=0;start<posters.length;start+=3){
  const batch=await Promise.all(posters.slice(start,start+3).map(async poster=>({poster,bytes:await fetchImage(poster.name)})));
  for(const {poster,bytes} of batch){
   const label=poster.label.replace(/[^a-z0-9 _+-]/gi,'')||poster.name.replace(/[^a-z0-9_-]/gi,'');
   let filename=`${label}-${date}.png`,suffix=2;
   while(used.has(filename.toLowerCase()))filename=`${label}-${date}-${suffix++}.png`;
   used.add(filename.toLowerCase());zip.file(filename,bytes);onProgress?.(++completed,posters.length);
  }
 }
 return zip.generateAsync({type:'uint8array',compression:'STORE'});
}
