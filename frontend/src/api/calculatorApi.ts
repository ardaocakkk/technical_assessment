import axios from 'axios';
import type { ApiError, CalculationRequest, CalculationResponse, HistoryEntry } from '../types/calculator';
import { getClientId } from '../lib/clientId';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  config.headers.set('X-Client-Id', getClientId());
  return config;
});

/**
 * Carries the HTTP status alongside the message so callers can tell a definite
 * client error (4xx — retrying won't help) from a transient failure (network
 * error with no response at all, or a 5xx) worth retrying. `status` is
 * `undefined` when the request never got a response (e.g. the backend is
 * still starting up — see useHistory's retry logic).
 */
export class ApiRequestError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
  }
}

function toApiRequestError(error: unknown): ApiRequestError {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError | undefined;
    return new ApiRequestError(apiError?.message ?? 'Unexpected error', error.response?.status);
  }
  return new ApiRequestError('Unexpected error');
}

export async function calculate(request: CalculationRequest): Promise<CalculationResponse> {
  try {
    const response = await apiClient.post<CalculationResponse>('/api/calculate', request);
    return response.data;
  } catch (error) {
    throw toApiRequestError(error);
  }
}

export async function fetchHistory(): Promise<HistoryEntry[]> {
  try {
    const response = await apiClient.get<HistoryEntry[]>('/api/history');
    return response.data;
  } catch (error) {
    throw toApiRequestError(error);
  }
}
