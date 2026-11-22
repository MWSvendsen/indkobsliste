import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useListEntries } from './data/hooks';
import { AddItemSheet } from './screens/AddItemSheet';
import { CatalogScreen } from './screens/CatalogScreen';
import { ListScreen } from './screens/ListScreen';
import { Placeholder } from './screens/Placeholder';
import { Nav, type Tab } from './ui/Nav';
import { ToastProvider } from './ui/toast';

type SheetState = { type: 'add' } | null;

export function App() {
  const [tab, setTab] = useState<Tab>('liste');
  const [sheet, setSheet] = useState<SheetState>(null);
  const entries = useListEntries();
  const missing = entries?.filter((e) => !e.checked).length ?? 0;
  const closeSheet = useCallback(() => setSheet(null), []);

  const changeTab = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  return (
    <ToastProvider>
      {tab === 'liste' && <ListScreen />}
      {tab === 'varer' && <CatalogScreen />}
      {tab === 'madplan' && <Placeholder title="Madplan" milestone={6} />}
      {tab === 'retter' && <Placeholder title="Retter" milestone={5} />}

      {!sheet && (tab === 'liste' || tab === 'varer') && (
        <button type="button" className="fab" onClick={() => setSheet({ type: 'add' })}>
          <Plus size={22} strokeWidth={2.6} aria-hidden="true" />
          Tilføj
        </button>
      )}

      <Nav tab={tab} onChange={changeTab} badge={missing} />

      {sheet?.type === 'add' && <AddItemSheet onClose={closeSheet} />}
    </ToastProvider>
  );
}
