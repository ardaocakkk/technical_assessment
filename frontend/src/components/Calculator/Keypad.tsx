import type { OperationType } from '../../types/calculator';

interface KeypadProps {
  onDigit: (digit: string) => void;
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

const buttonClass =
  'rounded-md bg-white p-4 text-lg font-semibold shadow hover:bg-gray-50 active:bg-gray-100';

export function Keypad({ onDigit, onOperation, onEquals, onClear }: KeypadProps) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'].map((digit) => (
        <button key={digit} type="button" className={buttonClass} onClick={() => onDigit(digit)}>
          {digit}
        </button>
      ))}
      {OPERATION_BUTTONS.map(({ label, operation }) => (
        <button
          key={operation}
          type="button"
          className={`${buttonClass} bg-blue-50`}
          onClick={() => onOperation(operation)}
        >
          {label}
        </button>
      ))}
      <button type="button" className={`${buttonClass} bg-red-50`} onClick={onClear}>
        C
      </button>
      <button type="button" className={`${buttonClass} bg-green-100`} onClick={onEquals}>
        =
      </button>
    </div>
  );
}
