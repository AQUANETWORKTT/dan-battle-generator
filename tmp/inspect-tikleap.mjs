for(const path of ['/', '/leagues?region=GB', '/docs', '/openapi.json']) {
 try {const r=await fetch('https://api.tikleap.com'+path,{signal:AbortSignal.timeout(15000),redirect:'follow'});const t=await r.text();console.log(JSON.stringify({path,status:r.status,url:r.url,type:r.headers.get('content-type'),body:t.slice(0,1800)}));}catch(e){console.log(JSON.stringify({path,error:e.message}));}
}
