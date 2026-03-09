import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

declare global {
  interface Window {
    __medappInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

window.__medappInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  window.__medappInstallPrompt = event as BeforeInstallPromptEvent;
  window.dispatchEvent(new CustomEvent('medapp-install-available'));
});

window.addEventListener('appinstalled', () => {
  window.__medappInstallPrompt = null;
  window.dispatchEvent(new CustomEvent('medapp-installed'));
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW is optional; app must run even when registration fails.
    });
  });
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
