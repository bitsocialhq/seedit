import tcpPortUsed from 'tcp-port-used';
import { randomBytes } from 'crypto';
import fs from 'fs-extra';
import PKCRpc from '@pkcprotocol/pkc-js/rpc';
import path from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import { getPkcDataPath } from './pkc-paths.js';
import { createDefaultPkcOptions } from './pkc-rpc-options.js';
import { startPkcRpcServer } from './start-pkc-rpc-core.js';
const dirname = path.join(path.dirname(fileURLToPath(import.meta.url)));
const projectRoot = path.join(dirname, '..');

// Always run the local PKC RPC server on this port so all desktop clients can reuse it.
const port = 9138;
const defaultPkcOptions = createDefaultPkcOptions({
  // find the user's OS data path
  dataPath: getPkcDataPath({ isDev, projectRoot }),
});

// Generate the local PKC RPC auth key if it does not exist yet.
const pkcRpcAuthKeyPath = path.join(defaultPkcOptions.dataPath, 'auth-key');
let pkcRpcAuthKey;
try {
  pkcRpcAuthKey = fs.readFileSync(pkcRpcAuthKeyPath, 'utf8');
} catch (e) {
  pkcRpcAuthKey = randomBytes(32).toString('base64').replace(/[/+=]/g, '').substring(0, 40);
  fs.ensureFileSync(pkcRpcAuthKeyPath);
  fs.writeFileSync(pkcRpcAuthKeyPath, pkcRpcAuthKey);
}

const startPkcRpcAutoRestart = async () => {
  let pendingStart = false;
  const start = async () => {
    if (pendingStart) {
      return;
    }
    pendingStart = true;
    try {
      const started = await tcpPortUsed.check(port, '127.0.0.1');
      if (!started) {
        await startPkcRpcServer({ PKCRpcModule: PKCRpc, port, pkcOptions: defaultPkcOptions, authKey: pkcRpcAuthKey, isDev });
      }
    } catch (e) {
      console.log('failed starting pkc rpc server', e);
    }
    pendingStart = false;
  };

  // Retry every second in case another client briefly owned the shared local server.
  start();
  setInterval(() => {
    start();
  }, 1000);
};
startPkcRpcAutoRestart();
