import type { Routine } from './routineTypes';

export function calculateTotalDuration(routine: Pick<Routine, 'items'>): number {
  return routine.items.reduce((total, item) => total + item.durationSec, 0);
}

export function calculateRemainingRoutineDuration(routine: Routine, currentIndex: number, remainingSec: number) {
  const remainingAfterCurrent = routine.items
    .slice(currentIndex + 1)
    .reduce((total, item) => total + item.durationSec, 0);
  return Math.max(0, remainingSec) + remainingAfterCurrent;
}

export function calculateElapsedRoutineDuration(routine: Routine, currentIndex: number, remainingSec: number) {
  const completedBeforeCurrent = routine.items
    .slice(0, currentIndex)
    .reduce((total, item) => total + item.durationSec, 0);
  const current = routine.items[currentIndex];
  if (!current) return calculateTotalDuration(routine);
  return completedBeforeCurrent + Math.max(0, current.durationSec - remainingSec);
}

export function getTargetDuration(routine: Routine): number | null {
  return routine.targetDurationSec ?? null;
}

export function calculateTargetDifference(routine: Routine): number | null {
  const targetDurationSec = getTargetDuration(routine);
  if (targetDurationSec === null) return null;
  return targetDurationSec - calculateTotalDuration(routine);
}

export function formatClockDuration(seconds: number): string {
  const normalizedSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const secs = normalizedSeconds % 60;

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${minutes}:${pad(secs)}`;
}

export function formatJapaneseDuration(seconds: number): string {
  const normalizedSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const secs = normalizedSeconds % 60;

  if (hours > 0) return `${hours}時間${minutes}分${secs}秒`;
  if (minutes > 0) return `${minutes}分${secs}秒`;
  return `${secs}秒`;
}

export function formatSignedDifference(seconds: number): string {
  if (seconds === 0) return 'ぴったり';
  const label = formatJapaneseDuration(Math.abs(seconds));
  return seconds > 0 ? `${label}余裕` : `${label}オーバー`;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
