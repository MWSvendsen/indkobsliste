import { CalendarDays, LayoutGrid, List, Soup, type LucideIcon } from 'lucide-react';

export type Tab = 'liste' | 'varer' | 'madplan' | 'retter';

const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'liste', label: 'Liste', Icon: List },
  { id: 'varer', label: 'Varer', Icon: LayoutGrid },
  { id: 'madplan', label: 'Madplan', Icon: CalendarDays },
  { id: 'retter', label: 'Retter', Icon: Soup },
];

interface NavProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
  /** Antal linjer, der mangler at komme i kurven. */
  badge: number;
}

/** Mørk, svævende menu nederst. Den aktive fane har accentfarvet baggrund. */
export function Nav({ tab, onChange, badge }: NavProps) {
  return (
    <nav className="nav" aria-label="Hovedmenu">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={tab === id ? 'nav__tab nav__tab--on' : 'nav__tab'}
          aria-current={tab === id ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          <Icon size={24} strokeWidth={2} aria-hidden="true" />
          <span>{label}</span>
          {id === 'liste' && badge > 0 && (
            <span className="nav__badge">
              {badge}
              <span className="sr-only"> mangler</span>
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
