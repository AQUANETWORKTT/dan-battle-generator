// Load private connection settings into the child process, never a report file.
const path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../..');require('@next/env').loadEnvConfig(root);
const python=process.env.CREATOR_SEARCH_PYTHON||['C:\\Python314\\python.exe',path.join(process.env.LOCALAPPDATA||'','Programs','Python','Python314','python.exe')].find(p=>fs.existsSync(p))||'python';
const child=spawn(python,['-u',path.join(__dirname,'creator_reports.py')],{cwd:root,env:{...process.env,PYTHONIOENCODING:'utf-8'},stdio:'inherit'});
child.on('error',()=>{console.error('Could not open Python. Install the report requirements first.');process.exitCode=1;});child.on('exit',code=>{process.exitCode=code||0;});
