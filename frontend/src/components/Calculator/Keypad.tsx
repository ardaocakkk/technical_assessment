import type { OperationType } from '../../types/calculator';

interface KeypadProps {
  onDigit: (digit: string) => void;
  onDecimal: () => void;
  onOperation: (operation: OperationType) => void;
  onEquals: () => void;
  onClear: () => void;
}

const OPERATION_BUTTONS: { label: string; operation: OperationType }[] = [
  { label: '+', operation: 'ADD' },
  { label: '-', operation: 'SUBTRACT' },
  { label: '×', operation: 'MULTIPLY' },
  { label: '÷', operation: 'DIVIDE' },
  { label: '^', operation: 'EXPONENT' },
  { label: '√', operation: 'SQRT' },
  { label: '%', operation: 'PERCENTAGE' },
];

const digitClass =
  'rounded-md bg-neutral-100 p-3 text-base font-semibold text-neutral-900 shadow active:scale-95 transition hover:bg-white';
const operationClass =
  'rounded-md bg-neutral-700 p-3 text-base font-semibold text-neutral-100 shadow active:scale-95 transition hover:bg-neutral-600';

export function Keypad({ onDigit, onDecimal, onOperation, onEquals, onClear }: KeypadProps) {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-xl bg-neutral-800 p-3 sm:gap-3">
      {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0'].map((digit) => (
        <button key={digit} type="button" className={digitClass} onClick={() => onDigit(digit)}>
          {digit}
        </button>
      ))}
      <button type="button" className={digitClass} onClick={onDecimal}>
        .
      </button>
      {OPERATION_BUTTONS.map(({ label, operation }) => (
        <button
          key={operation}
          type="button"
          className={operationClass}
          onClick={() => onOperation(operation)}
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        className="rounded-md bg-red-800 p-3 text-base font-semibold text-red-50 shadow active:scale-95 transition hover:bg-red-700"
        onClick={onClear}
      >
        C
      </button>
      <button
        type="button"
        className="rounded-md bg-orange-600 p-3 text-base font-semibold text-white shadow active:scale-95 transition hover:bg-orange-500"
        onClick={onEquals}
      >
        =
      </button>
    </div>
  );
}
