import { spawn, spawnSync } from 'node:child_process';
import {
  ensurePortlessProxy,
  fallbackHost,
  fallbackUrlHost,
  forwardChildExit,
  getLocalServerCommand,
  getPortlessAppName,
  openInBrowser,
  portlessBin,
  portlessEnv,
  usePortless,
  waitForUrlReady,
} from './local-server-utils.mjs';
import { resolvePort } from './dev-server-utils.mjs';

const fallbackRequestedPort = Number(process.env.PORT) || 4173;

console.log('Building production preview with corepack yarn build...');

const build = spawnSync('corepack', ['yarn', 'build'], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const command = getLocalServerCommand();
let args;
let publicUrl = null;

if (command === portlessBin) {
  ensurePortlessProxy();
  const appName = getPortlessAppName();

  publicUrl = `https://${appName}.localhost`;
  args = [appName, 'vite', 'preview'];

  console.log(`Starting Portless production preview at ${publicUrl}`);
} else {
  const port = await resolvePort(fallbackRequestedPort, fallbackHost);
  const fallbackUrl = `http://${fallbackUrlHost}:${port}`;

  args = ['preview', '--host', fallbackHost, '--port', String(port), '--strictPort'];

  if (usePortless) {
    console.warn(`portless unavailable on this platform, using vite preview directly on ${fallbackUrl}`);
  } else {
    console.log(`Starting Vite production preview directly at ${fallbackUrl}`);
  }

  if (port !== fallbackRequestedPort) {
    console.log(`Preferred preview port ${fallbackRequestedPort} is busy, so this run will use ${fallbackUrl}.`);
  }
}

const child = spawn(command, args, {
  stdio: 'inherit',
  env: command === portlessBin ? portlessEnv : process.env,
});

if (publicUrl && process.env.BROWSER !== 'none') {
  waitForUrlReady(publicUrl, 30_000)
    .then(() => {
      console.log(`Opening ${publicUrl} in browser...`);
      openInBrowser(publicUrl);
    })
    .catch((error) => {
      console.warn(`Could not auto-open ${publicUrl}: ${error.message}`);
    });
}

forwardChildExit(child);
