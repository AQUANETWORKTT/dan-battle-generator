// Load server-side local settings without displaying credentials.
const path = require('node:path');
const {spawn} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
require('@next/env').loadEnvConfig(root);
const child = spawn('python', [path.join(__dirname, 'worker.py'), ...process.argv.slice(2)], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});
child.on('error', () => {
  console.error('Could not start Python. Install Python and the checker requirements first.');
  process.exitCode = 1;
});
child.on('exit', code => {process.exitCode = code ?? 1;});
