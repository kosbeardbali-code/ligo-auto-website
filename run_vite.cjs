const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'vite_output.log');

function log(message) {
  fs.appendFileSync(logFile, message + '\n');
  console.log(message);
}

log(`\n--- Starting Vite at ${new Date().toISOString()} ---`);

try {
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
    log(`STDOUT: ${data.toString()}`);
  });

  child.stderr.on('data', (data) => {
    log(`STDERR: ${data.toString()}`);
  });

  child.on('error', (err) => {
    log(`ERROR: ${err.message}`);
  });

  child.on('close', (code) => {
    log(`--- Vite exited with code ${code} ---`);
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    child.kill('SIGINT');
    process.exit(0);
  });
} catch (e) {
  log(`SPAWN EXCEPTION: ${e.message}`);
}
