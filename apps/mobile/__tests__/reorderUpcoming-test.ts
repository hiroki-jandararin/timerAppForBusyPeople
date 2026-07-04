import { reorderUpcoming } from '../features/timer/reorderUpcoming';
import type { ExerciseGroup } from '@timeapp/core';

const makeItem = (title: string, type: 'workout' | 'interval' = 'workout') =>
  ({ id: title, type, title, durationSec: 30, voiceText: '' } as const);

const baseRoutine = {
  id: 'r1', name: 'テスト',
  items: [
    makeItem('スクワット'),     // 0 - current
    makeItem('rest1', 'interval'), // 1
    makeItem('腕立て'),          // 2 - upcoming A
    makeItem('rest2', 'interval'), // 3
    makeItem('バーピー'),         // 4 - upcoming B
    makeItem('rest3', 'interval'), // 5
  ],
  createdAt: '', updatedAt: '',
};

const groupA: ExerciseGroup = {
  baseTitle: '腕立て', setCount: 1, totalSec: 60, roundWorkoutSecs: [30],
  restSec: 30, completedSets: 0, status: 'upcoming', itemStart: 2, itemEnd: 3,
};
const groupB: ExerciseGroup = {
  baseTitle: 'バーピー', setCount: 1, totalSec: 60, roundWorkoutSecs: [30],
  restSec: 30, completedSets: 0, status: 'upcoming', itemStart: 4, itemEnd: 5,
};

describe('reorderUpcoming', () => {
  it('currentGroupEnd より前のアイテムは変わらない', () => {
    const result = reorderUpcoming(baseRoutine, 1, [groupA, groupB]);
    expect(result.items[0].title).toBe('スクワット');
    expect(result.items[1].title).toBe('rest1');
  });

  it('グループ順を入れ替えると upcoming のアイテムが入れ替わる', () => {
    const result = reorderUpcoming(baseRoutine, 1, [groupB, groupA]);
    expect(result.items[2].title).toBe('バーピー');
    expect(result.items[3].title).toBe('rest3');
    expect(result.items[4].title).toBe('腕立て');
    expect(result.items[5].title).toBe('rest2');
  });

  it('グループ順が同じなら items は変わらない', () => {
    const result = reorderUpcoming(baseRoutine, 1, [groupA, groupB]);
    expect(result.items.map(i => i.title)).toEqual(baseRoutine.items.map(i => i.title));
  });

  it('upcoming が1グループのみでもエラーにならない', () => {
    const result = reorderUpcoming(baseRoutine, 1, [groupA]);
    expect(result.items.slice(0, 2).map(i => i.title)).toEqual(['スクワット', 'rest1']);
    expect(result.items[2].title).toBe('腕立て');
  });
});
