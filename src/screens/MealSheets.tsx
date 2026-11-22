import { Check } from 'lucide-react';
import { useState } from 'react';
import { db } from '../data/db';
import { useItems, useListEntries, useMealPlan, useRecipeIngredients, useRecipes } from '../data/hooks';
import { byName } from '../domain/common';
import { dayName, shortDayLabel, toISODate, upcomingDates } from '../domain/dates';
import { assignRecipe, confirmIngredients } from '../domain/mealPlan';
import { Sheet } from '../ui/Sheet';
import { useRun } from '../ui/useToast';

const plural = (n: number) => (n === 1 ? `${n} vare` : `${n} varer`);

interface PickRecipeProps {
  date: string;
  onClose: () => void;
  /** Retten er sat på dagen, og ingredienserne skal vælges. */
  onAssigned: (date: string) => void;
  /** "Ny ret": åbn editoren, og sæt retten på dagen, når den er gemt. */
  onNewRecipe: (date: string) => void;
}

/** Vælg ret til en dag. */
export function PickRecipeSheet({ date, onClose, onAssigned, onNewRecipe }: PickRecipeProps) {
  const recipes = useRecipes() ?? [];
  const ingredients = useRecipeIngredients() ?? [];
  const plan = useMealPlan() ?? [];
  const run = useRun();
  const current = plan.find((m) => m.date === date)?.recipeId;

  const pick = async (recipeId: string) => {
    const ok = await run(async () => {
      await assignRecipe(db, date, recipeId);
      return true;
    });
    if (ok) onAssigned(date);
  };

  const clear = async () => {
    await run(() => assignRecipe(db, date, null), () => `${dayName(date)} er ryddet`);
    onClose();
  };

  return (
    <Sheet title={`Ret til ${dayName(date).toLowerCase()}`} eyebrow={shortDayLabel(date)} onClose={onClose}>
      {recipes.length > 0 ? (
        <ul className="card card--list" aria-label="Retter">
          {[...recipes].sort(byName).map((r) => {
            const count = ingredients.filter((x) => x.recipeId === r.id).length;
            const selected = r.id === current;
            return (
              <li key={r.id} className="result">
                <button type="button" className="result__add" aria-current={selected || undefined} onClick={() => pick(r.id)}>
                  <span className="result__text">
                    <span className="result__name">{r.name}</span>
                    <span className="result__meta">{count} ingredienser</span>
                  </span>
                  {selected && <Check size={20} strokeWidth={3} className="tick" aria-label="Valgt" />}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="dashed-note">I har ingen retter endnu. Opret den første med Ny ret.</p>
      )}
      <div className="sheet__row-actions">
        <button type="button" className="btn-outline btn-outline--sm" onClick={() => onNewRecipe(date)}>
          Ny ret
        </button>
        {current && (
          <button type="button" className="btn-plain" onClick={clear}>
            Ingen ret
          </button>
        )}
      </div>
    </Sheet>
  );
}

interface PickDayProps {
  recipeId: string;
  onClose: () => void;
  onAssigned: (date: string) => void;
}

/** Vælg dag til en ret, fra i dag til og med næste uge. */
export function PickDaySheet({ recipeId, onClose, onAssigned }: PickDayProps) {
  const recipes = useRecipes() ?? [];
  const plan = useMealPlan() ?? [];
  const run = useRun();
  const recipe = recipes.find((r) => r.id === recipeId);
  const recipeName = new Map(recipes.map((r) => [r.id, r.name]));
  const byDate = new Map(plan.map((m) => [m.date, m.recipeId]));

  const pick = async (date: string) => {
    const ok = await run(async () => {
      await assignRecipe(db, date, recipeId);
      return true;
    });
    if (ok) onAssigned(date);
  };

  return (
    <Sheet title={recipe?.name ?? 'Sæt på madplanen'} eyebrow="Hvilken dag?" onClose={onClose}>
      <ul className="card card--list" aria-label="Dage">
        {upcomingDates(toISODate(new Date())).map((date) => {
          const dish = byDate.get(date);
          const label = dish ? recipeName.get(dish) : undefined;
          return (
            <li key={date} className="result">
              <button type="button" className="day-row" onClick={() => pick(date)}>
                <span className="day-row__label">{shortDayLabel(date)}</span>
                <span className={label ? 'day-row__dish' : 'day-row__dish day-row__dish--free'}>{label ?? 'Ledig'}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

interface IngredientsProps {
  date: string;
  onClose: () => void;
}

/** Vælg ingredienser: intet er valgt fra start. De valgte lægges på listen med rettens antal. */
export function IngredientsSheet({ date, onClose }: IngredientsProps) {
  const plan = useMealPlan();
  const recipes = useRecipes();
  const ingredients = useRecipeIngredients();
  const items = useItems();
  const entries = useListEntries();
  const run = useRun();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const entry = plan?.find((m) => m.date === date);
  const recipe = entry && recipes?.find((r) => r.id === entry.recipeId);
  const itemById = new Map((items ?? []).map((i) => [i.id, i]));
  const onList = new Map((entries ?? []).map((e) => [e.itemId, e.quantity]));
  const rows = (ingredients ?? [])
    .filter((x) => recipe && x.recipeId === recipe.id && itemById.has(x.itemId))
    .map((x) => ({ ...x, item: itemById.get(x.itemId)! }))
    .sort((a, b) => byName(a.item, b.item));

  const toggle = (itemId: string) => {
    const next = new Set(selected);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    setSelected(next);
  };

  const confirm = async () => {
    if (selected.size === 0) return;
    const n = await run(() => confirmIngredients(db, date, [...selected]), (count) => `${plural(count)} lagt på listen`);
    if (n !== undefined) onClose();
  };

  const n = rows.filter((x) => selected.has(x.itemId)).length;

  return (
    <Sheet
      title={recipe?.name ?? 'Vælg ingredienser'}
      eyebrow={dayName(date)}
      onClose={onClose}
      footer={
        <button type="button" className="btn-primary" disabled={n === 0} onClick={confirm}>
          {n === 0 ? 'Vælg det, du skal købe' : `Læg ${plural(n)} på listen`}
        </button>
      }
    >
      <div className="ing-intro">
        <p className="lead">Vælg det, du skal købe. Resten har I hjemme.</p>
        <button
          type="button"
          className="soft-btn"
          onClick={() => setSelected(new Set(rows.map((x) => x.itemId)))}
          disabled={rows.length === 0}
        >
          Vælg alle
        </button>
      </div>
      <ul className="card card--list" aria-label="Ingredienser">
        {rows.map((x) => {
          const sel = selected.has(x.itemId);
          const already = onList.get(x.itemId);
          return (
            <li key={x.id} className="result">
              <button
                type="button"
                className="pick-row"
                aria-pressed={sel}
                aria-label={`${sel ? 'Fravælg' : 'Vælg'} ${x.item.name}`}
                onClick={() => toggle(x.itemId)}
              >
                <span className={sel ? 'box box--on' : 'box'} aria-hidden="true">
                  {sel && <Check size={16} strokeWidth={3.2} />}
                </span>
                <span className="result__text">
                  <span className="result__name">{x.item.name}</span>
                  {already !== undefined && <span className="result__meta">{already} står allerede på listen</span>}
                </span>
                <span className="pick-row__qty">{x.quantity} ×</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
