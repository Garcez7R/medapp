import { useMemo, useRef, useState } from 'react';
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
  const swipeStartRef = useRef<{ x: number; y: number; fromOpenMenu: boolean } | null>(null);

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

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0];
    const fromOpenMenu = menuOpen;
    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      fromOpenMenu
    };
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    const startedAtEdge = start.x <= 28;
    const openedBySwipe = !start.fromOpenMenu && startedAtEdge && deltaX > 70;
    const closedBySwipe = start.fromOpenMenu && deltaX < -70;

    if (openedBySwipe) setMenuOpen(true);
    if (closedBySwipe) setMenuOpen(false);
  }

  return (
    <main className="app-shell" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {!menuOpen && <div className="edge-swipe-zone" aria-hidden="true" />}
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
