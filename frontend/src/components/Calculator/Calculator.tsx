import { useCalculatorStore } from '../../store/calculatorStore';
import { useCalculate } from '../../hooks/useCalculate';
import { isUnaryOperation } from '../../types/calculator';
import { Display } from './Display';
import { Keypad } from './Keypad';

export function Calculator() {
  const { operandA, operandB, operation, setOperandA, setOperandB, setOperation, reset } =
    useCalculatorStore();
  const { mutate, data, error, reset: resetMutation } = useCalculate();

  const enteringOperandB = operation !== null;

  function handleDigit(digit: string) {
    resetMutation();
    if (enteringOperandB) {
      setOperandB(operandB + digit);
    } else {
      setOperandA(operandA + digit);
    }
  }

  function handleOperation(nextOperation: Parameters<typeof setOperation>[0]) {
    resetMutation();
    setOperation(nextOperation);
  }

  function handleEquals() {
    if (operation === null || operandA === '') {
      return;
    }
    const unary = isUnaryOperation(operation);
    if (!unary && operandB === '') {
      return;
    }
    mutate({
      operation,
      operandA: Number(operandA),
      operandB: unary ? undefined : Number(operandB),
    });
  }

  function handleClear() {
    resetMutation();
    reset();
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-xs space-y-4 rounded-lg bg-gray-50 p-4 shadow sm:max-w-sm">
      <Display
        operandA={operandA}
        operation={operation}
        operandB={operandB}
        result={data ? String(data.result) : null}
        error={error ? error.message : null}
      />
      <Keypad
        onDigit={handleDigit}
        onOperation={handleOperation}
        onEquals={handleEquals}
        onClear={handleClear}
      />
    </div>
  );
}
