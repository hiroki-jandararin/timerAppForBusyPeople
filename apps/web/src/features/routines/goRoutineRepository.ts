import type { Routine, RoutineRepository } from '@timeapp/core';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export class GoRoutineRepository implements RoutineRepository {
  constructor(private readonly getToken: () => Promise<string>) {}

  private async headers(): Promise<HeadersInit> {
    const token = await this.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async findAll(): Promise<Routine[]> {
    const res = await fetch(`${BASE_URL}/routines`, { headers: await this.headers() });
    if (!res.ok) throw new Error(`Failed to fetch routines: ${res.status}`);
    return res.json();
  }

  async findById(id: string): Promise<Routine | null> {
    const res = await fetch(`${BASE_URL}/routines/${id}`, { headers: await this.headers() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch routine: ${res.status}`);
    return res.json();
  }

  async create(routine: Routine): Promise<Routine> {
    const res = await fetch(`${BASE_URL}/routines`, {
      method: 'POST',
      headers: await this.headers(),
      body: JSON.stringify(routine),
    });
    if (!res.ok) throw new Error(`Failed to create routine: ${res.status}`);
    return res.json();
  }

  async update(routine: Routine): Promise<void> {
    const res = await fetch(`${BASE_URL}/routines/${routine.id}`, {
      method: 'PUT',
      headers: await this.headers(),
      body: JSON.stringify(routine),
    });
    if (!res.ok) throw new Error(`Failed to update routine: ${res.status}`);
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/routines/${id}`, {
      method: 'DELETE',
      headers: await this.headers(),
    });
    if (!res.ok) throw new Error(`Failed to delete routine: ${res.status}`);
  }
}
