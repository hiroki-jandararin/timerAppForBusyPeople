import { createRoutine } from './routineFactory';
import type { Routine, RoutineItem, RoutineItemType } from './routineTypes';

export type RoutineTemplate = {
  id: string;
  name: string;
  description?: string;
  items: Array<{
    type: RoutineItemType;
    title: string;
    durationSec: number;
    voiceText?: string;
  }>;
};

function sets(
  title: string,
  workSec: number,
  restSec: number,
  count: number,
  transitionSec = 0
): RoutineTemplate['items'] {
  const items: RoutineTemplate['items'] = [];
  for (let i = 0; i < count; i++) {
    items.push({ type: 'workout', title, durationSec: workSec });
    const isLast = i === count - 1;
    const duration = isLast ? transitionSec : restSec;
    if (duration > 0) {
      items.push({ type: 'interval', title: '休憩', durationSec: duration });
    }
  }
  return items;
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'chest',
    name: '胸トレ',
    description: 'ベンチプレス・インクライン・フライの3種目。約21分。',
    items: [
      ...sets('ベンチプレス', 60, 90, 3, 120),
      ...sets('インクラインダンベルプレス', 60, 90, 3, 120),
      ...sets('ペックデック', 45, 90, 3, 0),
    ],
  },
  {
    id: 'back',
    name: '背中トレ',
    description: 'ラットプルダウン・ロウイングの3種目。約21分。',
    items: [
      ...sets('ラットプルダウン', 60, 90, 3, 120),
      ...sets('ダンベルロウ', 60, 90, 3, 120),
      ...sets('シーテッドローイング', 45, 90, 3, 0),
    ],
  },
  {
    id: 'legs',
    name: '脚トレ',
    description: 'スクワット中心の3種目。長めの休憩で約26分。',
    items: [
      ...sets('スクワット', 60, 120, 4, 150),
      ...sets('レッグプレス', 60, 90, 3, 120),
      ...sets('レッグカール', 45, 90, 3, 0),
    ],
  },
  {
    id: 'shoulder-arms',
    name: '肩・腕トレ',
    description: 'ショルダープレス・カール3種目。約18分。',
    items: [
      ...sets('ショルダープレス', 60, 90, 3, 120),
      ...sets('サイドレイズ', 45, 60, 3, 90),
      ...sets('バーベルカール', 45, 60, 3, 0),
    ],
  },
  {
    id: 'circuit',
    name: '全身サーキット',
    description: '短インターバルで4種目を3ラウンド。約16分。',
    items: [
      ...Array.from({ length: 3 }, (_, round) => [
        { type: 'workout' as const, title: 'スクワット', durationSec: 45 },
        { type: 'interval' as const, title: '休憩', durationSec: 30 },
        { type: 'workout' as const, title: '腕立て伏せ', durationSec: 45 },
        { type: 'interval' as const, title: '休憩', durationSec: 30 },
        { type: 'workout' as const, title: 'ダンベルロウ', durationSec: 45 },
        { type: 'interval' as const, title: '休憩', durationSec: 30 },
        { type: 'workout' as const, title: 'バーピー', durationSec: 30 },
        ...(round < 2
          ? [{ type: 'interval' as const, title: 'ラウンド間休憩', durationSec: 60 }]
          : []),
      ]).flat(),
    ],
  },
];

export function createRoutineFromTemplate(template: RoutineTemplate, now = new Date()): Routine {
  const routine = createRoutine(template.name, now);
  return {
    ...routine,
    items: template.items.map((item) => createTemplateItem(item)),
  };
}

function createTemplateItem(templateItem: RoutineTemplate['items'][number]): RoutineItem {
  return {
    id: `item_${crypto.randomUUID()}`,
    type: templateItem.type,
    title: templateItem.title,
    durationSec: templateItem.durationSec,
    voiceText: templateItem.voiceText ?? '',
  };
}
