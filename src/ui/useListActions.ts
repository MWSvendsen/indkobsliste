import { useCallback } from 'react';
import { db } from '../data/db';
import type { Item } from '../data/types';
import { addToList, setQuantity } from '../domain/list';
import { useRun } from './useToast';

/** Sæt på listen og ret antal. Bruges af Tilføj vare og Varer. */
export function useListActions() {
  const run = useRun();
  const add = useCallback(
    (item: Item) => run(() => addToList(db, [{ itemId: item.id, quantity: 1 }]), () => `${item.name} er på listen`),
    [run],
  );
  const setQty = useCallback(
    (item: Item, quantity: number) => run(() => setQuantity(db, item.id, quantity)),
    [run],
  );
  return { add, setQty };
}
