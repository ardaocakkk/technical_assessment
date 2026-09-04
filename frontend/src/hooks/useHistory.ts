import { useQuery } from '@tanstack/react-query';
import { ApiRequestError, fetchHistory } from '../api/calculatorApi';

export function useHistory() {
  return useQuery({
    queryKey: ['history'],
    queryFn: fetchHistory,
    // A 4xx response (e.g. a missing X-Client-Id header) is a definite client bug —
    // retrying won't fix it, so give up immediately. Anything else (no response at all,
    // e.g. the backend is still starting up right after `docker compose up`, or a 5xx)
    // is transient and worth a few retries with the client's default backoff.
    retry: (failureCount, error) => {
      if (error instanceof ApiRequestError && error.status !== undefined && error.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
