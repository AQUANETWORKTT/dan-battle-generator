import fs from 'node:fs';
const r=await fetch('https://www.tikleap.com/api-docs',{signal:AbortSignal.timeout(20000)});const html=await r.text();fs.writeFileSync('tmp/tikleap-api-docs.html',html);
console.log('status',r.status,'length',html.length);
console.log('scripts',Array.from(html.matchAll(/<script[^>]+src=["']([^"']+)/g),m=>m[1]));
for(const needle of ['api-docs','/leagues','/creators','openapi','endpoints','View example']){let i=html.indexOf(needle);console.log(needle,i,i>=0?html.slice(Math.max(0,i-180),i+900):'');}
