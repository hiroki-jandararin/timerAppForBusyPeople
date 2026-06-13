import { describe, expect, it } from 'vitest';
import type { WorkoutHistory } from '@timeapp/core';
import { calcCurrentStreak } from './HistoryPage';

function makeHistory(dateStr: string): WorkoutHistory {
  return {
    id: dateStr,
    userId: 'user1',
    routineId: 'r1',
    routineName: 'test',
    startedAt: `${dateStr}T10:00:00`,
    finishedAt: `${dateStr}T10:30:00`,
    completed: true,
    itemsCompleted: 3,
    itemsCount: 3,
    createdAt: `${dateStr}T10:30:00`,
  };
}

function byDate(dates: string[]): Map<string, WorkoutHistory[]> {
  const map = new Map<string, WorkoutHistory[]>();
  for (const d of dates) map.set(d, [makeHistory(d)]);
  return map;
}

describe('calcCurrentStreak', () => {
  it('ワークアウトなし → 0', () => {
    expect(calcCurrentStreak(new Map(), '2026-06-10')).toBe(0);
  });

  it('今日ワークアウト → 1', () => {
    expect(calcCurrentStreak(byDate(['2026-06-10']), '2026-06-10')).toBe(1);
  });

  it('昨日ワークアウト・今日なし → 1（翌日23:59まで継続）', () => {
    expect(calcCurrentStreak(byDate(['2026-06-09']), '2026-06-10')).toBe(1);
  });

  it('2日前以前のみ → 0（streak切れ）', () => {
    expect(calcCurrentStreak(byDate(['2026-06-08']), '2026-06-10')).toBe(0);
  });

  it('今日・昨日の2日連続 → 2', () => {
    expect(calcCurrentStreak(byDate(['2026-06-09', '2026-06-10']), '2026-06-10')).toBe(2);
  });

  it('昨日・一昨日の連続（今日なし）→ 2', () => {
    expect(calcCurrentStreak(byDate(['2026-06-08', '2026-06-09']), '2026-06-10')).toBe(2);
  });

  it('昨日はあるが一昨日は抜け → 1', () => {
    expect(calcCurrentStreak(byDate(['2026-06-07', '2026-06-09']), '2026-06-10')).toBe(1);
  });

  it('3日連続（昨日まで）→ 3', () => {
    expect(
      calcCurrentStreak(byDate(['2026-06-07', '2026-06-08', '2026-06-09']), '2026-06-10')
    ).toBe(3);
  });
});
