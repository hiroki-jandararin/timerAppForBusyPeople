import type { Routine, RoutineRepository } from '@timeapp/core';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export class GoRoutineRepository implements RoutineRepository {
  constructor(private readonly userId: string) {}

  private get headers(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-User-ID': this.userId,
    };
  }

  async findAll(): Promise<Routine[]> {
    const res = await fetch(`${BASE_URL}/routines`, { headers: this.headers });
    if (!res.ok) throw new Error(`Failed to fetch routines: ${res.status}`);
    return res.json();
  }

  async findById(id: string): Promise<Routine | null> {
    const res = await fetch(`${BASE_URL}/routines/${id}`, { headers: this.headers });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch routine: ${res.status}`);
    return res.json();
  }

  async save(routine: Routine): Promise<void> {
    // PUT が upsert（新規・既存どちらでも対応）
    const res = await fetch(`${BASE_URL}/routines/${routine.id}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(routine),
    });
    if (!res.ok) throw new Error(`Failed to save routine: ${res.status}`);
  }

  async delete(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/routines/${id}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    if (!res.ok) throw new Error(`Failed to delete routine: ${res.status}`);
  }
}
