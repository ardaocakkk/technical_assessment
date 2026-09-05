import { useReducer } from 'react';
import type { CalculationRequest, OperationType } from '../types/calculator';
import { isUnaryOperation } from '../types/calculator';

type Phase = 'input' | 'result' | 'error';

interface State {
  operandA: string;
  operandB: string;
  operation: OperationType | null;
  phase: Phase;
  errorMessage: string | null;
  pendingRequest: CalculationRequest | null;
  pendingIsChain: boolean;
}

type Action =
  | { type: 'DIGIT'; digit: string }
  | { type: 'DECIMAL' }
  | { type: 'OPERATION'; operation: OperationType }
  | { type: 'EQUALS' }
  | { type: 'CLEAR' }
  | { type: 'REQUEST_SENT' }
  | { type: 'CALCULATION_SUCCESS'; result: number }
  | { type: 'CALCULATION_ERROR'; message: string };

const initialState: State = {
  operandA: '',
  operandB: '',
  operation: null,
  phase: 'input',
  errorMessage: null,
  pendingRequest: null,
  pendingIsChain: false,
};

function appendDigit(current: string, digit: string): string {
  return current === '0' ? digit : current + digit;
}

function appendDecimal(current: string): string {
  if (current.includes('.')) {
    return current;
  }
  return current === '' ? '0.' : current + '.';
}

/** True for an operand that isn't a usable number yet — either untouched, or just a
 * lone leading minus sign with no digits typed after it. */
function isIncompleteOperand(value: string): boolean {
  return value === '' || value === '-';
}

function buildRequest(state: State): CalculationRequest {
  const unary = state.operation !== null && isUnaryOperation(state.operation);
  return {
    operation: state.operation as OperationType,
    operandA: Number(state.operandA),
    operandB: unary ? undefined : Number(state.operandB),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'DIGIT': {
      if (state.phase !== 'input') {
        return { ...initialState, operandA: action.digit };
      }
      if (state.operation === null) {
        return { ...state, operandA: appendDigit(state.operandA, action.digit) };
      }
      // Unary operations have no operandB — buildRequest drops it — so accepting digits
      // here would show an operand on the display that the request never sends.
      if (isUnaryOperation(state.operation)) {
        return state;
      }
      return { ...state, operandB: appendDigit(state.operandB, action.digit) };
    }

    case 'DECIMAL': {
      if (state.phase !== 'input') {
        return { ...initialState, operandA: '0.' };
      }
      if (state.operation === null) {
        return { ...state, operandA: appendDecimal(state.operandA) };
      }
      if (isUnaryOperation(state.operation)) {
        return state;
      }
      return { ...state, operandB: appendDecimal(state.operandB) };
    }

    case 'OPERATION': {
      // A leading minus when the operand currently being entered is still empty means
      // "negative number", not "subtract" — there's nothing yet to subtract from.
      if (action.operation === 'SUBTRACT') {
        if (state.operation === null && state.operandA === '') {
          return { ...state, operandA: '-' };
        }
        if (state.operation !== null && state.operandB === '') {
          return { ...state, operandB: '-' };
        }
      }
      if (isIncompleteOperand(state.operandA)) {
        return state;
      }
      if (state.phase === 'input' && state.operation !== null && !isIncompleteOperand(state.operandB)) {
        return {
          ...state,
          pendingRequest: buildRequest(state),
          pendingIsChain: true,
          operation: action.operation,
        };
      }
      return { ...state, operation: action.operation, phase: 'input', operandB: '' };
    }

    case 'EQUALS': {
      if (state.operation === null || isIncompleteOperand(state.operandA)) {
        return state;
      }
      const unary = isUnaryOperation(state.operation);
      if (!unary && isIncompleteOperand(state.operandB)) {
        return state;
      }
      return { ...state, pendingRequest: buildRequest(state), pendingIsChain: false };
    }

    case 'REQUEST_SENT':
      return { ...state, pendingRequest: null };

    case 'CALCULATION_SUCCESS':
      return state.pendingIsChain
        ? { ...initialState, operandA: String(action.result), operation: state.operation }
        : { ...initialState, operandA: String(action.result), phase: 'result' };

    case 'CALCULATION_ERROR':
      return { ...initialState, phase: 'error', errorMessage: action.message };

    case 'CLEAR':
      return initialState;

    default:
      return state;
  }
}

export function useCalculatorLogic() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return {
    ...state,
    enterDigit: (digit: string) => dispatch({ type: 'DIGIT', digit }),
    enterDecimal: () => dispatch({ type: 'DECIMAL' }),
    selectOperation: (operation: OperationType) => dispatch({ type: 'OPERATION', operation }),
    submit: () => dispatch({ type: 'EQUALS' }),
    clear: () => dispatch({ type: 'CLEAR' }),
    acknowledgeRequestSent: () => dispatch({ type: 'REQUEST_SENT' }),
    reportSuccess: (result: number) => dispatch({ type: 'CALCULATION_SUCCESS', result }),
    reportError: (message: string) => dispatch({ type: 'CALCULATION_ERROR', message }),
  };
}
