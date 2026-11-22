import { Check, ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { useItems, useMealPlan, useRecipeIngredients, useRecipes } from '../data/hooks';
import { addDays, dayName, isoWeek, mondayOf, shortDayLabel, toISODate, weekDates } from '../domain/dates';

interface Props {
  onPickRecipe: (date: string) => void;
  onChooseIngredients: (date: string) => void;
}

/** Madplan: ugen fra mandag til søndag med én ret pr. dag. Viser denne uge og kan bladres frem. */
export function MealPlanScreen({ onPickRecipe, onChooseIngredients }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const recipes = useRecipes();
  const ingredients = useRecipeIngredients();
  const items = useItems();
  const plan = useMealPlan();

  if (!recipes || !ingredients || !items || !plan) return <main className="screen" aria-busy="true" />;

  const today = toISODate(new Date());
  const monday = addDays(mondayOf(today), weekOffset * 7);
  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const itemName = new Map(items.map((i) => [i.id, i.name]));
  const entryByDate = new Map(plan.map((m) => [m.date, m]));
  const ingNames = (recipeId: string) =>
    ingredients
      .filter((x) => x.recipeId === recipeId)
      .map((x) => itemName.get(x.itemId))
      .filter((n): n is string => n !== undefined)
      .sort((a, b) => a.localeCompare(b, 'da'))
      .join(', ');

  const week = isoWeek(monday);

  return (
    <main className="screen screen--tight">
      <header className="screen__head screen__head--row">
        <div>
          <p className="eyebrow">{weekOffset === 0 ? `Uge ${week} · denne uge` : `Uge ${week}`}</p>
          <h1 className="title">Madplan</h1>
        </div>
        <div className="week-nav">
          <button
            type="button"
            className="icon-btn icon-btn--card"
            aria-label="Forrige uge"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
          >
            <ChevronLeft size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--card"
            aria-label="Næste uge"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            <ChevronRight size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>
      </header>

      {weekDates(monday).map((date) => {
        const entry = entryByDate.get(date);
        const recipe = entry ? recipeById.get(entry.recipeId) : undefined;
        const day = dayName(date).toLowerCase();
        return (
          <article key={date} className="card day" aria-label={`${dayName(date)} ${shortDayLabel(date).split(' ')[1]}`}>
            <p className="day__label">
              {shortDayLabel(date)}
              {date === today && <span className="day__today"> · i dag</span>}
            </p>
            {entry && recipe ? (
              <>
                <button
                  type="button"
                  className="day__dish"
                  aria-label={`Skift ret for ${day}: ${recipe.name}`}
                  onClick={() => onPickRecipe(date)}
                >
                  <span>{recipe.name}</span>
                  <ChevronDown size={20} strokeWidth={2.2} className="day__chev" aria-hidden="true" />
                </button>
                <p className="day__ing">{ingNames(recipe.id)}</p>
                {entry.ingredientsAddedAt ? (
                  <div className="day__done">
                    <span className="day__ok">
                      <Check size={16} strokeWidth={3} aria-hidden="true" />
                      Ingredienser er valgt
                    </span>
                    <button
                      type="button"
                      className="soft-btn"
                      aria-label={`Vælg ingredienser igen for ${day}`}
                      onClick={() => onChooseIngredients(date)}
                    >
                      Vælg igen
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-outline btn-outline--sm"
                    aria-label={`Vælg ingredienser til ${recipe.name}`}
                    onClick={() => onChooseIngredients(date)}
                  >
                    Vælg ingredienser
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                className="dashed-btn"
                aria-label={`Tilføj ret til ${day}`}
                onClick={() => onPickRecipe(date)}
              >
                <Plus size={18} strokeWidth={2.6} aria-hidden="true" />
                Tilføj ret
              </button>
            )}
          </article>
        );
      })}
    </main>
  );
}
