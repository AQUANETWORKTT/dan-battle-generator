// Run after `npm run build`: verify what the serverless deployment will copy,
// not just whether Playwright works from this development node_modules folder.
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const routes=['team-poster-preparation','team-poster-preparation/run','team-poster-templates','data-analysis/import','data-analysis/manager-assignments','data-analysis/excluded-creators','data-analysis/fallback-avatars'];
const required=['node_modules/playwright-core/browsers.json','node_modules/playwright-core/index.js','node_modules/playwright-core/lib/coreBundle.js','node_modules/@sparticuz/chromium/bin/chromium.br','public/fonts/Norwester.otf'];
let coreFiles=[];
for(const route of routes){
 const manifest=path.resolve('.next/server/app/api',route,'route.js.nft.json');assert(fs.existsSync(manifest),'Build first: missing '+manifest);
 const files=JSON.parse(fs.readFileSync(manifest,'utf8')).files.map(file=>path.resolve(path.dirname(manifest),file));
 for(const file of required)assert(files.includes(path.resolve(file)),`${route} is missing runtime asset ${file}`);
 if(route==='team-poster-preparation')coreFiles=files.filter(file=>file.startsWith(path.resolve('node_modules/playwright-core')+path.sep));
}
const stage=fs.mkdtempSync(path.join(os.tmpdir(),'poster-renderer-bundle-'));const packageRoot=path.resolve('node_modules/playwright-core');
for(const file of coreFiles){const target=path.join(stage,'node_modules/playwright-core',path.relative(packageRoot,file));fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);}
const result=spawnSync(process.execPath,['-e',"const {chromium}=require('./node_modules/playwright-core');if(chromium.name()!=='chromium')throw Error('Browser driver unavailable');console.log('Isolated deployed Playwright package loads successfully.');"],{cwd:stage,encoding:'utf8',env:{...process.env,NODE_PATH:''}});
assert.equal(result.status,0,result.stderr||result.stdout);
console.log(result.stdout.trim());console.log(`PASS: all ${routes.length} worker entry points include browsers.json, the complete driver, Chromium binary and fonts (${coreFiles.length} traced Playwright files).`);
