import type { WorkoutHistory, CreateWorkoutHistoryInput } from '@timeapp/core';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export class GoWorkoutHistoryRepository {
  constructor(private readonly getToken: () => Promise<string>) {}

  private async headers(): Promise<HeadersInit> {
    const token = await this.getToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  async create(input: CreateWorkoutHistoryInput): Promise<WorkoutHistory> {
    const res = await fetch(`${BASE_URL}/workout-histories`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`Failed to save workout history: ${res.status}`);
    return res.json();
  }

  async findAll(): Promise<WorkoutHistory[]> {
    const res = await fetch(`${BASE_URL}/workout-histories`, {
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error(`Failed to fetch workout histories: ${res.status}`);
    return res.json();
  }
}
