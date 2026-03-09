import { useMemo, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { SideMenu } from './components/SideMenu';
import { type ActivePage, type MainTab } from './nav';
import { DrawerPageRouter } from './pages/DrawerPages';
import { AboutPage } from './pages/AboutPage';
import { AgendaPage } from './pages/AgendaPage';
import { AgendaUnificadaPage } from './pages/AgendaUnificadaPage';
import { MedicationsPage } from './pages/MedicationsPage';

export default function App() {
  const [tab, setTab] = useState<MainTab>('medications');
  const [activePage, setActivePage] = useState<ActivePage>('medications');
  const [menuOpen, setMenuOpen] = useState(false);

  const page = useMemo(() => {
    if (activePage === 'medications') return <MedicationsPage />;
    if (activePage === 'agenda') return <AgendaUnificadaPage />;
    if (activePage === 'about') return <AboutPage />;
    if (activePage === 'agenda_medica') return <AgendaPage />;
    return <DrawerPageRouter pageKey={activePage} />;
  }, [activePage]);

  function handleTabChange(next: MainTab) {
    setTab(next);
    setActivePage(next);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <button className="menu-btn" onClick={() => setMenuOpen(true)} aria-label="Abrir menu lateral">
          ☰
        </button>
        <span>MedApp</span>
      </header>

      <section className="content">{page}</section>

      <BottomNav currentTab={tab} onChange={handleTabChange} />

      <SideMenu
        open={menuOpen}
        activePage={activePage}
        onClose={() => setMenuOpen(false)}
        onSelect={(pageKey) => setActivePage(pageKey)}
      />
    </main>
  );
}
