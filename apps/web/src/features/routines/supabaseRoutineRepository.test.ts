import { describe, expect, it, vi } from 'vitest';
import { addItem } from '@timeapp/core';
import { createRoutine } from '@timeapp/core';
import { SupabaseRoutineRepository, type SupabaseRoutineClient } from './supabaseRoutineRepository';

describe('SupabaseRoutineRepository', () => {
  it('ログイン中ユーザーのroutineだけを取得してアプリの型に変換する', async () => {
    const client = createClient({
      selectData: [
        {
          id: 'routine_1',
          name: '全身トレA',
          target_duration_sec: 2700,
          items: [
            {
              id: 'item_1',
              type: 'workout',
              title: '腕立て伏せ',
              durationSec: 30,
              voiceText: '',
            },
          ],
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:10:00.000Z',
        },
      ],
    });
    const repository = new SupabaseRoutineRepository('user-1', client);

    await expect(repository.findAll()).resolves.toEqual([
      {
        id: 'routine_1',
        name: '全身トレA',
        targetDurationSec: 2700,
        items: [
          {
            id: 'item_1',
            type: 'workout',
            title: '腕立て伏せ',
            durationSec: 30,
            voiceText: '',
          },
        ],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:10:00.000Z',
      },
    ]);
    expect(client.from).toHaveBeenCalledWith('routines');
    expect(client.eqCalls).toContainEqual(['user_id', 'user-1']);
  });

  it('routineをuser_id付きでupsertする', async () => {
    const client = createClient();
    const repository = new SupabaseRoutineRepository('user-1', client);
    const routine = { ...addItem(createRoutine('全身トレA'), 'workout'), targetDurationSec: 2700 };

    await repository.save(routine);

    expect(client.upsert).toHaveBeenCalledWith({
      id: routine.id,
      user_id: 'user-1',
      name: routine.name,
      target_duration_sec: 2700,
      items: routine.items,
      created_at: routine.createdAt,
      updated_at: routine.updatedAt,
    });
  });

  it('routineをログイン中ユーザーの範囲で削除する', async () => {
    const client = createClient();
    const repository = new SupabaseRoutineRepository('user-1', client);

    await repository.delete('routine_1');

    expect(client.delete).toHaveBeenCalledOnce();
    expect(client.eqCalls).toContainEqual(['id', 'routine_1']);
    expect(client.eqCalls).toContainEqual(['user_id', 'user-1']);
  });
});

type ClientOptions = {
  selectData?: unknown[];
};

function createClient(options: ClientOptions = {}) {
  const query = {
    selectData: options.selectData ?? [],
    eqCalls: [] as [string, string][],
    from: vi.fn(() => query),
    select: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: query.selectData[0] ?? null, error: null })),
    upsert: vi.fn(async () => ({ error: null })),
    delete: vi.fn(() => query),
    eq: vi.fn((column: string, value: string) => {
      query.eqCalls.push([column, value]);
      return query;
    }),
    then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
      resolve({ data: query.selectData, error: null }),
  };
  return query as unknown as SupabaseRoutineClient & typeof query;
}
