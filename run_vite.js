const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'vite_output.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

logStream.write(`\n--- Starting Vite at ${new Date().toISOString()} ---\n`);

const child = spawn(
  path.join(__dirname, '.node/bin/node'),
  [path.join(__dirname, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1'],
  {
    cwd: __dirname,
    env: {
      ...process.env,
      PATH: `${path.join(__dirname, '.node/bin')}:${process.env.PATH}`
    }
  }
);

child.stdout.on('data', (data) => {
  logStream.write(data);
  console.log(data.toString());
});

child.stderr.on('data', (data) => {
  logStream.write(data);
  console.error(data.toString());
});

child.on('close', (code) => {
  logStream.write(`\n--- Vite exited with code ${code} ---\n`);
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
  process.exit(0);
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
  process.exit(0);
});
