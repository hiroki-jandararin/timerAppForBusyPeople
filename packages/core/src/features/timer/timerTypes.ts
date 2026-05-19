export type TimerStatus = 'idle' | 'countdown' | 'running' | 'paused' | 'finished';

export type TimerState = {
  routineId: string;
  currentIndex: number;
  remainingSec: number;
  status: TimerStatus;
};
