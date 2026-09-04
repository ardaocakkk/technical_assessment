import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useHistory } from './useHistory';
import * as calculatorApi from '../api/calculatorApi';

function createWrapper() {
  const queryClient = new QueryClient();
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
});
