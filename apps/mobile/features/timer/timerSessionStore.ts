import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Routine, TimerState } from '@timeapp/core';

const KEY_PREFIX = 'timerSession:';

export type PersistedTimerSession = {
  routine: Routine;
  state: TimerState;
  // stateがこの時刻時点で正しいことを示すアンカー（復元時にここからの経過秒数を計算する）
  anchorAtMs: number;
  plannedStartAtMs: number | null;
  plannedEndAtMs: number | null;
  startedAtMs: number | null;
};

function keyFor(routineId: string): string {
  return `${KEY_PREFIX}${routineId}`;
}

export async function saveTimerSession(
  routineId: string,
  session: PersistedTimerSession
): Promise<void> {
  await AsyncStorage.setItem(keyFor(routineId), JSON.stringify(session));
}

export async function loadTimerSession(
  routineId: string
): Promise<PersistedTimerSession | null> {
  const raw = await AsyncStorage.getItem(keyFor(routineId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedTimerSession;
  } catch {
    return null;
  }
}

export async function clearTimerSession(routineId: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(routineId));
}
