import type { MainTab } from '../nav';

interface BottomNavProps {
  currentTab: MainTab;
  onChange: (tab: MainTab) => void;
}

const items: Array<{ tab: MainTab; label: string; icon: string }> = [
  { tab: 'medications', label: 'Medicamentos', icon: '💊' },
  { tab: 'agenda', label: 'Agenda', icon: '🗂️' },
  { tab: 'about', label: 'Sobre', icon: 'ℹ️' }
];

export function BottomNav({ currentTab, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {items.map((item) => (
        <button
          key={item.tab}
          className={`nav-btn ${currentTab === item.tab ? 'active' : ''}`}
          onClick={() => onChange(item.tab)}
        >
          <div>{item.icon}</div>
          <div>{item.label}</div>
        </button>
      ))}
    </nav>
  );
}
