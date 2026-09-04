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
