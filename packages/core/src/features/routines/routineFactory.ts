import type { Routine, RoutineItem, RoutineItemType } from './routineTypes';

function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const createId = (prefix: string) => `${prefix}_${randomUUID()}`;

export function createRoutine(name = '', now = new Date()): Routine {
  const timestamp = now.toISOString();
  return {
    id: createId('routine'),
    name,
    targetDurationSec: null,
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
