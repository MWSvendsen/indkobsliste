import { useLiveQuery } from 'dexie-react-hooks';
import { db, isActive } from './data/db';
import { sortZones } from './domain/views';
import { zoneColor } from './data/zoneColors';

// Midlertidig skærm for milepæl 2: viser, at databasen er seedet.
// Afløses af Liste og Tilføj vare i milepæl 3.
export function App() {
  const data = useLiveQuery(async () => {
    const [zones, items, recipes] = await Promise.all([
      db.zones.toArray(),
      db.items.toArray(),
      db.recipes.toArray(),
    ]);
    return { zones: sortZones(zones), items: items.filter(isActive), recipes: recipes.filter(isActive) };
  });

  return (
    <main className="screen">
      <p className="eyebrow">Netto</p>
      <h1 className="title">Indkøb</h1>
      <section className="card" aria-live="polite">
        {!data ? (
          <p>Indlæser …</p>
        ) : (
          <>
            <p>
              Databasen er klar: {data.zones.length} områder, {data.items.length} varer og {data.recipes.length} retter.
            </p>
            <ul className="zones">
              {data.zones.map((z, k) => (
                <li key={z.id}>
                  <span className="dot" style={{ background: zoneColor(z.id, k) }} aria-hidden="true" />
                  {z.name}
                  <span className="muted"> · {data.items.filter((i) => i.zoneId === z.id).length}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
