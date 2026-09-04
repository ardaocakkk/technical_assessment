import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiClient, calculate, fetchHistory } from './calculatorApi';

vi.mock('../lib/clientId', () => ({
  getClientId: () => 'test-client-id',
}));

describe('calculate', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the parsed result on success', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { result: 5 } });

    const result = await calculate({ operation: 'ADD', operandA: 2, operandB: 3 });

    expect(result).toEqual({ result: 5 });
  });

  it('posts to /api/calculate with the request body', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { result: 5 } });

    await calculate({ operation: 'ADD', operandA: 2, operandB: 3 });

    expect(postSpy).toHaveBeenCalledWith('/api/calculate', { operation: 'ADD', operandA: 2, operandB: 3 });
  });

  it('throws with the backend error message on failure', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Cannot divide by zero', timestamp: '2026-09-04T00:00:00Z' } },
    });

    await expect(calculate({ operation: 'DIVIDE', operandA: 5, operandB: 0 }))
      .rejects.toThrow('Cannot divide by zero');
  });
});

describe('fetchHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the parsed history list on success', async () => {
    const entries = [
      { id: 1, operation: 'ADD', operandA: 2, operandB: 3, result: 5, createdAt: '2026-09-05T00:00:00Z' },
    ];
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: entries });

    const result = await fetchHistory();

    expect(result).toEqual(entries);
  });

  it('throws with the backend error message on failure', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Missing required header: X-Client-Id', timestamp: '2026-09-05T00:00:00Z' } },
    });

    await expect(fetchHistory()).rejects.toThrow('Missing required header: X-Client-Id');
  });
});
