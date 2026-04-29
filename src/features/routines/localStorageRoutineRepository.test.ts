import { beforeEach, describe, expect, it } from 'vitest';
import { createRoutine } from './routineFactory';
import { LocalStorageRoutineRepository, STORAGE_KEY } from './localStorageRoutineRepository';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear(): void {
    this.values.clear();
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('LocalStorageRoutineRepository', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('初期状態で空配列を返す', async () => {
    const repository = new LocalStorageRoutineRepository(storage);

    await expect(repository.findAll()).resolves.toEqual([]);
  });

  it('routineを保存でき、findAllとfindByIdで取得できる', async () => {
    const repository = new LocalStorageRoutineRepository(storage);
    const routine = createRoutine('全身トレA');

    await repository.save(routine);

    await expect(repository.findAll()).resolves.toEqual([routine]);
    await expect(repository.findById(routine.id)).resolves.toEqual(routine);
  });

  it('存在しないidではnullを返す', async () => {
    const repository = new LocalStorageRoutineRepository(storage);

    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('routineを削除できる', async () => {
    const repository = new LocalStorageRoutineRepository(storage);
    const routine = createRoutine('全身トレA');
    await repository.save(routine);

    await repository.delete(routine.id);

    await expect(repository.findAll()).resolves.toEqual([]);
  });

  it('壊れたJSONが保存されている場合でもクラッシュしない', async () => {
    storage.setItem(STORAGE_KEY, '{broken');
    const repository = new LocalStorageRoutineRepository(storage);

    await expect(repository.findAll()).resolves.toEqual([]);
  });
});
