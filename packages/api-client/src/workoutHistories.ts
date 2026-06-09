import type { WorkoutHistory, CreateWorkoutHistoryInput } from '@timeapp/core';
import type { ApiClientConfig } from './types';
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

  return res.json() as Promise<T>;
}

export function workoutHistoryApiClient(config: ApiClientConfig) {
  return {
    create(input: CreateWorkoutHistoryInput): Promise<WorkoutHistory> {
      return request<WorkoutHistory>(config, '/workout-histories', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    getAll(): Promise<WorkoutHistory[]> {
      return request<WorkoutHistory[]>(config, '/workout-histories');
    },
  };
}
