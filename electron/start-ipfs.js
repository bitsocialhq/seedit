import isDev from 'electron-is-dev';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs-extra';
import ps from 'node:process';
import proxyServer from './proxy-server.js';
import tcpPortUsed from 'tcp-port-used';
import EnvPaths from 'env-paths';
import { fileURLToPath } from 'url';
const dirname = path.join(path.dirname(fileURLToPath(import.meta.url)));
const envPaths = EnvPaths('plebbit', { suffix: false });

// use this custom function instead of spawnSync for better logging
// also spawnSync might have been causing crash on start on windows
const spawnAsync = (...args) =>
  new Promise((resolve, reject) => {
    const spawnedProcess = spawn(...args);
    spawnedProcess.on('exit', (exitCode, signal) => {
      if (exitCode === 0) resolve();
      else reject(Error(`spawnAsync process '${spawnedProcess.pid}' exited with code '${exitCode}' signal '${signal}'`));
    });
    // Always surface errors from short-lived commands
    spawnedProcess.stderr.on('data', (data) => console.error(data.toString()));
    // Short-lived command stdout can be useful in dev, but is noisy in prod
    if (isDev) {
      spawnedProcess.stdout.on('data', (data) => console.log(data.toString()));
    } else {
      // Drain to avoid backpressure without logging
      spawnedProcess.stdout.on('data', () => {});
    }
    spawnedProcess.on('error', (data) => console.error(data.toString?.() || String(data)));
  });

const startIpfs = async () => {
  const ipfsFileName = process.platform == 'win32' ? 'ipfs.exe' : 'ipfs';
  let ipfsPath = path.join(process.resourcesPath, 'bin', ipfsFileName);
  let ipfsDataPath = path.join(envPaths.data, 'ipfs');

  // test launching the ipfs binary in dev mode
  // they must be downloaded first using `yarn electron:build`
  if (isDev) {
    let binFolderName = 'win';
    if (process.platform === 'linux') {
      binFolderName = 'linux';
    }
    if (process.platform === 'darwin') {
      binFolderName = 'mac';
    }
    ipfsPath = path.join(dirname, '..', 'bin', binFolderName, ipfsFileName);
    ipfsDataPath = path.join(dirname, '..', '.plebbit', 'ipfs');
  }

  if (!fs.existsSync(ipfsPath)) {
    throw Error(`ipfs binary '${ipfsPath}' doesn't exist`);
  }

  console.log({ ipfsPath, ipfsDataPath });

  fs.ensureDirSync(ipfsDataPath);
  // Reduce IPFS daemon log verbosity in production to avoid UI lag from excessive logging
  const env = { ...process.env, IPFS_PATH: ipfsDataPath, ...(isDev ? {} : { GOLOG_LOG_LEVEL: 'error' }) };
  // init ipfs client on first launch
  try {
    await spawnAsync(ipfsPath, ['init'], { env, hideWindows: true });
  } catch {}

  // make sure repo is migrated
  try {
    await spawnAsync(ipfsPath, ['repo', 'migrate'], { env, hideWindows: true });
  } catch {}

  // dont use 8080 port because it's too common
  await spawnAsync(ipfsPath, ['config', '--json', 'Addresses.Gateway', '"/ip4/127.0.0.1/tcp/6473"'], {
    env,
    hideWindows: true,
  });

  // use different port with proxy for debugging during env
  let apiAddress = '/ip4/127.0.0.1/tcp/50019';
  if (isDev) {
    apiAddress = apiAddress.replace('50019', '50029');
    proxyServer.start({ proxyPort: 50019, targetPort: 50029 });
  }
  await spawnAsync(ipfsPath, ['config', 'Addresses.API', apiAddress], { env, hideWindows: true });

  const startIpfsDaemon = () =>
    new Promise((resolve, reject) => {
      const ipfsProcess = spawn(ipfsPath, ['daemon', '--migrate', '--enable-pubsub-experiment', '--enable-namesys-pubsub'], { env, hideWindows: true });
      console.log(`ipfs daemon process started with pid ${ipfsProcess.pid}`);
      let lastError;
      ipfsProcess.stderr.on('data', (data) => {
        lastError = data.toString();
        if (isDev) console.error(lastError);
      });
      ipfsProcess.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        if (isDev) console.log(text);
        if (text.includes('Daemon is ready')) {
          resolve();
        }
      });
      ipfsProcess.on('error', (err) => console.error(err?.toString?.() || String(err)));
      ipfsProcess.on('exit', () => {
        console.error(`ipfs process with pid ${ipfsProcess.pid} exited`);
        reject(Error(lastError));
      });
      process.on('exit', () => {
        try {
          ps.kill(ipfsProcess.pid);
        } catch (e) {
          console.log(e);
        }
        try {
          // sometimes ipfs doesnt exit unless we kill pid +1
          ps.kill(ipfsProcess.pid + 1);
        } catch (e) {
          console.log(e);
        }
      });
    });
  await startIpfsDaemon();
};

const DefaultExport = {};
export default DefaultExport;

const startIpfsAutoRestart = async () => {
  let pendingStart = false;
  const start = async () => {
    if (pendingStart) {
      return;
    }
    pendingStart = true;
    try {
      const started = await tcpPortUsed.check(isDev ? 50029 : 50019, '127.0.0.1');
      if (!started) {
        await startIpfs();
      }
    } catch (e) {
      console.log('failed starting ipfs', e);
      try {
        // try to run exported onError callback, can be undefined
        DefaultExport.onError(e)?.catch?.(console.log);
      } catch {}
    }
    pendingStart = false;
  };

  // retry starting ipfs every 1 second,
  // in case it was started by another client that shut down and shut down ipfs with it
  start();
  setInterval(() => {
    start();
  }, 1000);
};
startIpfsAutoRestart();
