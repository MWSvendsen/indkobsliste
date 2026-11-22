import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type Flash } from './useToast';

export const TOAST_MS = 2400;

/** Kort besked nederst på skærmen, fx "Mælk er på listen". */
export function ToastProvider({ children }: { children: ReactNode }) {
  // Teksten bliver stående, mens beskeden toner ud, så kassen ikke ses tom.
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flash = useCallback<Flash>((msg) => {
    clearTimeout(timer.current);
    setMessage(msg);
    setVisible(true);
    timer.current = setTimeout(() => setVisible(false), TOAST_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={flash}>
      {children}
      <p role="status" aria-live="polite" className={visible ? 'toast toast--on' : 'toast'}>
        {visible ? message : <span aria-hidden="true">{message}</span>}
      </p>
    </ToastContext.Provider>
  );
}
