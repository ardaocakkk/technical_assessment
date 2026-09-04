import axios from 'axios';
import type { ApiError, CalculationRequest, CalculationResponse, HistoryEntry } from '../types/calculator';
import { getClientId } from '../lib/clientId';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  config.headers.set('X-Client-Id', getClientId());
  return config;
});

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    if (apiError?.message) {
      return apiError.message;
    }
  }
  return 'Unexpected error';
}

export async function calculate(request: CalculationRequest): Promise<CalculationResponse> {
  try {
    const response = await apiClient.post<CalculationResponse>('/api/calculate', request);
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  try {
    const response = await apiClient.get<HistoryEntry[]>('/api/history');
    return response.data;
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}
