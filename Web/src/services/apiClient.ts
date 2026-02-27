export interface ApiError extends Error {
  status?: number;
  details?: any;
}

const API_BASE = '/api';

const buildHeaders = (extra?: HeadersInit) => {
  return {
    'Content-Type': 'application/json',
    ...(extra || {})
  };
};

export const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options.headers),
    credentials: 'include'
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('camping-user');
    }
    const error: ApiError = new Error(data?.message || 'Request failed');
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data as T;
};
