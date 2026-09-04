import { useQuery } from '@tanstack/react-query';
import { fetchHistory } from '../api/calculatorApi';

export function useHistory() {
  return useQuery({
    queryKey: ['history'],
    queryFn: fetchHistory,
  });
}
