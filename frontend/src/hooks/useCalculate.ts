import { useMutation, useQueryClient } from '@tanstack/react-query';
import { calculate } from '../api/calculatorApi';
import type { CalculationRequest } from '../types/calculator';

export function useCalculate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CalculationRequest) => calculate(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
}
