import { describe, expect, it } from 'vitest';
import { createRoutine } from '../routines/routineFactory';
import { addItem, updateItem } from '../routines/routineOperations';
import { initialTimerState, timerReducer } from './timerReducer';

const createTestRoutine = () => {
  let routine = addItem(addItem(createRoutine('A'), 'workout'), 'interval');
  routine = updateItem(routine, routine.items[0].id, { title: 'A', durationSec: 2 });
  routine = updateItem(routine, routine.items[1].id, { title: 'B', durationSec: 3 });
  return routine;
};

describe('timerReducer', () => {
  it('idleからstartするとcountdownになり、3秒から始まる', () => {
    const routine = createTestRoutine();
    const state = timerReducer(initialTimerState, { type: 'start', routine });

    expect(state.status).toBe('countdown');
    expect(state.currentIndex).toBe(0);
    expect(state.remainingSec).toBe(3);
  });

  it('countdownが終わるとrunningになり、最初のカードのdurationSecを設定する', () => {
    const routine = createTestRoutine();
    const started = timerReducer(initialTimerState, { type: 'start', routine });
    const two = timerReducer(started, { type: 'tick', routine });
    const one = timerReducer(two, { type: 'tick', routine });
    const running = timerReducer(one, { type: 'tick', routine });

    expect(running.status).toBe('running');
    expect(running.currentIndex).toBe(0);
    expect(running.remainingSec).toBe(2);
  });

  it('running中にtickするとremainingSecが1減る', () => {
    const routine = createTestRoutine();
    const started = { routineId: routine.id, currentIndex: 0, remainingSec: 2, status: 'running' as const };

    expect(timerReducer(started, { type: 'tick', routine }).remainingSec).toBe(1);
  });

  it('paused中にtickしてもremainingSecは減らない', () => {
    const routine = createTestRoutine();
    const started = { routineId: routine.id, currentIndex: 0, remainingSec: 2, status: 'running' as const };
    const paused = timerReducer(started, { type: 'pause' });

    expect(timerReducer(paused, { type: 'tick', routine }).remainingSec).toBe(2);
  });

  it('remainingSecが0になると次のカードへ進む', () => {
    const routine = createTestRoutine();
    const started = { routineId: routine.id, currentIndex: 0, remainingSec: 2, status: 'running' as const };
    const state = timerReducer(timerReducer(started, { type: 'tick', routine }), { type: 'tick', routine });

    expect(state.currentIndex).toBe(1);
    expect(state.remainingSec).toBe(3);
  });

  it('最後のカードが終了するとfinishedになる', () => {
    const routine = createTestRoutine();
    const state = timerReducer({ routineId: routine.id, currentIndex: 1, remainingSec: 1, status: 'running' }, { type: 'tick', routine });

    expect(state.status).toBe('finished');
  });

  it('pauseするとpaused、resumeするとrunningになる', () => {
    const routine = createTestRoutine();
    const started = { routineId: routine.id, currentIndex: 0, remainingSec: 2, status: 'running' as const };
    const paused = timerReducer(started, { type: 'pause' });

    expect(paused.status).toBe('paused');
    expect(timerReducer(paused, { type: 'resume' }).status).toBe('running');
  });

  it('skipすると次のカードへ進み、最後でskipするとfinishedになる', () => {
    const routine = createTestRoutine();
    const started = { routineId: routine.id, currentIndex: 0, remainingSec: 2, status: 'running' as const };
    const skipped = timerReducer(started, { type: 'skip', routine });
    const finished = timerReducer(skipped, { type: 'skip', routine });

    expect(skipped.currentIndex).toBe(1);
    expect(skipped.remainingSec).toBe(3);
    expect(finished.status).toBe('finished');
  });

  it('previousすると前のカードへ戻り、先頭では先頭のまま', () => {
    const routine = createTestRoutine();
    const second = { routineId: routine.id, currentIndex: 1, remainingSec: 3, status: 'running' as const };
    const previous = timerReducer(second, { type: 'previous', routine });

    expect(previous.currentIndex).toBe(0);
    expect(previous.remainingSec).toBe(2);
    expect(timerReducer(previous, { type: 'previous', routine }).currentIndex).toBe(0);
  });
});
