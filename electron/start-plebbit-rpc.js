import tcpPortUsed from 'tcp-port-used';
import EnvPaths from 'env-paths';
import { randomBytes } from 'crypto';
import fs from 'fs-extra';
import PlebbitRpc from '@plebbit/plebbit-js/rpc';
import path from 'path';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
const dirname = path.join(path.dirname(fileURLToPath(import.meta.url)));
const envPaths = EnvPaths('plebbit', { suffix: false });

//           PLEB, always run plebbit rpc on this port so all clients can use it
const port = 9138;
const defaultPlebbitOptions = {
  // find the user's OS data path
  dataPath: !isDev ? envPaths.data : path.join(dirname, '..', '.plebbit'),
  kuboRpcClientsOptions: [{ url: 'http://localhost:50019/api/v0' }],
  httpRoutersOptions: ['https://routing.lol', 'https://peers.pleb.bot', 'https://peers.plebpubsub.xyz', 'https://peers.forumindex.com'],
};

// generate plebbit rpc auth key if doesn't exist
const plebbitRpcAuthKeyPath = path.join(defaultPlebbitOptions.dataPath, 'auth-key');
let plebbitRpcAuthKey;
try {
  plebbitRpcAuthKey = fs.readFileSync(plebbitRpcAuthKeyPath, 'utf8');
} catch {
  plebbitRpcAuthKey = randomBytes(32).toString('base64').replace(/[/+=]/g, '').substring(0, 40);
  fs.ensureFileSync(plebbitRpcAuthKeyPath);
  fs.writeFileSync(plebbitRpcAuthKeyPath, plebbitRpcAuthKey);
}

const startPlebbitRpcAutoRestart = async () => {
  let pendingStart = false;
  const start = async () => {
    if (pendingStart) {
      return;
    }
    pendingStart = true;
    try {
      const started = await tcpPortUsed.check(port, '127.0.0.1');
      if (!started) {
        const plebbitWebSocketServer = await PlebbitRpc.PlebbitWsServer({ port, plebbitOptions: defaultPlebbitOptions, authKey: plebbitRpcAuthKey });
        plebbitWebSocketServer.on('error', (e) => console.log('plebbit rpc error', e));

        console.log(`plebbit rpc: listening on ws://localhost:${port} (local connections only)`);
        console.log(`plebbit rpc: listening on ws://localhost:${port}/${plebbitRpcAuthKey} (secret auth key for remote connections)`);
        plebbitWebSocketServer.ws.on('connection', (socket) => {
          console.log('plebbit rpc: new connection');
          // debug raw JSON RPC messages in console
          if (isDev) {
            socket.on('message', (message) => console.log(`plebbit rpc: ${message.toString()}`));
          }
        });
      }
    } catch (e) {
      console.log('failed starting plebbit rpc server', e);
    }
    pendingStart = false;
  };

  // retry starting the plebbit rpc server every 1 second,
  // in case it was started by another client that shut down and shut down the server with it
  start();
  setInterval(() => {
    start();
  }, 1000);
};
startPlebbitRpcAutoRestart();
