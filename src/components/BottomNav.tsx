import type { MainTab } from '../nav';
import type { LucideIcon } from 'lucide-react';
import { CalendarRange, Info, Pill } from 'lucide-react';

interface BottomNavProps {
  currentTab: MainTab;
  onChange: (tab: MainTab) => void;
}

const items: Array<{ tab: MainTab; label: string; icon: LucideIcon }> = [
  { tab: 'medications', label: 'Medicamentos', icon: Pill },
  { tab: 'agenda', label: 'Agenda', icon: CalendarRange },
  { tab: 'about', label: 'Sobre', icon: Info }
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
          <item.icon size={18} strokeWidth={2.2} aria-hidden="true" />
          <div>{item.label}</div>
        </button>
      ))}
    </nav>
  );
}
