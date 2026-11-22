import { CalendarDays, Plus } from 'lucide-react';
import { useItems, useMealPlan, useRecipeIngredients, useRecipes } from '../data/hooks';
import { byName } from '../domain/common';
import { plannedLabel, toISODate } from '../domain/dates';

interface Props {
  /** null = ny ret */
  onEdit: (recipeId: string | null) => void;
  /** "Sæt på madplanen": vælg dag og derefter ingredienser. */
  onPlan: (recipeId: string) => void;
}

/** Retter: retkataloget med ingredienser og hvilke dage, retten står på madplanen. */
export function RecipesScreen({ onEdit, onPlan }: Props) {
  const recipes = useRecipes();
  const ingredients = useRecipeIngredients();
  const items = useItems();
  const plan = useMealPlan();

  if (!recipes || !ingredients || !items || !plan) return <main className="screen" aria-busy="true" />;

  const itemName = new Map(items.map((i) => [i.id, i.name]));
  const today = toISODate(new Date());

  return (
    <main className="screen screen--tight">
      <header className="screen__head screen__head--row">
        <div>
          <p className="eyebrow">{recipes.length} retter</p>
          <h1 className="title">Retter</h1>
        </div>
        <button type="button" className="pill-btn pill-btn--accent" onClick={() => onEdit(null)}>
          <Plus size={18} strokeWidth={2.6} aria-hidden="true" />
          Ny ret
        </button>
      </header>

      {recipes.length === 0 && (
        <section className="card empty">
          <h2>Ingen retter endnu</h2>
          <p>Tryk på Ny ret for at oprette jeres første ret med faste ingredienser.</p>
        </section>
      )}

      {[...recipes].sort(byName).map((recipe) => {
        const names = ingredients
          .filter((x) => x.recipeId === recipe.id)
          .map((x) => itemName.get(x.itemId))
          .filter((n): n is string => n !== undefined)
          .sort((a, b) => a.localeCompare(b, 'da'));
        const planned = plannedLabel(
          plan.filter((m) => m.recipeId === recipe.id).map((m) => m.date),
          today,
        );
        return (
          <article key={recipe.id} className="card recipe">
            <h2 className="recipe__title">
              <button
                type="button"
                className="recipe__head"
                aria-label={`Rediger ${recipe.name}`}
                onClick={() => onEdit(recipe.id)}
              >
                <span className="recipe__name">{recipe.name}</span>
                <span className="recipe__edit" aria-hidden="true">
                  Rediger
                </span>
              </button>
            </h2>
            <p className="recipe__meta">
              {names.length} ingredienser · {names.join(', ')}
            </p>
            {planned && <p className="recipe__planned">{planned}</p>}
            <button
              type="button"
              className="btn-outline btn-outline--sm btn-icon"
              aria-label={`Sæt ${recipe.name} på madplanen`}
              onClick={() => onPlan(recipe.id)}
            >
              <CalendarDays size={18} strokeWidth={2} aria-hidden="true" />
              Sæt på madplanen
            </button>
          </article>
        );
      })}
    </main>
  );
}
