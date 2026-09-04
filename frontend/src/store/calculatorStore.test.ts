import { describe, it, expect, beforeEach } from 'vitest';
import { useCalculatorStore } from './calculatorStore';

describe('calculatorStore', () => {
  beforeEach(() => {
    useCalculatorStore.getState().reset();
  });

  it('starts with empty operands and no operation', () => {
    const state = useCalculatorStore.getState();
    expect(state.operandA).toBe('');
    expect(state.operandB).toBe('');
    expect(state.operation).toBeNull();
  });

  it('updates operandA, operandB, and operation', () => {
    useCalculatorStore.getState().setOperandA('2');
    useCalculatorStore.getState().setOperandB('3');
    useCalculatorStore.getState().setOperation('ADD');

    const state = useCalculatorStore.getState();
    expect(state.operandA).toBe('2');
    expect(state.operandB).toBe('3');
    expect(state.operation).toBe('ADD');
  });

  it('reset clears all fields', () => {
    useCalculatorStore.getState().setOperandA('2');
    useCalculatorStore.getState().reset();

    expect(useCalculatorStore.getState().operandA).toBe('');
  });
});
