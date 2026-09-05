import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalculatorLogic } from './useCalculatorLogic';

describe('useCalculatorLogic', () => {
  it('starts a fresh expression when a digit is pressed after a result', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.reportSuccess(5);
    });
    expect(result.current.phase).toBe('result');

    act(() => {
      result.current.enterDigit('7');
    });

    expect(result.current.operandA).toBe('7');
    expect(result.current.phase).toBe('input');
  });

  it('refuses a second decimal point in the same operand', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.enterDigit('1');
      result.current.enterDecimal();
      result.current.enterDigit('5');
      result.current.enterDecimal();
      result.current.enterDigit('9');
    });

    expect(result.current.operandA).toBe('1.59');
  });

  it('chains operations by requesting the pending calculation before continuing', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.enterDigit('2');
      result.current.selectOperation('ADD');
      result.current.enterDigit('3');
      result.current.selectOperation('MULTIPLY');
    });

    expect(result.current.pendingRequest).toEqual({ operation: 'ADD', operandA: 2, operandB: 3 });

    act(() => {
      result.current.acknowledgeRequestSent();
      result.current.reportSuccess(5);
    });

    expect(result.current.operandA).toBe('5');
    expect(result.current.operation).toBe('MULTIPLY');
    expect(result.current.operandB).toBe('');
    expect(result.current.phase).toBe('input');
  });

  it('ignores digit and decimal input after selecting a unary operation', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.enterDigit('9');
      result.current.selectOperation('SQRT');
      result.current.enterDigit('4');
      result.current.enterDecimal();
    });

    expect(result.current.operandB).toBe('');
    expect(result.current.operandA).toBe('9');
  });

  it('builds a unary request with no operandB after ignored keypresses', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.enterDigit('9');
      result.current.selectOperation('SQRT');
      result.current.enterDigit('4');
      result.current.submit();
    });

    expect(result.current.pendingRequest).toEqual({
      operation: 'SQRT',
      operandA: 9,
      operandB: undefined,
    });
  });

  it('treats a leading minus as a negative sign, not subtraction, when operandA is empty', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.selectOperation('SUBTRACT');
    });

    expect(result.current.operandA).toBe('-');
    expect(result.current.operation).toBeNull();

    act(() => {
      result.current.enterDigit('5');
    });

    expect(result.current.operandA).toBe('-5');
  });

  it('treats a leading minus as a negative sign for operandB too', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.enterDigit('9');
      result.current.selectOperation('ADD');
      result.current.selectOperation('SUBTRACT');
    });

    expect(result.current.operandB).toBe('-');
    expect(result.current.operation).toBe('ADD');

    act(() => {
      result.current.enterDigit('3');
    });

    expect(result.current.operandB).toBe('-3');
  });

  it('does not submit or start an operation with a bare sign as the operand', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.selectOperation('SUBTRACT');
      result.current.selectOperation('ADD');
      result.current.submit();
    });

    expect(result.current.operation).toBeNull();
    expect(result.current.pendingRequest).toBeNull();
  });

  it('does not request a calculation for an incomplete expression', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.enterDigit('2');
      result.current.selectOperation('ADD');
      result.current.submit();
    });

    expect(result.current.pendingRequest).toBeNull();
  });

  it('clears everything on clear', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.enterDigit('9');
      result.current.clear();
    });

    expect(result.current.operandA).toBe('');
    expect(result.current.phase).toBe('input');
  });

  it('reports an error and moves to the error phase', () => {
    const { result } = renderHook(() => useCalculatorLogic());

    act(() => {
      result.current.enterDigit('5');
      result.current.selectOperation('DIVIDE');
      result.current.enterDigit('0');
      result.current.submit();
      result.current.acknowledgeRequestSent();
      result.current.reportError('Cannot divide by zero');
    });

    expect(result.current.phase).toBe('error');
    expect(result.current.errorMessage).toBe('Cannot divide by zero');
  });
});
