import { X } from 'lucide-react';
import { useEffect, useId, type ReactNode } from 'react';

interface SheetProps {
  title: ReactNode;
  /** Lille tekst over titlen, fx dagen. */
  eyebrow?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Knapper i bunden, der altid er synlige. */
  footer?: ReactNode;
}

/** Bundark med baggrundslag. Escape, tryk på baggrunden og krydset lukker. */
export function Sheet({ title, eyebrow, onClose, children, footer }: SheetProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="sheet-layer">
      <button type="button" className="sheet-scrim" aria-label="Luk" tabIndex={-1} onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <span className="sheet__handle" aria-hidden="true" />
        <header className="sheet__header">
          <div>
            {eyebrow && <p className="sheet__eyebrow">{eyebrow}</p>}
            <h2 id={titleId} className="sheet__title">
              {title}
            </h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Luk" onClick={onClose}>
            <X size={18} strokeWidth={2.6} aria-hidden="true" />
          </button>
        </header>
        <div className="sheet__body">{children}</div>
        {footer && <footer className="sheet__footer">{footer}</footer>}
      </section>
    </div>
  );
}
