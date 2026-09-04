import { useEffect } from 'react';
import { useCalculatorLogic } from '../../hooks/useCalculatorLogic';
import { useCalculate } from '../../hooks/useCalculate';
import { useHistory } from '../../hooks/useHistory';
import type { OperationType } from '../../types/calculator';
import { Display } from './Display';
import { Keypad } from './Keypad';
import { History } from './History';

/** Maps a keyboard key to the operation it should select. No key is bound to
 * SQRT — there's no keyboard character in general use for a square-root
 * symbol, unlike the other six operations which all sit on a standard keyboard. */
const KEY_OPERATIONS: Record<string, OperationType> = {
  '+': 'ADD',
  '-': 'SUBTRACT',
  '*': 'MULTIPLY',
  '/': 'DIVIDE',
  '^': 'EXPONENT',
  '%': 'PERCENTAGE',
};

export function Calculator() {
  const logic = useCalculatorLogic();
  const { mutate } = useCalculate();
  const history = useHistory();

  useEffect(() => {
    if (!logic.pendingRequest) {
      return;
    }
    const request = logic.pendingRequest;
    logic.acknowledgeRequestSent();
    mutate(request, {
      onSuccess: (response) => logic.reportSuccess(response.result),
      onError: (error) => logic.reportError(error.message),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logic.pendingRequest]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key >= '0' && event.key <= '9') {
        logic.enterDigit(event.key);
        return;
      }
      if (event.key === '.') {
        logic.enterDecimal();
        return;
      }
      if (event.key in KEY_OPERATIONS) {
        logic.selectOperation(KEY_OPERATIONS[event.key]);
        return;
      }
      if (event.key === 'Enter' || event.key === '=') {
        logic.submit();
        return;
      }
      if (event.key === 'Escape') {
        logic.clear();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // `logic`'s methods (enterDigit, enterDecimal, selectOperation, submit, clear) are thin
    // wrappers around useReducer's dispatch, which React guarantees is referentially stable
    // across renders, so capturing them once here is safe and doesn't need the whole `logic`
    // object threaded through the dependency array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto mt-10 w-full max-w-xs rounded-2xl bg-neutral-900 p-4 shadow-2xl sm:max-w-sm">
      <div className="mb-3 text-center text-[10px] tracking-widest text-neutral-400">
        fx-CALC · SOLAR
      </div>
      <Display
        operandA={logic.operandA}
        operation={logic.operation}
        operandB={logic.operandB}
        result={logic.phase === 'result' ? logic.operandA : null}
        error={logic.phase === 'error' ? logic.errorMessage : null}
      />
      <div className="mt-4">
        <Keypad
          onDigit={logic.enterDigit}
          onDecimal={logic.enterDecimal}
          onOperation={logic.selectOperation}
          onEquals={logic.submit}
          onClear={logic.clear}
        />
      </div>
      <History
        entries={history.data ?? []}
        error={history.isError ? 'Could not load history' : null}
      />
    </div>
  );
}
