#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const treeKill = require('tree-kill'); // Ensure you install this: npm install tree-kill

function startProcess(command, args, options = {}) {
  console.log(`Starting: ${command} ${args.join(' ')}`);
  const proc = spawn(command, args, { 
    shell: true,
    ...options 
  });
  
  proc.stdout.on('data', data => {
    process.stdout.write(data);
  });
  
  proc.stderr.on('data', data => {
    process.stderr.write(data);
  });
  
  proc.on('close', code => {
    console.log(`Process ${command} exited with code ${code}`);
  });
  
  return proc;
}

function runServer() {
  console.log('Starting Node.js server...');
  return startProcess('node', ['server.js']);
}

function runElectron() {
  console.log('Starting Electron with production Angular build...');
  const clientDir = path.join(process.cwd(), 'client');
  return startProcess('npm', ['run', 'electron:run'], { cwd: clientDir });
}

const nodeProc = runServer();
const electronProc = runElectron();

// When the Electron process closes, trigger cleanup.
electronProc.on('close', () => {
  console.log('Electron process closed, cleaning up server...');
  cleanup();
});

function cleanup() {
  console.log('Terminating child processes...');
  if (nodeProc && !nodeProc.killed) {
    // Forcefully kill the Node.js server and its process tree.
    treeKill(nodeProc.pid, 'SIGKILL', (err) => {
      if (err) {
        console.error('Failed to kill Node server:', err);
      } else {
        console.log('Node server terminated.');
      }
      process.exit();
    });
  } else {
    process.exit();
  }
}

// Also clean up on SIGINT and SIGTERM signals (e.g., Ctrl+C)
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
