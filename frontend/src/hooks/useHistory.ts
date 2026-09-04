import { useQuery } from '@tanstack/react-query';
import { fetchHistory } from '../api/calculatorApi';

export function useHistory() {
  return useQuery({
    queryKey: ['history'],
    queryFn: fetchHistory,
    // A failing history fetch is almost always a client bug (missing/blank X-Client-Id),
    // not a transient network fault, so retrying three times with backoff just delays the
    // error surfacing in the UI.
    retry: false,
  });
}
