import { create } from 'zustand';
import type { OperationType } from '../types/calculator';

interface CalculatorState {
  operandA: string;
  operandB: string;
  operation: OperationType | null;
  setOperandA: (value: string) => void;
  setOperandB: (value: string) => void;
  setOperation: (operation: OperationType | null) => void;
  reset: () => void;
}

export const useCalculatorStore = create<CalculatorState>((set) => ({
  operandA: '',
  operandB: '',
  operation: null,
  setOperandA: (value) => set({ operandA: value }),
  setOperandB: (value) => set({ operandB: value }),
  setOperation: (operation) => set({ operation }),
  reset: () => set({ operandA: '', operandB: '', operation: null }),
}));
