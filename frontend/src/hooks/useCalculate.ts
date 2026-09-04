import { useMutation } from '@tanstack/react-query';
import { calculate } from '../api/calculatorApi';
import type { CalculationRequest } from '../types/calculator';

export function useCalculate() {
  return useMutation({
    mutationFn: (request: CalculationRequest) => calculate(request),
  });
}
