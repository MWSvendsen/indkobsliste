import { Plus } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { db } from '../data/db';
import { useItems, useListEntries, useZones } from '../data/hooks';
import { createItemOnList } from '../domain/catalog';
import { capitalize } from '../domain/common';
import { frequentItems, hasExactItem, searchItems } from '../domain/views';
import { QuantityStepper } from '../ui/QuantityStepper';
import { Sheet } from '../ui/Sheet';
import { useListActions } from '../ui/useListActions';
import { useRun } from '../ui/useToast';

/** Tilføj vare: søg, tryk for at sætte på listen, eller opret en ny vare med område. */
export function AddItemSheet({ onClose }: { onClose: () => void }) {
  const zones = useZones() ?? [];
  const items = useItems() ?? [];
  const entries = useListEntries() ?? [];
  const run = useRun();
  const [query, setQuery] = useState('');

  const q = query.trim();
  const results = searchItems(items, q);
  const quantityOf = new Map(entries.map((e) => [e.itemId, e.quantity]));
  const zoneName = new Map(zones.map((z) => [z.id, z.name]));
  const pretty = capitalize(q);

  const { add, setQty } = useListActions();

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const top = results[0];
    if (top && !quantityOf.has(top.id)) {
      void add(top);
      setQuery('');
    }
  };

  const create = async (zoneId: string, zone: string) => {
    const name = pretty;
    const item = await run(() => createItemOnList(db, name, zoneId), (it) => `${it.name} er oprettet under ${zone}`);
    if (item) setQuery('');
  };

  return (
    <Sheet title="Tilføj vare" onClose={onClose}>
      <div className="field">
        <label htmlFor="vare-soeg">Hvad mangler I?</label>
        <input
          id="vare-soeg"
          type="search"
          inputMode="search"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          autoFocus
          placeholder="Fx mælk, kaffe, løg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>

      {q && results.length > 0 && (
        <ul className="card card--list results" aria-label="Resultater">
          {results.map((item) => {
            const qty = quantityOf.get(item.id);
            return (
              <li key={item.id} className="result">
                {qty === undefined ? (
                  <button type="button" className="result__add" aria-label={`Sæt ${item.name} på listen`} onClick={() => add(item)}>
                    <span className="result__text">
                      <span className="result__name">{item.name}</span>
                      <span className="result__meta">{zoneName.get(item.zoneId)}</span>
                    </span>
                    <span className="round-plus" aria-hidden="true">
                      <Plus size={18} strokeWidth={2.8} />
                    </span>
                  </button>
                ) : (
                  <div className="result__on">
                    <span className="result__text">
                      <span className="result__name">{item.name}</span>
                      <span className="result__meta result__meta--on">På listen</span>
                    </span>
                    <QuantityStepper name={item.name} quantity={qty} onChange={(n) => setQty(item, n)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {q && !hasExactItem(items, q) && (
        <section className="create" aria-label="Ny vare">
          <p className="create__title">Ny vare: {pretty}</p>
          <p className="create__hint">Vælg område, så den lander det rigtige sted på ruten.</p>
          <div className="chips">
            {zones.map((z) => (
              <button key={z.id} type="button" className="chip chip--muted" onClick={() => create(z.id, z.name)}>
                {z.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {!q && (
        <section className="suggest">
          <h3 className="suggest__head">Det køber I tit</h3>
          <div className="chips">
            {frequentItems(items, entries).map((item) => (
              <button key={item.id} type="button" className="chip" aria-label={`Tilføj ${item.name}`} onClick={() => add(item)}>
                <Plus size={16} strokeWidth={2.8} className="chip__plus" aria-hidden="true" />
                {item.name}
              </button>
            ))}
          </div>
        </section>
      )}
    </Sheet>
  );
}
