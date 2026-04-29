import type { Routine, RoutineItem, RoutineItemType } from './routineTypes';

const createId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

type DefaultItemInput = {
  type: RoutineItemType;
  title: string;
  durationSec: number;
};

const DEFAULT_ITEMS: DefaultItemInput[] = [
  { type: 'workout', title: 'ウォームアップ', durationSec: 300 },
  { type: 'workout', title: '下半身 軽め1セット', durationSec: 60 },
  { type: 'interval', title: '下半身 休憩', durationSec: 90 },
  { type: 'workout', title: '下半身 本番①', durationSec: 90 },
  { type: 'interval', title: '下半身 休憩', durationSec: 90 },
  { type: 'workout', title: '下半身 本番②', durationSec: 90 },
  { type: 'interval', title: '下半身 休憩', durationSec: 90 },
  { type: 'workout', title: '下半身 本番③', durationSec: 90 },
  { type: 'interval', title: '胸へ移動', durationSec: 120 },
  { type: 'workout', title: '胸 本番①', durationSec: 90 },
  { type: 'interval', title: '胸 休憩', durationSec: 90 },
  { type: 'workout', title: '胸 本番②', durationSec: 90 },
  { type: 'interval', title: '胸 休憩', durationSec: 90 },
  { type: 'workout', title: '胸 本番③', durationSec: 90 },
  { type: 'interval', title: '背中へ移動', durationSec: 150 },
  { type: 'workout', title: '背中 本番①', durationSec: 90 },
  { type: 'interval', title: '背中 休憩', durationSec: 90 },
  { type: 'workout', title: '背中 本番②', durationSec: 90 },
  { type: 'interval', title: '背中 休憩', durationSec: 90 },
  { type: 'workout', title: '背中 本番③', durationSec: 90 },
  { type: 'interval', title: '肩へ移動', durationSec: 150 },
  { type: 'workout', title: '肩 本番①', durationSec: 90 },
  { type: 'interval', title: '肩 休憩', durationSec: 90 },
  { type: 'workout', title: '肩 本番②', durationSec: 90 },
  { type: 'interval', title: '腕へ移動', durationSec: 150 },
  { type: 'workout', title: '腕 三頭筋 本番①', durationSec: 60 },
  { type: 'interval', title: '腕 三頭筋 休憩', durationSec: 60 },
  { type: 'workout', title: '腕 三頭筋 本番②', durationSec: 60 },
  { type: 'interval', title: '腹筋へ移動', durationSec: 120 },
  { type: 'workout', title: '腹筋 ①', durationSec: 60 },
  { type: 'interval', title: '腹筋 休憩', durationSec: 60 },
  { type: 'workout', title: '腹筋 ②', durationSec: 60 },
  { type: 'interval', title: '有酸素へ移動', durationSec: 120 },
  { type: 'workout', title: '有酸素 軽く息が上がる程度', durationSec: 360 },
];

export function createDefaultRoutine(now = new Date()): Routine {
  const timestamp = now.toISOString();
  return {
    id: createId('routine'),
    name: '全身トレーニング',
    items: DEFAULT_ITEMS.map(createDefaultItem),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function createDefaultItem(item: DefaultItemInput): RoutineItem {
  return {
    id: createId('item'),
    type: item.type,
    title: item.title,
    durationSec: item.durationSec,
    voiceText: '',
  };
}
