import { describe, expect, it } from 'vitest';
import { createRoutine } from '../routines/routineFactory';
import { addItem, updateItem } from '../routines/routineOperations';
import { MockVoiceService } from '../voice/mockVoiceService';
import type { TimerState } from './timerTypes';
import { announceForTransition } from './timerService';

const routine = (() => {
  let created = addItem(addItem(createRoutine('A'), 'workout'), 'interval');
  created = updateItem(created, created.items[0].id, { title: 'ベンチプレス', durationSec: 20 });
  created = updateItem(created, created.items[1].id, { title: '休憩', durationSec: 60 });
  return created;
})();

const idle: TimerState = { routineId: '', currentIndex: 0, remainingSec: 0, status: 'idle' };

describe('timerService voice announcements', () => {
  it('start時に3秒カウントダウンを読み上げる', () => {
    const voice = new MockVoiceService();
    announceForTransition(idle, { routineId: routine.id, currentIndex: 0, remainingSec: 3, status: 'countdown' }, routine, voice);

    expect(voice.spoken).toEqual(['3']);
  });

  it('countdown中に2秒と1秒を読み上げる', () => {
    const voice = new MockVoiceService();
    announceForTransition(
      { routineId: routine.id, currentIndex: 0, remainingSec: 3, status: 'countdown' },
      { routineId: routine.id, currentIndex: 0, remainingSec: 2, status: 'countdown' },
      routine,
      voice,
    );
    announceForTransition(
      { routineId: routine.id, currentIndex: 0, remainingSec: 2, status: 'countdown' },
      { routineId: routine.id, currentIndex: 0, remainingSec: 1, status: 'countdown' },
      routine,
      voice,
    );

    expect(voice.spoken).toEqual(['2', '1']);
  });

  it('カウントダウン後に現在のカード名と秒数を自動で読み上げる', () => {
    const voice = new MockVoiceService();
    announceForTransition(
      { routineId: routine.id, currentIndex: 0, remainingSec: 1, status: 'countdown' },
      { routineId: routine.id, currentIndex: 0, remainingSec: 20, status: 'running' },
      routine,
      voice,
    );

    expect(voice.spoken).toEqual(['ベンチプレス、20秒']);
  });

  it('次のカードが始まった時に現在のカード名と秒数を読み上げる', () => {
    const voice = new MockVoiceService();
    announceForTransition(
      { routineId: routine.id, currentIndex: 0, remainingSec: 1, status: 'running' },
      { routineId: routine.id, currentIndex: 1, remainingSec: 60, status: 'running' },
      routine,
      voice,
    );

    expect(voice.spoken).toEqual(['休憩、60秒']);
  });

  it('前のカードが残り10秒になった時に次のカード名と秒数を自動で読み上げる', () => {
    const voice = new MockVoiceService();
    announceForTransition(
      { routineId: routine.id, currentIndex: 0, remainingSec: 11, status: 'running' },
      { routineId: routine.id, currentIndex: 0, remainingSec: 10, status: 'running' },
      routine,
      voice,
    );

    expect(voice.spoken).toEqual(['次、休憩、60秒']);
  });

  it('次のカードがない場合は残り10秒でも次カード予告をしない', () => {
    const voice = new MockVoiceService();
    announceForTransition(
      { routineId: routine.id, currentIndex: 1, remainingSec: 11, status: 'running' },
      { routineId: routine.id, currentIndex: 1, remainingSec: 10, status: 'running' },
      routine,
      voice,
    );

    expect(voice.spoken).toEqual([]);
  });

  it('次のカードがある場合は前カードの残り3秒からカウントダウンを読み上げる', () => {
    const voice = new MockVoiceService();
    announceForTransition(
      { routineId: routine.id, currentIndex: 0, remainingSec: 4, status: 'running' },
      { routineId: routine.id, currentIndex: 0, remainingSec: 3, status: 'running' },
      routine,
      voice,
    );
    announceForTransition(
      { routineId: routine.id, currentIndex: 0, remainingSec: 3, status: 'running' },
      { routineId: routine.id, currentIndex: 0, remainingSec: 2, status: 'running' },
      routine,
      voice,
    );
    announceForTransition(
      { routineId: routine.id, currentIndex: 0, remainingSec: 2, status: 'running' },
      { routineId: routine.id, currentIndex: 0, remainingSec: 1, status: 'running' },
      routine,
      voice,
    );

    expect(voice.spoken).toEqual(['3', '2', '1']);
  });

  it('次のカードがない場合は残り3秒カウントダウンを読み上げない', () => {
    const voice = new MockVoiceService();
    announceForTransition(
      { routineId: routine.id, currentIndex: 1, remainingSec: 4, status: 'running' },
      { routineId: routine.id, currentIndex: 1, remainingSec: 3, status: 'running' },
      routine,
      voice,
    );

    expect(voice.spoken).toEqual([]);
  });

  it('finished時に終了を読み上げる', () => {
    const voice = new MockVoiceService();
    announceForTransition(
      { routineId: routine.id, currentIndex: 1, remainingSec: 1, status: 'running' },
      { routineId: routine.id, currentIndex: 1, remainingSec: 0, status: 'finished' },
      routine,
      voice,
    );

    expect(voice.spoken).toEqual(['終了です']);
  });

});
