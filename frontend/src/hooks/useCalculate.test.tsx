import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCalculate } from './useCalculate';
import * as calculatorApi from '../api/calculatorApi';

function createWrapper() {
  const queryClient = new QueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useCalculate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls calculatorApi.calculate and exposes the result', async () => {
    vi.spyOn(calculatorApi, 'calculate').mockResolvedValue({ result: 5 });

    const { result } = renderHook(() => useCalculate(), { wrapper: createWrapper() });

    result.current.mutate({ operation: 'ADD', operandA: 2, operandB: 3 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ result: 5 });
  });

  it('invalidates the history query on success', async () => {
    vi.spyOn(calculatorApi, 'calculate').mockResolvedValue({ result: 5 });
    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCalculate(), { wrapper });
    result.current.mutate({ operation: 'ADD', operandA: 2, operandB: 3 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['history'] });
  });
});
