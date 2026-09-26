import type { Routine, TimerState } from '@timeapp/core';
import {
  clearTimerSession,
  loadTimerSession,
  saveTimerSession,
} from '../features/timer/timerSessionStore';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
  removeItem: (...args: unknown[]) => mockRemoveItem(...args),
}));

const routine: Routine = {
  id: 'r1',
  name: 'テストルーティン',
  items: [{ id: 'i1', type: 'workout', title: 'スクワット', durationSec: 30, voiceText: '', groupId: 'g1' }],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const state: TimerState = { routineId: 'r1', currentIndex: 0, remainingSec: 10, status: 'running' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('timerSessionStore', () => {
  it('saveTimerSession() でルーティンIDごとのキーにJSONを保存する', async () => {
    await saveTimerSession('r1', {
      routine,
      state,
      anchorAtMs: 1000,
      plannedStartAtMs: 500,
      plannedEndAtMs: 2000,
      startedAtMs: 500,
    });

    expect(mockSetItem).toHaveBeenCalledWith(
      expect.stringContaining('r1'),
      expect.stringContaining('"remainingSec":10')
    );
  });

  it('loadTimerSession() で保存した内容を復元する', async () => {
    mockGetItem.mockResolvedValue(
      JSON.stringify({ routine, state, anchorAtMs: 1000, plannedStartAtMs: 500, plannedEndAtMs: 2000, startedAtMs: 500 })
    );

    const session = await loadTimerSession('r1');

    expect(session).toEqual({
      routine,
      state,
      anchorAtMs: 1000,
      plannedStartAtMs: 500,
      plannedEndAtMs: 2000,
      startedAtMs: 500,
    });
  });

  it('loadTimerSession() は保存がなければnullを返す', async () => {
    mockGetItem.mockResolvedValue(null);

    expect(await loadTimerSession('r1')).toBeNull();
  });

  it('loadTimerSession() は壊れたJSONの場合nullを返す', async () => {
    mockGetItem.mockResolvedValue('{invalid json');

    expect(await loadTimerSession('r1')).toBeNull();
  });

  it('clearTimerSession() でそのルーティンIDのキーを削除する', async () => {
    await clearTimerSession('r1');

    expect(mockRemoveItem).toHaveBeenCalledWith(expect.stringContaining('r1'));
  });

  it('異なるルーティンIDは別のキーに保存される', async () => {
    await saveTimerSession('r1', {
      routine,
      state,
      anchorAtMs: 1000,
      plannedStartAtMs: null,
      plannedEndAtMs: null,
      startedAtMs: null,
    });
    await saveTimerSession('r2', {
      routine,
      state,
      anchorAtMs: 1000,
      plannedStartAtMs: null,
      plannedEndAtMs: null,
      startedAtMs: null,
    });

    const [key1] = mockSetItem.mock.calls[0];
    const [key2] = mockSetItem.mock.calls[1];
    expect(key1).not.toBe(key2);
  });
});
