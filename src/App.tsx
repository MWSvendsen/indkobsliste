import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { db } from './data/db';
import { useListEntries } from './data/hooks';
import { assignRecipe } from './domain/mealPlan';
import { AddItemSheet } from './screens/AddItemSheet';
import { CatalogScreen } from './screens/CatalogScreen';
import { ListScreen } from './screens/ListScreen';
import { MealPlanScreen } from './screens/MealPlanScreen';
import { IngredientsSheet, PickDaySheet, PickRecipeSheet } from './screens/MealSheets';
import { RecipeEditor } from './screens/RecipeEditor';
import { RecipesScreen } from './screens/RecipesScreen';
import { Nav, type Tab } from './ui/Nav';
import { ToastProvider } from './ui/toast';

type SheetState =
  | { type: 'add' }
  /** forDate: retten sættes på dagen, når den er gemt */
  | { type: 'editor'; recipeId: string | null; forDate?: string }
  | { type: 'pickRecipe'; date: string }
  | { type: 'pickDay'; recipeId: string }
  | { type: 'ingredients'; date: string }
  | null;

export function App() {
  const [tab, setTab] = useState<Tab>('liste');
  const [sheet, setSheet] = useState<SheetState>(null);
  const entries = useListEntries();
  const missing = entries?.filter((e) => !e.checked).length ?? 0;
  const closeSheet = useCallback(() => setSheet(null), []);
  const chooseIngredients = useCallback((date: string) => setSheet({ type: 'ingredients', date }), []);

  const changeTab = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  };

  const onRecipeSaved = async (recipeId: string, forDate?: string) => {
    if (!forDate) return;
    await assignRecipe(db, forDate, recipeId);
    setSheet({ type: 'ingredients', date: forDate });
  };

  return (
    <ToastProvider>
      {tab === 'liste' && <ListScreen />}
      {tab === 'varer' && <CatalogScreen />}
      {tab === 'madplan' && (
        <MealPlanScreen
          onPickRecipe={(date) => setSheet({ type: 'pickRecipe', date })}
          onChooseIngredients={chooseIngredients}
        />
      )}
      {tab === 'retter' && (
        <RecipesScreen
          onEdit={(recipeId) => setSheet({ type: 'editor', recipeId })}
          onPlan={(recipeId) => setSheet({ type: 'pickDay', recipeId })}
        />
      )}

      {!sheet && (tab === 'liste' || tab === 'varer') && (
        <button type="button" className="fab" onClick={() => setSheet({ type: 'add' })}>
          <Plus size={22} strokeWidth={2.6} aria-hidden="true" />
          Tilføj
        </button>
      )}

      <Nav tab={tab} onChange={changeTab} badge={missing} />

      {sheet?.type === 'add' && <AddItemSheet onClose={closeSheet} />}
      {sheet?.type === 'editor' && (
        <RecipeEditor
          key={sheet.recipeId ?? 'ny'}
          recipeId={sheet.recipeId}
          onClose={closeSheet}
          onSaved={(id) => void onRecipeSaved(id, sheet.forDate)}
        />
      )}
      {sheet?.type === 'pickRecipe' && (
        <PickRecipeSheet
          date={sheet.date}
          onClose={closeSheet}
          onAssigned={chooseIngredients}
          onNewRecipe={(date) => setSheet({ type: 'editor', recipeId: null, forDate: date })}
        />
      )}
      {sheet?.type === 'pickDay' && (
        <PickDaySheet recipeId={sheet.recipeId} onClose={closeSheet} onAssigned={chooseIngredients} />
      )}
      {sheet?.type === 'ingredients' && <IngredientsSheet key={sheet.date} date={sheet.date} onClose={closeSheet} />}
    </ToastProvider>
  );
}
