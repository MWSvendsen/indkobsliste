import { Check } from 'lucide-react';
import { db } from '../data/db';
import { useItems, useListEntries, useZones } from '../data/hooks';
import { finishShopping, toggleChecked } from '../domain/list';
import { buildListView, type ListLine } from '../domain/views';
import { useRun } from '../ui/useToast';

const plural = (n: number) => (n === 1 ? `${n} vare` : `${n} varer`);

function heroLabel(total: number, inCart: number) {
  if (total === 0) return 'Listen er tom';
  if (inCart === total) return 'Alt er i kurven';
  return 'i kurven';
}

/** Liste: handle i butikken i rutens rækkefølge og krydse af undervejs. */
export function ListScreen() {
  const zones = useZones();
  const items = useItems();
  const entries = useListEntries();
  const run = useRun();

  if (!zones || !items || !entries) return <main className="screen" aria-busy="true" />;

  const view = buildListView(zones, items, entries);
  const pct = view.total ? Math.round((view.inCart / view.total) * 100) : 0;
  const toggle = (line: ListLine) => run(() => toggleChecked(db, line.entry.id));
  const qtyText = (line: ListLine) => (line.entry.quantity > 1 ? `${line.entry.quantity} ` : '');

  return (
    <main className="screen">
      <header className="screen__head">
        <p className="eyebrow">Netto · din rute</p>
        <h1 className="title">Indkøb</h1>
      </header>

      <section className="hero" aria-label="Status">
        <div className="hero__row">
          <p className="hero__count">
            {view.inCart}
            <span className="hero__total"> / {view.total}</span>
          </p>
          <p className="hero__label">{heroLabel(view.total, view.inCart)}</p>
        </div>
        <div
          className="hero__bar"
          role="progressbar"
          aria-label={`${view.inCart} af ${view.total} i kurven`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className="hero__fill" style={{ width: `${pct}%` }} />
        </div>
      </section>

      {view.total === 0 && (
        <section className="card empty">
          <h2>Listen er tom</h2>
          <p>Tryk på Tilføj, når I løber tør for noget, eller vælg ingredienser til ugens retter i madplanen.</p>
        </section>
      )}

      {view.groups.map((group) => (
        <section key={group.zone.id} className="group">
          <h2 className="group__head">
            <span className="group__name">
              <span className="dot" style={{ background: group.color }} aria-hidden="true" />
              {group.zone.name}
            </span>
            <span>
              <span className="sr-only">: </span>
              {group.lines.length}
            </span>
          </h2>
          <div className="card card--list">
            {group.lines.map((line) => (
              <button
                key={line.entry.id}
                type="button"
                className="line"
                aria-label={`Læg i kurven: ${qtyText(line)}${line.item.name}`}
                onClick={() => toggle(line)}
              >
                <span className="line__check" aria-hidden="true" />
                <span className="line__name">{line.item.name}</span>
                {line.entry.quantity > 1 && <span className="line__qty">{line.entry.quantity} ×</span>}
              </button>
            ))}
          </div>
        </section>
      ))}

      {view.cart.length > 0 && (
        <section className="group">
          <h2 className="group__head">
            <span>I kurven</span>
            <span>
              <span className="sr-only">: </span>
              {view.cart.length}
            </span>
          </h2>
          <div className="card card--list">
            {view.cart.map((line) => (
              <button
                key={line.entry.id}
                type="button"
                className="line line--done"
                aria-label={`Tag op af kurven: ${qtyText(line)}${line.item.name}`}
                onClick={() => toggle(line)}
              >
                <span className="line__check line__check--on" aria-hidden="true">
                  <Check size={15} strokeWidth={3.2} />
                </span>
                <span className="line__name">{line.item.name}</span>
                {line.entry.quantity > 1 && <span className="line__qty-done">{line.entry.quantity} ×</span>}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn-outline"
            onClick={() => run(() => finishShopping(db), (n) => `${plural(n)} lagt tilbage i kataloget`)}
          >
            Afslut indkøb
          </button>
          <p className="hint">Varerne i kurven ryger tilbage i kataloget, klar til næste gang.</p>
        </section>
      )}
    </main>
  );
}
