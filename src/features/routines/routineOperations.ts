import { cloneRoutineItem, createRoutine, createRoutineItem } from './routineFactory';
import type { Routine, RoutineItem, RoutineItemType } from './routineTypes';

const nowIso = () => new Date().toISOString();

export function renameRoutine(routine: Routine, name: string): Routine {
  return {
    ...routine,
    name,
    updatedAt: nowIso(),
  };
}

export function duplicateRoutine(routine: Routine): Routine {
  const timestamp = nowIso();
  return {
    ...routine,
    id: createRoutine(`${routine.name} コピー`).id,
    name: `${routine.name} コピー`,
    items: routine.items.map(cloneRoutineItem),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function addItem(routine: Routine, type: RoutineItemType): Routine {
  return {
    ...routine,
    items: [...routine.items, createRoutineItem(type)],
    updatedAt: nowIso(),
  };
}

export function updateItem(routine: Routine, itemId: string, patch: Partial<Omit<RoutineItem, 'id' | 'type'>>): Routine {
  return {
    ...routine,
    items: routine.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            ...patch,
            durationSec:
              patch.durationSec === undefined ? item.durationSec : normalizeDuration(patch.durationSec),
          }
        : item,
    ),
    updatedAt: nowIso(),
  };
}

export function deleteItem(routine: Routine, itemId: string): Routine {
  return {
    ...routine,
    items: routine.items.filter((item) => item.id !== itemId),
    updatedAt: nowIso(),
  };
}

export function duplicateItem(routine: Routine, itemId: string): Routine {
  const index = routine.items.findIndex((item) => item.id === itemId);
  if (index < 0) return routine;
  const items = [...routine.items];
  items.splice(index + 1, 0, cloneRoutineItem(routine.items[index]));
  return {
    ...routine,
    items,
    updatedAt: nowIso(),
  };
}

export function moveItemUp(routine: Routine, itemId: string): Routine {
  const index = routine.items.findIndex((item) => item.id === itemId);
  if (index <= 0) return routine;
  return moveItem(routine, index, index - 1);
}

export function moveItemDown(routine: Routine, itemId: string): Routine {
  const index = routine.items.findIndex((item) => item.id === itemId);
  if (index < 0 || index >= routine.items.length - 1) return routine;
  return moveItem(routine, index, index + 1);
}

export function calculateTotalDuration(routine: Pick<Routine, 'items'>): number {
  return routine.items.reduce((total, item) => total + item.durationSec, 0);
}

export function validateRoutine(routine: Routine, existingRoutines: Routine[] = []): string[] {
  const errors: string[] = [];
  const normalizedName = routine.name.trim();
  if (!normalizedName) errors.push('ルーティン名を入力してください');
  if (
    normalizedName &&
    existingRoutines.some((item) => item.id !== routine.id && item.name.trim() === normalizedName)
  ) {
    errors.push('同じ名前のルーティンは追加できません');
  }
  if (routine.items.length < 1) errors.push('カードを1つ以上追加してください');
  routine.items.forEach((item, index) => {
    if (item.type !== 'workout' && item.type !== 'interval') errors.push(`${index + 1}番目のカード種別が不正です`);
    if (!item.title.trim()) errors.push(`${index + 1}番目のカード名を入力してください`);
    if (!Number.isInteger(item.durationSec) || item.durationSec <= 0) {
      errors.push(`${index + 1}番目の秒数は正の整数にしてください`);
    }
  });
  return errors;
}

function normalizeDuration(durationSec: number): number {
  return Math.max(1, Math.floor(durationSec));
}

function moveItem(routine: Routine, from: number, to: number): Routine {
  const items = [...routine.items];
  const [item] = items.splice(from, 1);
  items.splice(to, 0, item);
  return {
    ...routine,
    items,
    updatedAt: nowIso(),
  };
}
