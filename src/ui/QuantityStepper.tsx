import { Minus, Plus } from 'lucide-react';

interface Props {
  name: string;
  quantity: number;
  onChange: (quantity: number) => void;
  /** Tekst til minus ved antal 1, fx "Fjern Mælk fra listen". */
  removeLabel?: string;
}

/** Minus, antal og plus. Minus ved 1 fjerner. */
export function QuantityStepper({ name, quantity, onChange, removeLabel }: Props) {
  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper__btn"
        aria-label={quantity <= 1 ? (removeLabel ?? `Fjern ${name} fra listen`) : `Én mindre ${name}`}
        onClick={() => onChange(quantity - 1)}
      >
        <Minus size={16} strokeWidth={2.8} aria-hidden="true" />
      </button>
      <span className="stepper__qty">{quantity}</span>
      <button
        type="button"
        className="stepper__btn stepper__btn--plus"
        aria-label={`Én mere ${name}`}
        onClick={() => onChange(quantity + 1)}
      >
        <Plus size={16} strokeWidth={2.8} aria-hidden="true" />
      </button>
    </div>
  );
}
