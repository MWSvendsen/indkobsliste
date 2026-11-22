import { ArrowDown, ArrowUp, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { db } from '../data/db';
import { useItems, useListEntries, useZones } from '../data/hooks';
import { resetToSeed } from '../data/seed';
import type { Item } from '../data/types';
import { zoneColor } from '../data/zoneColors';
import { moveZone } from '../domain/catalog';
import { byName } from '../domain/common';
import { Sheet } from '../ui/Sheet';
import { BackupSection } from './BackupSection';
import { useListActions } from '../ui/useListActions';
import { useRun } from '../ui/useToast';

/** Varer: hele kataloget som knapper, grupperet efter område. "Ret rute" ændrer områdernes rækkefølge. */
export function CatalogScreen() {
  const zones = useZones();
  const items = useItems();
  const entries = useListEntries();
  const [reorder, setReorder] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!zones || !items || !entries) return <main className="screen" aria-busy="true" />;

  const quantityOf = new Map(entries.map((e) => [e.itemId, e.quantity]));

  return (
    <main className="screen">
      <header className="screen__head screen__head--row">
        <div>
          <p className="eyebrow">{entries.length} på listen</p>
          <h1 className="title">Varer</h1>
        </div>
        <button type="button" className="pill-btn" aria-pressed={reorder} onClick={() => setReorder((r) => !r)}>
          {reorder ? 'Færdig' : 'Ret rute'}
        </button>
      </header>

      {reorder ? (
        <RouteEditor />
      ) : (
        <>
          <p className="lead">Tryk på det, I mangler. Brug plus og minus til at rette antallet.</p>
          {zones.map((zone, k) => {
            const zoneItems = items.filter((i) => i.zoneId === zone.id).sort(byName);
            if (zoneItems.length === 0) return null;
            return (
              <section key={zone.id} className="group" aria-labelledby={`zone-${zone.id}`}>
                <h2 id={`zone-${zone.id}`} className="group__head group__head--start">
                  <span className="dot" style={{ background: zoneColor(zone.id, k) }} aria-hidden="true" />
                  {zone.name}
                </h2>
                <div className="chips">
                  {zoneItems.map((item) => (
                    <CatalogChip key={item.id} item={item} quantity={quantityOf.get(item.id)} />
                  ))}
                </div>
              </section>
            );
          })}
          <BackupSection />
          <button type="button" className="link-btn" onClick={() => setConfirmReset(true)}>
            Nulstil til eksempeldata
          </button>
        </>
      )}

      {confirmReset && <ResetSheet onClose={() => setConfirmReset(false)} />}
    </main>
  );
}

/** En vare i kataloget: en knap, eller en limegrøn pille med minus, antal og plus, når den er på listen. */
function CatalogChip({ item, quantity }: { item: Item; quantity: number | undefined }) {
  const { add, setQty } = useListActions();

  if (quantity === undefined) {
    return (
      <button type="button" className="chip chip--item" aria-label={`Sæt ${item.name} på listen`} onClick={() => add(item)}>
        {item.name}
      </button>
    );
  }

  return (
    <div className="pill-on">
      <button
        type="button"
        className="pill-on__btn"
        aria-label={quantity <= 1 ? `Fjern ${item.name} fra listen` : `Én mindre ${item.name}`}
        onClick={() => setQty(item, quantity - 1)}
      >
        <Minus size={16} strokeWidth={2.8} aria-hidden="true" />
      </button>
      <span className="pill-on__text">
        {quantity} × {item.name}
      </span>
      <button
        type="button"
        className="pill-on__btn"
        aria-label={`Én mere ${item.name}`}
        onClick={() => setQty(item, quantity + 1)}
      >
        <Plus size={16} strokeWidth={2.8} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Ret rute: områderne i rækkefølge med pil op og pil ned. */
function RouteEditor() {
  const zones = useZones() ?? [];
  const run = useRun();

  return (
    <>
      <p className="lead">Sæt områderne i den rækkefølge, du møder dem i din Netto. Listen følger rækkefølgen.</p>
      <ol className="card card--list route" aria-label="Rute">
        {zones.map((zone, k) => (
          <li key={zone.id} className="route__row">
            <span className="route__n" aria-hidden="true">
              {k + 1}
            </span>
            <span className="route__name">{zone.name}</span>
            <button
              type="button"
              className="route__btn"
              aria-label={`Flyt ${zone.name} op`}
              disabled={k === 0}
              onClick={() => run(() => moveZone(db, zone.id, -1))}
            >
              <ArrowUp size={20} strokeWidth={2.2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="route__btn"
              aria-label={`Flyt ${zone.name} ned`}
              disabled={k === zones.length - 1}
              onClick={() => run(() => moveZone(db, zone.id, 1))}
            >
              <ArrowDown size={20} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}

/** Bekræftelse, før alt nulstilles til eksempeldata. */
function ResetSheet({ onClose }: { onClose: () => void }) {
  const run = useRun();
  const reset = async () => {
    await run(() => resetToSeed(db), () => 'Eksempeldata er gendannet');
    onClose();
  };

  return (
    <Sheet
      title="Nulstil til eksempeldata?"
      onClose={onClose}
      compact
      footer={
        <div className="sheet__actions">
          <button type="button" className="btn-danger" onClick={reset}>
            Nulstil
          </button>
          <button type="button" className="btn-outline" onClick={onClose}>
            Annuller
          </button>
        </div>
      }
    >
      <p className="lead">
        Listen og madplanen tømmes, og jeres egne varer, retter og rute erstattes af eksempeldata. Det kan ikke
        fortrydes.
      </p>
    </Sheet>
  );
}
