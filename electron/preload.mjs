import { contextBridge, ipcRenderer } from 'electron';

// dev uses http://localhost, prod uses file://...index.html

const defaultPlebbitOptions = {
  plebbitRpcClientsOptions: ['ws://localhost:9138'],
  httpRoutersOptions: ['https://peers.pleb.bot', 'https://routing.lol', 'https://peers.forumindex.com', 'https://peers.plebpubsub.xyz'],
};

contextBridge.exposeInMainWorld('isElectron', true);
contextBridge.exposeInMainWorld('defaultPlebbitOptions', defaultPlebbitOptions);
contextBridge.exposeInMainWorld('defaultMediaIpfsGatewayUrl', 'http://localhost:6473');

// receive plebbit rpc auth key from main
ipcRenderer.on('plebbit-rpc-auth-key', (event, plebbitRpcAuthKey) => contextBridge.exposeInMainWorld('plebbitRpcAuthKey', plebbitRpcAuthKey));
ipcRenderer.send('get-plebbit-rpc-auth-key');

// notifications IPC
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => {
    const validChannels = [
      'plugin:file-uploader:pickAndUploadMedia',
      'plugin:file-uploader:uploadMedia',
      'plugin:file-uploader:pickMedia',
      'get-notification-permission-status',
      'get-platform',
      'test-notification-permission',
      'copy-to-clipboard',
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Unauthorized IPC channel: ${channel}`);
  },
  sendNotification: (notification) => {
    ipcRenderer.send('show-notification', notification);
  },
});

contextBridge.exposeInMainWorld('electronApi', {
  isElectron: true,
  getNotificationStatus: () => ipcRenderer.invoke('get-notification-permission-status'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  testNotification: () => ipcRenderer.invoke('test-notification-permission'),
  showNotification: (notification) => ipcRenderer.send('show-notification', notification),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
});
