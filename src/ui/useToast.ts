import { createContext, useCallback, useContext } from 'react';

export type Flash = (message: string) => void;

export const ToastContext = createContext<Flash>(() => {});

export const useToast = (): Flash => useContext(ToastContext);

/** Kører en handling og viser en fejl som toast i stedet for at gå i stykker. */
export function useRun() {
  const flash = useToast();
  return useCallback(
    async <T>(action: () => Promise<T>, success?: (result: T) => string): Promise<T | undefined> => {
      try {
        const result = await action();
        if (success) flash(success(result));
        return result;
      } catch (err) {
        console.error(err);
        flash(err instanceof Error && err.name === 'DomainError' ? err.message : 'Noget gik galt. Prøv igen.');
        return undefined;
      }
    },
    [flash],
  );
}
