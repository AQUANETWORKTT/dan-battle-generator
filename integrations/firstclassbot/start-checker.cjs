// Load server-side local settings without displaying credentials.
const path = require('node:path');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname, '../..');
require('@next/env').loadEnvConfig(root);
const logPath = path.join(__dirname, 'checker.log');
const log = fs.createWriteStream(logPath, {flags:'a'});
function report(value){process.stdout.write(value);log.write(value);}
const lock = net.createServer(socket=>socket.end());
const suffix = createHash('sha256').update(root).digest('hex').slice(0,16);
const endpoint = process.platform==='win32'?'\\\\.\\pipe\\firstclass-checker-'+suffix:path.join(__dirname,'.checker-'+suffix+'.sock');
lock.on('error',error=>{
  report(error.code==='EADDRINUSE'?'The Backstage checker is already running. Keep its existing browser open; do not start another copy.\n':'Could not start the checker lock: '+error.code+'\n');
  log.end();process.exitCode=error.code==='EADDRINUSE'?0:1;
});
lock.listen(endpoint,()=>{
 report('\nBackstage availability checker — '+new Date().toISOString()+'\n');
 report('Keep this window open. Backstage connects automatically after you sign in.\n');
 const child=spawn('python',['-u',path.join(__dirname,'worker.py'),...process.argv.slice(2)],{cwd:root,env:process.env,stdio:['inherit','pipe','pipe']});
 child.stdout.on('data',data=>report(data.toString()));
 child.stderr.on('data',data=>report(data.toString()));
 child.on('error',()=>{report('Could not start Python. Install Python and the checker requirements first.\n');lock.close();log.end();process.exitCode=1;});
 child.on('exit',code=>{if(code)report('The checker stopped with an error. Details are saved in integrations/firstclassbot/checker.log.\n');lock.close();log.end();process.exitCode=code??1;});
});
