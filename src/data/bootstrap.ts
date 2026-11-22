import { db } from './db';
import { ensureSeeded } from './seed';

/** Køres én gang, når appen starter. */
export async function initDatabase(): Promise<void> {
  const seeded = await ensureSeeded(db);
  if (seeded) {
    // Beder Safari om ikke at rydde data væk. Afvisning er ikke en fejl.
    try {
      await navigator.storage?.persist?.();
    } catch {
      // ignoreres
    }
  }
}
