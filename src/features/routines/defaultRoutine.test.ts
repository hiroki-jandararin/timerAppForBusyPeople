import { describe, expect, it } from 'vitest';
import { calculateTotalDuration, validateRoutine } from './routineOperations';
import { createDefaultRoutine } from './defaultRoutine';

describe('createDefaultRoutine', () => {
  it('60分のデフォルトルーティンを作成できる', () => {
    const routine = createDefaultRoutine();

    expect(routine.name).toBe('全身トレーニング');
    expect(calculateTotalDuration(routine)).toBe(3600);
    expect(routine.items[0]).toMatchObject({
      type: 'workout',
      title: 'ウォームアップ',
      durationSec: 300,
    });
    expect(routine.items.at(-1)).toMatchObject({
      type: 'workout',
      title: '有酸素 軽く息が上がる程度',
      durationSec: 360,
    });
  });

  it('デフォルトルーティンはバリデーションを通る', () => {
    expect(validateRoutine(createDefaultRoutine())).toEqual([]);
  });
});
