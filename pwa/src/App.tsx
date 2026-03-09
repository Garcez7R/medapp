import { useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { AboutPage } from './pages/AboutPage';
import { ExamsPage } from './pages/ExamsPage';
import { HealthPage } from './pages/HealthPage';
import { MedicationsPage } from './pages/MedicationsPage';
import type { AppTab } from './types';

export default function App() {
  const [tab, setTab] = useState<AppTab>('medications');

  return (
    <main className="app-shell">
      <header className="app-header">MedApp</header>
      <section className="content">
        {tab === 'medications' && <MedicationsPage />}
        {tab === 'exams' && <ExamsPage />}
        {tab === 'health' && <HealthPage />}
        {tab === 'about' && <AboutPage />}
      </section>
      <BottomNav currentTab={tab} onChange={setTab} />
    </main>
  );
}
