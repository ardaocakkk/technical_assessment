import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useHistory } from './useHistory';
import * as calculatorApi from '../api/calculatorApi';
import { ApiRequestError } from '../api/calculatorApi';

function createWrapper() {
  // A short retryDelay keeps the retry-behavior tests fast; useHistory itself doesn't
  // set retryDelay, so it inherits whatever the QueryClient's defaults specify.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 1 } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches history and exposes the result', async () => {
    vi.spyOn(calculatorApi, 'fetchHistory').mockResolvedValue([
      { id: 1, operation: 'ADD', operandA: 2, operandB: 3, result: 5, createdAt: '2026-09-05T00:00:00Z' },
    ]);

    const { result } = renderHook(() => useHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it('does not retry a definite 400 client error', async () => {
    const fetchSpy = vi
      .spyOn(calculatorApi, 'fetchHistory')
      .mockRejectedValue(new ApiRequestError('Missing required header: X-Client-Id', 400));

    const { result } = renderHook(() => useHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('retries a transient failure with no response (e.g. backend still starting up)', async () => {
    const fetchSpy = vi
      .spyOn(calculatorApi, 'fetchHistory')
      .mockRejectedValueOnce(new ApiRequestError('Unexpected error'))
      .mockRejectedValueOnce(new ApiRequestError('Unexpected error'))
      .mockResolvedValueOnce([]);

    const { result } = renderHook(() => useHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});
