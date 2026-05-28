import type { Routine } from '@timeapp/core';
import type { ApiClientConfig, CreateRoutineInput, UpdateRoutineInput } from './types';
import { ApiError } from './types';

async function request<T>(
  config: ApiClientConfig,
  path: string,
  options: RequestInit = {}
): Promise<T> {
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

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function routineApiClient(config: ApiClientConfig) {
  return {
    getAll(): Promise<Routine[]> {
      return request<Routine[]>(config, '/routines');
    },

    getById(id: string): Promise<Routine> {
      return request<Routine>(config, `/routines/${id}`);
    },

    create(input: CreateRoutineInput): Promise<Routine> {
      return request<Routine>(config, '/routines', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    update(id: string, input: UpdateRoutineInput): Promise<Routine> {
      return request<Routine>(config, `/routines/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
    },

    delete(id: string): Promise<void> {
      return request<void>(config, `/routines/${id}`, { method: 'DELETE' });
    },
  };
}
