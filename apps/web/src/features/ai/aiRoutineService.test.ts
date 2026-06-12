import { describe, expect, it } from 'vitest';
import { assignGroupIds } from './aiRoutineService';

describe('assignGroupIds', () => {
  it('ペア種目（右/左）は同じgroupIdを持つ', () => {
    const items = [
      { title: 'ダンベルカール（右） 10回', type: 'workout' as const },
      { title: 'ダンベルカール（左） 10回', type: 'workout' as const },
      { title: '休憩', type: 'interval' as const },
      { title: 'ダンベルカール（右） 10回', type: 'workout' as const },
      { title: 'ダンベルカール（左） 10回', type: 'workout' as const },
    ];
    const ids = assignGroupIds(items);
    expect(new Set(ids).size).toBe(1);
  });

  it('異なる種目は異なるgroupIdを持つ', () => {
    const items = [
      { title: 'スクワット 10回', type: 'workout' as const },
      { title: '休憩', type: 'interval' as const },
      { title: 'ベンチプレス 10回', type: 'workout' as const },
    ];
    const ids = assignGroupIds(items);
    expect(ids[0]).toBe(ids[1]); // スクワットとその休憩は同じグループ
    expect(ids[0]).not.toBe(ids[2]); // ベンチプレスは別グループ
  });

  it('同じ種目の複数セットは同じgroupIdを持つ', () => {
    const items = [
      { title: 'スクワット 10回', type: 'workout' as const },
      { title: '休憩', type: 'interval' as const },
      { title: 'スクワット 10回', type: 'workout' as const },
      { title: '休憩', type: 'interval' as const },
      { title: 'スクワット 10回', type: 'workout' as const },
    ];
    const ids = assignGroupIds(items);
    expect(new Set(ids).size).toBe(1);
  });
});
