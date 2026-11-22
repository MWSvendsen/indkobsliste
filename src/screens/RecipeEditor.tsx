import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db, isActive } from '../data/db';
import { useItems, useZones } from '../data/hooks';
import type { ItemQuantity } from '../data/types';
import { createItem } from '../domain/catalog';
import { capitalize } from '../domain/common';
import { deleteRecipe, saveRecipe } from '../domain/recipes';
import { hasExactItem, searchItems } from '../domain/views';
import { QuantityStepper } from '../ui/QuantityStepper';
import { Sheet } from '../ui/Sheet';
import { useRun } from '../ui/useToast';

interface Props {
  /** null = ny ret */
  recipeId: string | null;
  onClose: () => void;
  /** Kaldes med rettens id, når den er gemt. */
  onSaved?: (recipeId: string) => void;
}

interface Draft {
  name: string;
  ingredients: ItemQuantity[];
}

/** Ret-editor: navn, ingredienser med antal, søgning i kataloget og oprettelse af nye varer. */
export function RecipeEditor({ recipeId, onClose, onSaved }: Props) {
  const zones = useZones() ?? [];
  const items = useItems() ?? [];
  const run = useRun();
  const [draft, setDraft] = useState<Draft | null>(recipeId ? null : { name: '', ingredients: [] });
  const [query, setQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Hent retten én gang, når editoren åbner. Ændringer gemmes først ved "Gem ret".
  useEffect(() => {
    if (!recipeId) return;
    let cancelled = false;
    void (async () => {
      const recipe = await db.recipes.get(recipeId);
      const rows = (await db.recipeIngredients.where('recipeId').equals(recipeId).toArray()).filter(isActive);
      const names = new Map((await db.items.bulkGet(rows.map((x) => x.itemId))).map((i) => [i?.id, i?.name ?? '']));
      // Alfabetisk, så rækkefølgen er stabil. Nye ingredienser kommer nederst, mens man retter.
      rows.sort((a, b) => (names.get(a.itemId) ?? '').localeCompare(names.get(b.itemId) ?? '', 'da'));
      if (!cancelled && recipe) {
        setDraft({ name: recipe.name, ingredients: rows.map((x) => ({ itemId: x.itemId, quantity: x.quantity })) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  const title = recipeId ? 'Rediger ret' : 'Ny ret';

  if (!draft) {
    return (
      <Sheet title={title} onClose={onClose} tall>
        <p className="lead" aria-busy="true">
          Henter retten …
        </p>
      </Sheet>
    );
  }

  const itemById = new Map(items.map((i) => [i.id, i]));
  const zoneName = new Map(zones.map((z) => [z.id, z.name]));
  const inRecipe = new Set(draft.ingredients.map((x) => x.itemId));
  const rows = draft.ingredients.filter((x) => itemById.has(x.itemId));
  const q = query.trim();
  const results = searchItems(
    items.filter((i) => !inRecipe.has(i.id)),
    q,
    5,
  );
  const pretty = capitalize(q);
  const canSave = draft.name.trim().length > 0 && rows.length > 0;

  const setIngredients = (ingredients: ItemQuantity[]) => setDraft({ ...draft, ingredients });
  const addIngredient = (itemId: string) => {
    setIngredients([...draft.ingredients, { itemId, quantity: 1 }]);
    setQuery('');
  };
  const setQty = (itemId: string, quantity: number) =>
    setIngredients(
      quantity < 1
        ? draft.ingredients.filter((x) => x.itemId !== itemId)
        : draft.ingredients.map((x) => (x.itemId === itemId ? { ...x, quantity } : x)),
    );

  const createIngredient = async (zoneId: string, zone: string) => {
    const item = await run(() => createItem(db, pretty, zoneId), (it) => `${it.name} er oprettet under ${zone}`);
    if (item) addIngredient(item.id);
  };

  const save = async () => {
    if (!canSave) return;
    const saved = await run(
      () => saveRecipe(db, { id: recipeId ?? undefined, name: draft.name, ingredients: rows }),
      (r) => `${r.name} er gemt`,
    );
    if (saved) {
      onClose();
      onSaved?.(saved.id);
    }
  };

  const remove = async () => {
    if (!recipeId) return;
    const name = draft.name.trim() || 'Retten';
    await run(() => deleteRecipe(db, recipeId), () => `${name} er slettet`);
    onClose();
  };

  return (
    <Sheet
      title={title}
      onClose={onClose}
      tall
      footer={
        <button type="button" className="btn-primary" disabled={!canSave} onClick={save}>
          Gem ret
        </button>
      }
    >
      <div className="field field--soft">
        <label htmlFor="ret-navn">Navn på retten</label>
        <input
          id="ret-navn"
          type="text"
          autoComplete="off"
          placeholder="Fx lasagne"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </div>

      <section className="editor-section" aria-labelledby="ret-ingredienser">
        <h3 id="ret-ingredienser" className="suggest__head">
          Ingredienser · {rows.length}
        </h3>
        {rows.length > 0 ? (
          <ul className="card card--list" aria-label="Ingredienser i retten">
            {rows.map((x) => {
              const item = itemById.get(x.itemId)!;
              return (
                <li key={x.itemId} className="ingredient">
                  <span className="ingredient__name">{item.name}</span>
                  <QuantityStepper
                    name={item.name}
                    quantity={x.quantity}
                    removeLabel={`Fjern ${item.name} fra retten`}
                    onChange={(n) => setQty(x.itemId, n)}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="dashed-note">Ingen ingredienser endnu. Søg nedenfor og tryk for at tilføje.</p>
        )}
      </section>

      <div className="field">
        <label htmlFor="ret-soeg">Tilføj ingrediens</label>
        <input
          id="ret-soeg"
          type="search"
          autoComplete="off"
          autoCorrect="off"
          enterKeyHint="done"
          placeholder="Søg i jeres varer"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (results[0]) addIngredient(results[0].id);
            }
          }}
        />
      </div>

      {q && results.length > 0 && (
        <ul className="card card--list results" aria-label="Resultater">
          {results.map((item) => (
            <li key={item.id} className="result">
              <button
                type="button"
                className="result__add"
                aria-label={`Tilføj ${item.name} til retten`}
                onClick={() => addIngredient(item.id)}
              >
                <span className="result__text">
                  <span className="result__name">{item.name}</span>
                  <span className="result__meta">{zoneName.get(item.zoneId)}</span>
                </span>
                <span className="round-plus" aria-hidden="true">
                  <Plus size={18} strokeWidth={2.8} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {q && !hasExactItem(items, q) && (
        <section className="create" aria-label="Ny vare">
          <p className="create__title">Ny vare: {pretty}</p>
          <p className="create__hint">Den kommer også i varekataloget. Vælg område på ruten.</p>
          <div className="chips">
            {zones.map((z) => (
              <button key={z.id} type="button" className="chip chip--muted" onClick={() => createIngredient(z.id, z.name)}>
                {z.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {recipeId &&
        (confirmDelete ? (
          <section className="confirm" aria-label="Slet ret">
            <p className="create__title">Slet {draft.name.trim() || 'retten'}?</p>
            <p className="create__hint">Den fjernes også fra madplanen. Varerne bliver i kataloget.</p>
            <div className="confirm__actions">
              <button type="button" className="btn-danger" onClick={remove}>
                Slet
              </button>
              <button type="button" className="btn-outline" onClick={() => setConfirmDelete(false)}>
                Behold
              </button>
            </div>
          </section>
        ) : (
          <button type="button" className="link-btn link-btn--danger" onClick={() => setConfirmDelete(true)}>
            Slet ret
          </button>
        ))}
    </Sheet>
  );
}
