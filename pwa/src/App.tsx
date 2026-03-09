import { useMemo, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { SideMenu } from './components/SideMenu';
import { type ActivePage, type MainTab } from './nav';
import { AboutPage } from './pages/AboutPage';
import { ExamsPage } from './pages/ExamsPage';
import { HealthPage } from './pages/HealthPage';
import { MedicationsPage } from './pages/MedicationsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

const drawerTitles: Record<Exclude<ActivePage, MainTab>, string> = {
  agenda_medica: 'Agenda Médica',
  vacinas: 'Vacinas',
  diario: 'Diário de Saúde',
  receitas: 'Receitas Médicas',
  relatorios: 'Relatórios',
  central_notificacoes: 'Central de Notificações',
  perfil: 'Perfil e Preferências',
  calendario: 'Calendário da Saúde',
  historico: 'Histórico de Atividades',
  privacidade: 'Privacidade e Segurança',
  assistente: 'Assistente de Saúde'
};

export default function App() {
  const [tab, setTab] = useState<MainTab>('medications');
  const [activePage, setActivePage] = useState<ActivePage>('medications');
  const [menuOpen, setMenuOpen] = useState(false);

  const page = useMemo(() => {
    if (activePage === 'medications') return <MedicationsPage />;
    if (activePage === 'exams') return <ExamsPage />;
    if (activePage === 'health') return <HealthPage />;
    if (activePage === 'about') return <AboutPage />;
    return <PlaceholderPage title={drawerTitles[activePage]} />;
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
