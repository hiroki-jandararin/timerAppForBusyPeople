import type { RoutineRepository } from './routineRepository';
import type { Routine } from './routineTypes';

export const STORAGE_KEY = 'workout_timer_routines';

type StorageShape = {
  routines: Routine[];
};

export class LocalStorageRoutineRepository implements RoutineRepository {
  constructor(private readonly storage: Storage = window.localStorage) {}

  async findAll(): Promise<Routine[]> {
    return this.read().routines;
  }

  async findById(id: string): Promise<Routine | null> {
    return this.read().routines.find((routine) => routine.id === id) ?? null;
  }

  async save(routine: Routine): Promise<void> {
    const data = this.read();
    const index = data.routines.findIndex((item) => item.id === routine.id);
    const routines = [...data.routines];
    if (index >= 0) {
      routines[index] = routine;
    } else {
      routines.push(routine);
    }
    this.write({ routines });
  }

  async delete(id: string): Promise<void> {
    const data = this.read();
    this.write({ routines: data.routines.filter((routine) => routine.id !== id) });
  }

  private read(): StorageShape {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return { routines: [] };
    try {
      const parsed = JSON.parse(raw) as Partial<StorageShape>;
      return { routines: Array.isArray(parsed.routines) ? parsed.routines : [] };
    } catch {
      return { routines: [] };
    }
  }

  private write(data: StorageShape): void {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}
