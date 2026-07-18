import type { ApiClientConfig } from './types';
import { ApiError } from './types';

async function request(config: ApiClientConfig, path: string, options: RequestInit = {}): Promise<void> {
  const token = config.getToken();
  const res = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new ApiError(res.status, message.trim());
  }
}

export function authApiClient(config: ApiClientConfig) {
  return {
    deleteAccount(): Promise<void> {
      return request(config, '/users/me', { method: 'DELETE' });
    },
  };
}
