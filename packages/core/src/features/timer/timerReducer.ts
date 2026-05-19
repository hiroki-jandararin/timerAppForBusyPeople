import type { Routine } from '../routines/routineTypes';
import type { TimerState } from './timerTypes';

const COUNTDOWN_SECONDS = 3;

export type TimerAction =
  | { type: 'start'; routine: Routine }
  | { type: 'tick'; routine: Routine }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'skip'; routine: Routine }
  | { type: 'previous'; routine: Routine }
  | { type: 'finish' }
  | { type: 'end' };

export const initialTimerState: TimerState = {
  routineId: '',
  currentIndex: 0,
  remainingSec: 0,
  status: 'idle',
};

export function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'start': {
      const first = action.routine.items[0];
      return {
        routineId: action.routine.id,
        currentIndex: 0,
        remainingSec: first ? COUNTDOWN_SECONDS : 0,
        status: first ? 'countdown' : 'finished',
      };
    }
    case 'tick': {
      if (state.status === 'countdown') {
        if (state.remainingSec > 1) {
          return { ...state, remainingSec: state.remainingSec - 1 };
        }
        const first = action.routine.items[0];
        return first ? { ...state, remainingSec: first.durationSec, status: 'running' } : { ...state, remainingSec: 0, status: 'finished' };
      }
      if (state.status !== 'running') return state;
      if (state.remainingSec > 1) {
        return { ...state, remainingSec: state.remainingSec - 1 };
      }
      return advanceToNext(state, action.routine);
    }
    case 'pause':
      return state.status === 'running' ? { ...state, status: 'paused' } : state;
    case 'resume':
      return state.status === 'paused' ? { ...state, status: 'running' } : state;
    case 'skip':
      return advanceToNext(state, action.routine);
    case 'previous': {
      const previousIndex = Math.max(0, state.currentIndex - 1);
      const item = action.routine.items[previousIndex];
      return item
        ? {
            ...state,
            currentIndex: previousIndex,
            remainingSec: item.durationSec,
            status: state.status === 'finished' ? 'paused' : state.status,
          }
        : state;
    }
    case 'finish':
      return { ...state, remainingSec: 0, status: 'finished' };
    case 'end':
      return initialTimerState;
    default:
      return state;
  }
}

function advanceToNext(state: TimerState, routine: Routine): TimerState {
  const nextIndex = state.currentIndex + 1;
  const next = routine.items[nextIndex];
  if (!next) return { ...state, remainingSec: 0, status: 'finished' };
  return {
    ...state,
    currentIndex: nextIndex,
    remainingSec: next.durationSec,
  };
}
