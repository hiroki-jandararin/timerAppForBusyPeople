import { describe, expect, it } from 'vitest';
import { getBaseTitle, getExerciseGroupRange, moveGroup, addWorkoutSet, addItem, addPairedWorkoutSet } from './routineOperations';
import { createRoutine } from './routineFactory';
import type { Routine } from './routineTypes';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeRoutine(items: Array<{ type: 'workout' | 'interval'; title: string; durationSec?: number; groupId?: string }>): Routine {
  const routine = createRoutine('Test');
  return {
    ...routine,
    items: items.map((item, i) => ({
      id: `item-${i}`,
      type: item.type,
      title: item.title,
      durationSec: item.durationSec ?? 30,
      voiceText: '',
      ...(item.groupId !== undefined ? { groupId: item.groupId } : {}),
    })),
  };
}

// ─── getBaseTitle ─────────────────────────────────────────────────────────────

describe('getBaseTitle', () => {
  it('番号なしのタイトルはそのまま返す', () => {
    expect(getBaseTitle('スクワット')).toBe('スクワット');
  });

  it('末尾の半角スペース+数字を除去する', () => {
    expect(getBaseTitle('スクワット 1')).toBe('スクワット');
    expect(getBaseTitle('スクワット 12')).toBe('スクワット');
  });

  it('ベンチプレスでも動作する', () => {
    expect(getBaseTitle('ベンチプレス 3')).toBe('ベンチプレス');
  });

  it('末尾以外の数字は除去しない', () => {
    expect(getBaseTitle('3RM スクワット')).toBe('3RM スクワット');
  });

  it('末尾の（右）（左）を除去する', () => {
    expect(getBaseTitle('ダンベルカール（右）')).toBe('ダンベルカール');
    expect(getBaseTitle('ダンベルカール（左）')).toBe('ダンベルカール');
  });

  it('末尾の（右）（左）＋セット番号を除去する', () => {
    expect(getBaseTitle('ダンベルカール（右） 1')).toBe('ダンベルカール');
    expect(getBaseTitle('ダンベルカール（左） 2')).toBe('ダンベルカール');
  });

  it('末尾の N回 を除去する', () => {
    expect(getBaseTitle('スクワット 10回')).toBe('スクワット');
    expect(getBaseTitle('ダンベルカール（右） 10回')).toBe('ダンベルカール');
  });
});

// ─── getExerciseGroupRange ─────────────────────────────────────────────────────

describe('getExerciseGroupRange', () => {
  it('単体ワークアウトのみ（休憩なし）', () => {
    const routine = makeRoutine([
      { type: 'workout', title: 'スクワット' },
    ]);
    expect(getExerciseGroupRange(routine.items, 0)).toEqual({ start: 0, end: 0 });
  });

  it('単体ワークアウト＋直後の休憩（種目間）', () => {
    const routine = makeRoutine([
      { type: 'workout', title: 'スクワット' },
      { type: 'interval', title: '休憩' },
      { type: 'workout', title: 'ベンチプレス' },
    ]);
    expect(getExerciseGroupRange(routine.items, 0)).toEqual({ start: 0, end: 1 });
  });

  it('3セット構成（セット間休憩＋末尾種目間休憩）', () => {
    const routine = makeRoutine([
      { type: 'workout', title: 'スクワット 1' },
      { type: 'interval', title: '休憩' },
      { type: 'workout', title: 'スクワット 2' },
      { type: 'interval', title: '休憩' },
      { type: 'workout', title: 'スクワット 3' },
      { type: 'interval', title: '休憩' },   // 種目間
      { type: 'workout', title: 'ベンチプレス 1' },
    ]);
    expect(getExerciseGroupRange(routine.items, 0)).toEqual({ start: 0, end: 5 });
    expect(getExerciseGroupRange(routine.items, 2)).toEqual({ start: 0, end: 5 });
    expect(getExerciseGroupRange(routine.items, 4)).toEqual({ start: 0, end: 5 });
  });

  it('3セット構成（末尾の種目間休憩なし）', () => {
    const routine = makeRoutine([
      { type: 'workout', title: 'スクワット 1' },
      { type: 'interval', title: '休憩' },
      { type: 'workout', title: 'スクワット 2' },
      { type: 'interval', title: '休憩' },
      { type: 'workout', title: 'スクワット 3' },
      { type: 'workout', title: 'ベンチプレス 1' },
    ]);
    expect(getExerciseGroupRange(routine.items, 0)).toEqual({ start: 0, end: 4 });
    expect(getExerciseGroupRange(routine.items, 4)).toEqual({ start: 0, end: 4 });
  });

  it('最後のグループ（後続なし）', () => {
    const routine = makeRoutine([
      { type: 'workout', title: 'スクワット 1' },
      { type: 'interval', title: '休憩' },
      { type: 'workout', title: 'スクワット 2' },
    ]);
    expect(getExerciseGroupRange(routine.items, 0)).toEqual({ start: 0, end: 2 });
  });

  it('グループ中間のインデックスでも同じ範囲を返す', () => {
    const routine = makeRoutine([
      { type: 'workout', title: 'スクワット 1' },
      { type: 'interval', title: '休憩' },
      { type: 'workout', title: 'スクワット 2' },
      { type: 'interval', title: '休憩' },
      { type: 'workout', title: 'スクワット 3' },
    ]);
    const fromFirst = getExerciseGroupRange(routine.items, 0);
    const fromSecond = getExerciseGroupRange(routine.items, 2);
    const fromThird = getExerciseGroupRange(routine.items, 4);
    expect(fromFirst).toEqual(fromSecond);
    expect(fromSecond).toEqual(fromThird);
  });

  it('W-W-I パターン（旧データ、groupId なし）：ペア種目が1グループになる', () => {
    // AI生成の旧データ想定: groupId なし、（右）/（左）が連続
    const routine = makeRoutine([
      { type: 'workout', title: 'ダンベルカール（右） 10回' },
      { type: 'workout', title: 'ダンベルカール（左） 10回' },
      { type: 'interval', title: '休憩' },
      { type: 'workout', title: 'ダンベルカール（右） 10回' },
      { type: 'workout', title: 'ダンベルカール（左） 10回' },
      { type: 'interval', title: '休憩' },  // 種目間
      { type: 'workout', title: 'ベンチプレス 10回' },
    ]);
    // （右）から取得
    expect(getExerciseGroupRange(routine.items, 0)).toEqual({ start: 0, end: 5 });
    // （左）から取得しても同じ範囲
    expect(getExerciseGroupRange(routine.items, 1)).toEqual({ start: 0, end: 5 });
    // 2セット目の（右）からも同じ
    expect(getExerciseGroupRange(routine.items, 3)).toEqual({ start: 0, end: 5 });
  });

  it('W-W-I パターン（末尾の種目間休憩なし）でも正しい範囲を返す', () => {
    const routine = makeRoutine([
      { type: 'workout', title: 'ダンベルカール（右） 10回' },
      { type: 'workout', title: 'ダンベルカール（左） 10回' },
      { type: 'interval', title: '休憩' },
      { type: 'workout', title: 'ダンベルカール（右） 10回' },
      { type: 'workout', title: 'ダンベルカール（左） 10回' },
    ]);
    expect(getExerciseGroupRange(routine.items, 0)).toEqual({ start: 0, end: 4 });
    expect(getExerciseGroupRange(routine.items, 4)).toEqual({ start: 0, end: 4 });
  });
});

// ─── moveGroup ────────────────────────────────────────────────────────────────

describe('moveGroup', () => {
  it('後回し：グループを末尾へ移動（trimTrailingInterval=true）', () => {
    const routine = makeRoutine([
      { type: 'workout', title: 'スクワット 1' },
      { type: 'interval', title: '休憩' },
      { type: 'workout', title: 'スクワット 2' },
      { type: 'interval', title: '休憩(種目間)' },
      { type: 'workout', title: 'ベンチプレス 1' },
    ]);
    // スクワットグループ(0..3)を末尾(5)へ、trimTrailingInterval=true
    const result = moveGroup(routine, 0, 3, 5, true);
    const titles = result.items.map((i) => i.title);
    expect(titles).toEqual([
      'ベンチプレス 1',
      'スクワット 1',
      '休憩',
      'スクワット 2',
      // '休憩(種目間)' は末尾になるので除外
    ]);
  });

  it('後回し：末尾の休憩がないグループはそのまま移動', () => {
    const routine = makeRoutine([
      { type: 'workout', title: 'スクワット 1' },
      { type: 'interval', title: '休憩' },
      { type: 'workout', title: 'スクワット 2' },
      { type: 'workout', title: 'ベンチプレス 1' },
    ]);
    // スクワットグループ(0..2)を末尾(4)へ、trimTrailingInterval=true（末尾は workout なので除外なし）
    const result = moveGroup(routine, 0, 2, 4, true);
    const titles = result.items.map((i) => i.title);
    expect(titles).toEqual([
      'ベンチプレス 1',
      'スクワット 1',
      '休憩',
      'スクワット 2',
    ]);
  });

  it('次にやる：グループを途中に挿入（trimTrailingInterval=false）', () => {
    const routine = makeRoutine([
      { type: 'workout', title: 'スクワット 1' },
      { type: 'interval', title: '休憩(種目間)' },
      { type: 'workout', title: 'ベンチプレス 1' },
      { type: 'interval', title: '休憩(種目間)' },
      { type: 'workout', title: '懸垂 1' },
    ]);
    // 懸垂グループ(4..4)をスクワット直後(2)に挿入
    const result = moveGroup(routine, 4, 4, 2, false);
    const titles = result.items.map((i) => i.title);
    expect(titles).toEqual([
      'スクワット 1',
      '休憩(種目間)',
      '懸垂 1',
      'ベンチプレス 1',
      '休憩(種目間)',
    ]);
  });

  it('移動後もアイテム総数が保たれる（trim時は -1）', () => {
    const routine = makeRoutine([
      { type: 'workout', title: 'A 1' },
      { type: 'interval', title: '休憩' },
      { type: 'workout', title: 'A 2' },
      { type: 'interval', title: '種目間' },
      { type: 'workout', title: 'B' },
    ]);
    const result = moveGroup(routine, 0, 3, 5, true);
    expect(result.items).toHaveLength(routine.items.length - 1); // trim で1件減る
  });
});

// ─── groupId ────────────────────────────────────────────────────────────────

describe('groupId', () => {
  it('addWorkoutSetで追加したアイテムは全て同じgroupIdを持つ', () => {
    const routine = addWorkoutSet(createRoutine(''), {
      title: 'スクワット',
      setCount: 3,
      workoutDurationSec: 30,
      intervalDurationSec: 20,
      includeLastInterval: true,
    });
    const groupIds = routine.items.map((item) => item.groupId);
    expect(groupIds.every((id) => id !== undefined && id !== '')).toBe(true);
    expect(new Set(groupIds).size).toBe(1);
  });

  it('2回のaddWorkoutSetでは異なるgroupIdが付与される', () => {
    let routine = addWorkoutSet(createRoutine(''), {
      title: 'スクワット',
      setCount: 2,
      workoutDurationSec: 30,
      intervalDurationSec: 20,
      includeLastInterval: true,
    });
    routine = addWorkoutSet(routine, {
      title: 'ベンチプレス',
      setCount: 2,
      workoutDurationSec: 30,
      intervalDurationSec: 20,
      includeLastInterval: false,
    });
    const squatGroupId = routine.items[0].groupId;
    const benchGroupId = routine.items[routine.items.length - 1].groupId;
    expect(squatGroupId).toBeDefined();
    expect(benchGroupId).toBeDefined();
    expect(squatGroupId).not.toBe(benchGroupId);
  });

  it('addItemで追加した各アイテムは固有のgroupIdを持つ', () => {
    let routine = addItem(createRoutine(''), 'workout');
    routine = addItem(routine, 'workout');
    const [item1, item2] = routine.items;
    expect(item1.groupId).toBeDefined();
    expect(item2.groupId).toBeDefined();
    expect(item1.groupId).not.toBe(item2.groupId);
  });
});

// ─── addPairedWorkoutSet ──────────────────────────────────────────────────────

describe('addPairedWorkoutSet', () => {
  it('追加したアイテムはすべて同じgroupIdを持つ', () => {
    const routine = addPairedWorkoutSet(createRoutine(''), {
      title: 'ダンベルカール',
      setCount: 3,
      workoutDurationSec: 60,
      intervalDurationSec: 30,
      includeLastInterval: true,
    });
    const groupIds = routine.items.map((item) => item.groupId);
    expect(groupIds.every((id) => id !== undefined && id !== '')).toBe(true);
    expect(new Set(groupIds).size).toBe(1);
  });

  it('各セットが W(右)-W(左)-I のパターンで追加される', () => {
    const routine = addPairedWorkoutSet(createRoutine(''), {
      title: 'ダンベルカール',
      setCount: 2,
      workoutDurationSec: 60,
      intervalDurationSec: 30,
      includeLastInterval: false,
    });
    const types = routine.items.map((item) => item.type);
    const titles = routine.items.map((item) => item.title);
    // 2セット、末尾休憩なし: W(右1), W(左1), I, W(右2), W(左2)
    expect(types).toEqual(['workout', 'workout', 'interval', 'workout', 'workout']);
    expect(titles[0]).toContain('（右）');
    expect(titles[1]).toContain('（左）');
    expect(titles[3]).toContain('（右）');
    expect(titles[4]).toContain('（左）');
  });
});

// ─── getExerciseGroupRange (groupId対応) ────────────────────────────────────

describe('getExerciseGroupRange (groupId対応)', () => {
  it('groupIdが設定されている場合はgroupIdでグループ範囲を特定する', () => {
    const gid = 'group-1';
    const routine = makeRoutine([
      { type: 'workout', title: 'ダンベルカール（右）', groupId: gid },
      { type: 'workout', title: 'ダンベルカール（左）', groupId: gid },
      { type: 'interval', title: '休憩', groupId: gid },
      { type: 'workout', title: 'ダンベルカール（右）', groupId: gid },
      { type: 'workout', title: 'ダンベルカール（左）', groupId: gid },
      { type: 'interval', title: '休憩', groupId: gid },
    ]);
    expect(getExerciseGroupRange(routine.items, 0)).toEqual({ start: 0, end: 5 });
    expect(getExerciseGroupRange(routine.items, 1)).toEqual({ start: 0, end: 5 });
    expect(getExerciseGroupRange(routine.items, 3)).toEqual({ start: 0, end: 5 });
  });

  it('異なるgroupIdのアイテムはグループに含まれない', () => {
    const routine = makeRoutine([
      { type: 'workout', title: 'スクワット', groupId: 'g1' },
      { type: 'interval', title: '休憩', groupId: 'g1' },
      { type: 'workout', title: 'ベンチプレス', groupId: 'g2' },
    ]);
    expect(getExerciseGroupRange(routine.items, 0)).toEqual({ start: 0, end: 1 });
    expect(getExerciseGroupRange(routine.items, 2)).toEqual({ start: 2, end: 2 });
  });

  it('groupIdがないアイテムは既存の名前ベースのフォールバックを使う', () => {
    const routine = makeRoutine([
      { type: 'workout', title: 'スクワット 1' },
      { type: 'interval', title: '休憩' },
      { type: 'workout', title: 'スクワット 2' },
      { type: 'interval', title: '休憩' },
      { type: 'workout', title: 'スクワット 3' },
      { type: 'interval', title: '休憩' },
    ]);
    expect(getExerciseGroupRange(routine.items, 0)).toEqual({ start: 0, end: 5 });
  });
});
