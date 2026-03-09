import { drawerItems, type ActivePage } from '../nav';

interface SideMenuProps {
  open: boolean;
  activePage: ActivePage;
  onClose: () => void;
  onSelect: (page: ActivePage) => void;
}

export function SideMenu({ open, activePage, onClose, onSelect }: SideMenuProps) {
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
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
