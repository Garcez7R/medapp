import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { drawerItems, type ActivePage } from '../nav';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

interface SideMenuProps {
  open: boolean;
  activePage: ActivePage;
  onClose: () => void;
  onSelect: (page: ActivePage) => void;
}

export function SideMenu({ open, activePage, onClose, onSelect }: SideMenuProps) {
  const [installAvailable, setInstallAvailable] = useState<boolean>(() => Boolean(window.__medappInstallPrompt));
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    const onInstallAvailable = () => setInstallAvailable(true);
    const onInstalled = () => setInstallAvailable(false);

    window.addEventListener('medapp-install-available', onInstallAvailable);
    window.addEventListener('medapp-installed', onInstalled);
    return () => {
      window.removeEventListener('medapp-install-available', onInstallAvailable);
      window.removeEventListener('medapp-installed', onInstalled);
    };
  }, []);

  async function installFromMenu() {
    if (isStandalone) {
      window.alert('O MedApp já está instalado neste dispositivo.');
      onClose();
      return;
    }

    const promptEvent = window.__medappInstallPrompt as BeforeInstallPromptEvent | undefined;
    if (!promptEvent) {
      window.alert('Instalação indisponível agora. Tente novamente em alguns instantes.');
      return;
    }

    await promptEvent.prompt();
    await promptEvent.userChoice;
    onClose();
  }

  if (!open) return null;

  return (
    <div className="side-overlay" onClick={onClose}>
      <aside className="side-menu" onClick={(e) => e.stopPropagation()}>
        <div className="side-header">Mais opções</div>
        <div className="side-list">
          {drawerItems.map((item) => (
            <button
              key={item.key}
              className={`side-item ${activePage === item.key ? 'active' : ''}`}
              onClick={() => {
                onSelect(item.key);
                onClose();
              }}
            >
              <item.icon size={20} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
          <button className="side-item" onClick={() => void installFromMenu()} disabled={!installAvailable && !isStandalone}>
            <Download size={20} aria-hidden="true" />
            <span>{isStandalone ? 'App já instalado' : 'Instalar app'}</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
