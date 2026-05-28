import type { RoutineItem } from '@timeapp/core';

export type ApiClientConfig = {
  baseUrl: string;
  getToken: () => string | null;
};

export type CreateRoutineInput = {
  name: string;
  targetDurationSec?: number | null;
  items: RoutineItem[];
};

export type UpdateRoutineInput = CreateRoutineInput;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
