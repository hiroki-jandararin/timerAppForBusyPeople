import type { Routine } from '@timeapp/core';

let pending: Routine | null = null;

export function setPendingAiRoutine(routine: Routine): void {
  pending = routine;
}

export function consumePendingAiRoutine(): Routine | null {
  const r = pending;
  pending = null;
  return r;
}
