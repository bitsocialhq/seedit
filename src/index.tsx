import './polyfills.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';
import { HashRouter as Router } from 'react-router-dom';
import './lib/init-translations';
import './index.css';
import './themes.css';
import './preload-assets.css';
import { App as CapacitorApp } from '@capacitor/app';
import { registerSW } from 'virtual:pwa-register';

if (window.location.hostname.startsWith('p2p.')) {
  (window as any).defaultPlebbitOptions = {
    libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
    httpsRoutersOptions: ['https://peers.pleb.bot', 'https://peers.forumindex.com'],
  };
}

registerSW({
  immediate: true,
  onNeedRefresh() {
    // Reload the page to load the new version
    // Use window.location.reload() as it's more reliable than reloadSW(true)
    if (!sessionStorage.getItem('sw-update-reload')) {
      sessionStorage.setItem('sw-update-reload', 'true');
      window.location.reload();
    }
  },
  onOfflineReady() {
    // Clear the reload flag when offline-ready (prevents loops)
    sessionStorage.removeItem('sw-update-reload');
  },
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
);

// add back button in android app
CapacitorApp.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack) {
    window.history.back();
  } else {
    CapacitorApp.exitApp();
  }
});
