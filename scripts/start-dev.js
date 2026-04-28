import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { get as httpGet } from 'node:http';
import { get as httpsGet } from 'node:https';
import { resolvePort } from './dev-server-utils.mjs';

const isWindows = process.platform === 'win32';
const usePortless = process.env.PORTLESS !== '0' && !isWindows;
const binDir = join(process.cwd(), 'node_modules', '.bin');
const executableSuffix = isWindows ? '.cmd' : '';
const portlessBin = join(binDir, `portless${executableSuffix}`);
const viteBin = join(binDir, `vite${executableSuffix}`);
const fallbackHost = '127.0.0.1';
const fallbackUrlHost = 'localhost';
const fallbackRequestedPort = Number(process.env.PORT) || 3000;
const portlessProxyPort = process.env.PORTLESS_PORT || '443';
const portlessEnv = {
  ...process.env,
  PORTLESS_PORT: portlessProxyPort,
  PORTLESS_HTTPS: process.env.PORTLESS_HTTPS ?? '1',
  PORTLESS_LAN: process.env.PORTLESS_LAN ?? '0',
};

function sanitizeLabel(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function getCurrentBranch() {
  const result = spawnSync('git', ['branch', '--show-current'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim() || null;
}

function getActivePortlessRouteHosts() {
  const result = spawnSync(portlessBin, ['list'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    return new Set();
  }

  const matches = result.stdout.match(/https?:\/\/[a-z0-9.-]+\.localhost(?::\d+)?/g) || [];

  return new Set(matches.map((url) => new URL(url).hostname));
}

function isRouteBusy(activeRouteHosts, appName) {
  return activeRouteHosts.has(`${appName}.localhost`);
}

function getPreferredPortlessAppName(activeRouteHosts) {
  const branch = getCurrentBranch();
  const branchLabel = sanitizeLabel(branch || 'current');

  if (branch && branch !== 'master' && branch !== 'main') {
    return `${branchLabel}.seedit`;
  }

  if (isRouteBusy(activeRouteHosts, 'seedit')) {
    return `${branchLabel}.seedit`;
  }

  return 'seedit';
}

function getPortlessAppName() {
  const activeRouteHosts = getActivePortlessRouteHosts();
  const preferredAppName = getPreferredPortlessAppName(activeRouteHosts);

  if (!isRouteBusy(activeRouteHosts, preferredAppName)) {
    return preferredAppName;
  }

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${preferredAppName}-${suffix}`;

    if (!isRouteBusy(activeRouteHosts, candidate)) {
      return candidate;
    }
  }

  return `${preferredAppName}-${Date.now()}`;
}

function ensurePortlessProxy() {
  const result = spawnSync(portlessBin, ['proxy', 'start', '--port', portlessProxyPort, '--https'], {
    cwd: process.cwd(),
    env: portlessEnv,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const command = usePortless && existsSync(portlessBin) ? portlessBin : viteBin;
let args;
let publicUrl = null;

if (command === portlessBin) {
  ensurePortlessProxy();
  const appName = getPortlessAppName();

  publicUrl = `https://${appName}.localhost`;
  args = [appName, 'vite'];

  if (appName !== 'seedit') {
    console.log(`Starting Portless dev server at ${publicUrl}`);
  }
} else {
  const port = await resolvePort(fallbackRequestedPort, fallbackHost);
  const fallbackUrl = `http://${fallbackUrlHost}:${port}`;

  args = ['--host', fallbackHost, '--port', String(port), '--strictPort'];

  if (command !== portlessBin && process.env.PORTLESS !== '0') {
    console.warn(`portless unavailable on this platform, using vite directly on ${fallbackUrl}`);
  } else {
    console.log(`Starting Vite directly at ${fallbackUrl}`);
  }

  if (port !== fallbackRequestedPort) {
    console.log(`Preferred port ${fallbackRequestedPort} is busy, so this run will use ${fallbackUrl}.`);
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

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

async function waitForUrlReady(url, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const ready = await new Promise((resolve) => {
      const parsedUrl = new URL(url);
      const getUrl = parsedUrl.protocol === 'https:' ? httpsGet : httpGet;
      const onResponse = (response) => {
        response.resume();
        const statusCode = response.statusCode ?? 500;
        resolve(statusCode >= 200 && statusCode < 400);
      };
      const request = parsedUrl.protocol === 'https:' ? getUrl(parsedUrl, { rejectUnauthorized: false }, onResponse) : getUrl(parsedUrl, onResponse);

      request.on('error', () => resolve(false));
      request.setTimeout(2_000, () => {
        request.destroy();
        resolve(false);
      });
    });

    if (ready) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function openInBrowser(url) {
  const opener =
    process.platform === 'darwin'
      ? { cmd: 'open', args: [url] }
      : process.platform === 'win32'
        ? { cmd: 'cmd', args: ['/c', 'start', '""', url] }
        : { cmd: 'xdg-open', args: [url] };

  spawn(opener.cmd, opener.args, { stdio: 'ignore', detached: true }).unref();
}
