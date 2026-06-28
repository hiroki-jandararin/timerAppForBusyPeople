import type { Routine } from './routineTypes';

export type RoutineRepository = {
  findAll: () => Promise<Routine[]>;
  findById: (id: string) => Promise<Routine | null>;
  create: (routine: Routine) => Promise<Routine>;
  update: (routine: Routine) => Promise<void>;
  delete: (id: string) => Promise<void>;
};
