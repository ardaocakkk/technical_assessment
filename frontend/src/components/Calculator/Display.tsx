interface DisplayProps {
  operandA: string;
  operation: string | null;
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
    content = [operandA || '0', operation, operandB].filter(Boolean).join(' ');
  }

  return (
    <div
      data-testid="display"
      className={`w-full rounded-md p-4 text-right text-2xl font-mono break-all ${
        error ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-900'
      }`}
    >
      {content}
    </div>
  );
}
