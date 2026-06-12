import { cloneRoutineItem, createRoutine, createRoutineItem } from './routineFactory';
import type { Routine, RoutineItem, RoutineItemType } from './routineTypes';
import { calculateTotalDuration } from './routineTime';

export { calculateTotalDuration } from './routineTime';

const nowIso = () => new Date().toISOString();

export function renameRoutine(routine: Routine, name: string): Routine {
  return {
    ...routine,
    name,
    updatedAt: nowIso(),
  };
}

export function updateRoutineTargetDuration(routine: Routine, targetDurationSec: number | null): Routine {
  return {
    ...routine,
    targetDurationSec,
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
  const groupId = `group_${crypto.randomUUID()}`;
  return {
    ...routine,
    items: [...routine.items, { ...createRoutineItem(type), groupId }],
    updatedAt: nowIso(),
  };
}

type AddWorkoutSetInput = {
  title: string;
  workoutDurationSec: number;
  intervalDurationSec: number;
  setCount: number;
  includeLastInterval: boolean;
};

export function addWorkoutSet(routine: Routine, input: AddWorkoutSetInput): Routine {
  const setCount = normalizeCount(input.setCount);
  const workoutDurationSec = normalizeDuration(input.workoutDurationSec);
  const intervalDurationSec = normalizeDuration(input.intervalDurationSec);
  const title = input.title.trim() || 'ワークアウト';
  const groupId = `group_${crypto.randomUUID()}`;
  const items: RoutineItem[] = [];

  for (let index = 0; index < setCount; index += 1) {
    items.push({
      ...createRoutineItem('workout'),
      title: setCount === 1 ? title : `${title} ${index + 1}`,
      durationSec: workoutDurationSec,
      groupId,
    });

    if (input.includeLastInterval || index < setCount - 1) {
      items.push({
        ...createRoutineItem('interval'),
        title: '休憩',
        durationSec: intervalDurationSec,
        groupId,
      });
    }
  }

  return {
    ...routine,
    items: [...routine.items, ...items],
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

type AddPairedWorkoutSetInput = {
  title: string;
  workoutDurationSec: number;
  intervalDurationSec: number;
  setCount: number;
  includeLastInterval: boolean;
};

export function addPairedWorkoutSet(routine: Routine, input: AddPairedWorkoutSetInput): Routine {
  const setCount = normalizeCount(input.setCount);
  const workoutDurationSec = normalizeDuration(input.workoutDurationSec);
  const intervalDurationSec = normalizeDuration(input.intervalDurationSec);
  const title = input.title.trim() || 'ワークアウト';
  const groupId = `group_${crypto.randomUUID()}`;
  const items: RoutineItem[] = [];

  for (let index = 0; index < setCount; index += 1) {
    const setLabel = setCount === 1 ? '' : ` ${index + 1}`;
    items.push({
      ...createRoutineItem('workout'),
      title: `${title}（右）${setLabel}`.trimEnd(),
      durationSec: workoutDurationSec,
      groupId,
    });
    items.push({
      ...createRoutineItem('workout'),
      title: `${title}（左）${setLabel}`.trimEnd(),
      durationSec: workoutDurationSec,
      groupId,
    });

    if (input.includeLastInterval || index < setCount - 1) {
      items.push({
        ...createRoutineItem('interval'),
        title: '休憩',
        durationSec: intervalDurationSec,
        groupId,
      });
    }
  }

  return {
    ...routine,
    items: [...routine.items, ...items],
    updatedAt: nowIso(),
  };
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

function normalizeCount(count: number): number {
  return Math.max(1, Math.floor(count));
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

export function getBaseTitle(title: string): string {
  return title.replace(/\s+\d+$/, '').trim();
}

export function getExerciseGroupRange(
  items: RoutineItem[],
  workoutIndex: number,
): { start: number; end: number } {
  const groupId = items[workoutIndex]?.groupId;

  if (groupId) {
    let start = Infinity;
    let end = -1;
    for (let i = 0; i < items.length; i++) {
      if (items[i].groupId === groupId) {
        if (i < start) start = i;
        if (i > end) end = i;
      }
    }
    return { start: start === Infinity ? workoutIndex : start, end: end === -1 ? workoutIndex : end };
  }

  // フォールバック: groupId なし（旧データ）は名前ベースで検出
  const base = getBaseTitle(items[workoutIndex].title);

  let start = workoutIndex;
  while (
    start >= 2 &&
    items[start - 1]?.type === 'interval' &&
    items[start - 2]?.type === 'workout' &&
    getBaseTitle(items[start - 2].title) === base
  ) {
    start -= 2;
  }

  let end = workoutIndex;
  while (
    end + 2 < items.length &&
    items[end + 1]?.type === 'interval' &&
    items[end + 2]?.type === 'workout' &&
    getBaseTitle(items[end + 2].title) === base
  ) {
    end += 2;
  }

  if (end + 1 < items.length && items[end + 1]?.type === 'interval') {
    end += 1;
  }

  return { start, end };
}

export function moveGroup(
  routine: Routine,
  groupStart: number,
  groupEnd: number,
  insertBefore: number,
  trimTrailingInterval: boolean,
): Routine {
  const hasTrailingInterval = routine.items[groupEnd]?.type === 'interval';
  const shouldTrim = trimTrailingInterval && hasTrailingInterval;

  const items = [...routine.items];
  // groupStart..groupEnd を丸ごと取り出し（種目間休憩を含む）
  const extracted = items.splice(groupStart, groupEnd - groupStart + 1);
  // trim 時は末尾の interval を捨てる（ルーティン末尾が rest にならないよう）
  const group = shouldTrim ? extracted.slice(0, -1) : extracted;

  // splice で前方要素が消えた分だけ挿入位置を補正
  const rawInsert = insertBefore > groupStart
    ? insertBefore - (groupEnd - groupStart + 1)
    : insertBefore;
  const adjustedInsert = Math.min(rawInsert, items.length);

  items.splice(adjustedInsert, 0, ...group);

  return { ...routine, items, updatedAt: nowIso() };
}
