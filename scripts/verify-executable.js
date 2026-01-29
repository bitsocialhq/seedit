#!/usr/bin/env node
/**
 * Verify that a packaged Electron executable starts correctly.
 * This script launches the executable and checks that the RPC port (9138) becomes available.
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { createServer } from 'net';

const executablePath = process.argv[2];
const rpcPort = 9138;
const timeout = 30000; // 30 seconds

if (!executablePath) {
  console.error('Usage: node scripts/verify-executable.js <executable-path>');
  process.exit(1);
}

if (!existsSync(executablePath)) {
  console.error(`Error: Executable not found: ${executablePath}`);
  process.exit(1);
}

console.log(`Starting executable: ${executablePath}`);
console.log(`Checking for RPC port ${rpcPort}...`);

// Start the executable
const appProcess = spawn(executablePath, [], {
  detached: false,
  stdio: 'pipe',
});

let appExited = false;
let portAvailable = false;
let timeoutId;

// Check if port is in use (app is running)
function checkPort() {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(rpcPort, '127.0.0.1', () => {
      server.close();
      resolve(false); // Port is available (not in use yet)
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true); // Port is in use (app is running - success!)
      } else {
        resolve(false);
      }
    });
  });
}

// Monitor app process
appProcess.on('exit', (code, signal) => {
  appExited = true;
  if (code !== null && code !== 0) {
    console.error(`App exited with code ${code}`);
    cleanup();
    process.exit(1);
  }
});

appProcess.stderr.on('data', (data) => {
  const text = data.toString();
  // Filter out common harmless errors
  if (!text.includes('Gtk') && !text.includes('libnotify')) {
    console.error('stderr:', text);
  }
});

// Poll for port availability
async function pollPort() {
  const maxAttempts = 30; // 30 attempts over 30 seconds
  let attempts = 0;
  let pollTimeoutId;

  const tick = async () => {
    attempts++;
    const inUse = await checkPort();

    if (inUse) {
      portAvailable = true;
      console.log(`✓ RPC port ${rpcPort} is in use (app is running)`);
      clearTimeout(pollTimeoutId);
      clearTimeout(timeoutId);
      cleanup();
      process.exit(0);
      return;
    }

    if (attempts >= maxAttempts || appExited) {
      clearTimeout(pollTimeoutId);
      clearTimeout(timeoutId);
      if (!portAvailable) {
        console.error(`✗ RPC port ${rpcPort} did not become available within ${timeout / 1000} seconds`);
        cleanup();
        process.exit(1);
      }
      return;
    }

    pollTimeoutId = setTimeout(tick, 1000);
  };

  pollTimeoutId = setTimeout(tick, 1000);
}

// Set overall timeout
timeoutId = setTimeout(() => {
  if (!portAvailable) {
    console.error(`✗ Timeout: RPC port ${rpcPort} did not become available within ${timeout / 1000} seconds`);
    cleanup();
    process.exit(1);
  }
}, timeout);

function cleanup() {
  try {
    if (appProcess && !appProcess.killed) {
      appProcess.kill();
      // Also try to kill any child processes
      if (appProcess.pid) {
        try {
          process.kill(appProcess.pid, 'SIGTERM');
        } catch (e) {
          // Ignore errors
        }
      }
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

// Handle process termination
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start polling
pollPort();
