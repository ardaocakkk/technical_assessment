import { useEffect } from 'react';
import { useCalculatorLogic } from '../../hooks/useCalculatorLogic';
import { useCalculate } from '../../hooks/useCalculate';
import { useHistory } from '../../hooks/useHistory';
import { Display } from './Display';
import { Keypad } from './Keypad';
import { History } from './History';

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
