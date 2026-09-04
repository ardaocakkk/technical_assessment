import { OPERATION_SYMBOLS, type OperationType } from '../../types/calculator';

interface DisplayProps {
  operandA: string;
  operation: OperationType | null;
  operandB: string;
  result: string | null;
  error: string | null;
}

export function Display({ operandA, operation, operandB, result, error }: DisplayProps) {
  let content: string;
  if (error) {
    content = error;
  } else if (result !== null) {
    content = result;
  } else {
    const operationSymbol = operation ? OPERATION_SYMBOLS[operation] : null;
    content = [operandA || '0', operationSymbol, operandB].filter(Boolean).join(' ');
  }

  return (
    <div
      data-testid="display"
      className={`w-full rounded-md border-2 p-4 text-right text-2xl font-mono break-all ${
        error
          ? 'border-red-900 bg-red-950 text-red-300'
          : 'border-lime-900 bg-lime-100 text-neutral-900'
      }`}
    >
      {content}
    </div>
  );
}
