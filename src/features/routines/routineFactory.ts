import type { Routine, RoutineItem, RoutineItemType } from './routineTypes';

const createId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

export function createRoutine(name = '新しいルーティン', now = new Date()): Routine {
  const timestamp = now.toISOString();
  return {
    id: createId('routine'),
    name,
    items: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createRoutineItem(type: RoutineItemType): RoutineItem {
  const isWorkout = type === 'workout';
  const title = isWorkout ? '腕立て伏せ' : '休憩';
  const durationSec = isWorkout ? 30 : 60;
  return {
    id: createId('item'),
    type,
    title,
    durationSec,
    voiceText: '',
  };
}

export function cloneRoutineItem(item: RoutineItem): RoutineItem {
  return {
    ...item,
    id: createId('item'),
  };
}
