import { useEffect, useReducer, useRef } from 'react';
import { TimerDisplay } from '../components/TimerDisplay';
import { calculateTotalDuration } from '../features/routines/routineOperations';
import type { Routine } from '../features/routines/routineTypes';
import { announceForTransition } from '../features/timer/timerService';
import { initialTimerState, timerReducer, type TimerAction } from '../features/timer/timerReducer';
import type { TimerState } from '../features/timer/timerTypes';
import type { VoiceService } from '../features/voice/voiceService';
import type { WakeLockService } from '../features/wakeLock/wakeLockService';

type Props = {
  routine: Routine;
  voiceService: VoiceService;
  wakeLockService: WakeLockService;
  onBack: () => void;
};

export function TimerPage({ routine, voiceService, wakeLockService, onBack }: Props) {
  const [state, rawDispatch] = useReducer(timerReducer, initialTimerState);
  const stateRef = useRef<TimerState>(state);
  const buttonBase = 'min-h-12 rounded-lg border px-3 font-bold shadow-sm transition active:translate-y-px';
  const buttonClass = `${buttonBase} border-[#efc4a2] bg-[#fffdfa] text-[#241710]`;
  const primaryButtonClass = `${buttonBase} border-[#e45112] bg-[#e95f1a] text-white shadow-[#f26a21]/25`;
  const dangerButtonClass = `${buttonBase} border-[#c8332c] bg-[#fffdfa] text-[#c8332c]`;

  function dispatch(action: TimerAction) {
    const previous = stateRef.current;
    const next = timerReducer(previous, action);
    stateRef.current = next;
    announceForTransition(previous, next, routine, voiceService);
    rawDispatch(action);
  }

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (state.status !== 'running' && state.status !== 'countdown') return undefined;
    const id = window.setInterval(() => dispatch({ type: 'tick', routine }), 1000);
    return () => window.clearInterval(id);
  }, [state.status, routine]);

  useEffect(() => {
    if (state.status === 'running' || state.status === 'countdown') {
      void wakeLockService.request();
    } else {
      void wakeLockService.release();
    }
    return () => {
      void wakeLockService.release();
    };
  }, [state.status, wakeLockService]);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-[720px] grid-rows-[auto_auto_1fr_auto] p-4 text-[#241710] sm:p-5">
      <header className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-[#f5c198] bg-[#ffead8] p-4 shadow-sm shadow-[#d96a1f]/10 sm:items-center">
        <button className={buttonClass} onClick={onBack}>戻る</button>
        <div className="rounded-full bg-[#f26a21] px-3 py-1.5 text-sm font-extrabold text-white">合計 {formatDuration(calculateTotalDuration(routine))}</div>
      </header>
      <p className="m-0 mb-1.5 rounded-lg border border-[#f5c198] bg-[#fff7ef] px-3 py-2 font-extrabold text-[#b84b12]">画面を開いたまま使用してください</p>
      <TimerDisplay routine={routine} state={state} />
      <div className="grid gap-3">
        {state.status === 'idle' || state.status === 'finished' ? (
          <button className={`${primaryButtonClass} min-h-[60px] text-lg`} onClick={() => dispatch({ type: 'start', routine })}>開始</button>
        ) : state.status === 'running' ? (
          <button className={`${primaryButtonClass} min-h-[60px] text-lg`} onClick={() => dispatch({ type: 'pause' })}>一時停止</button>
        ) : state.status === 'countdown' ? (
          <button className={`${primaryButtonClass} min-h-[60px] text-lg`} disabled>カウントダウン</button>
        ) : (
          <button className={`${primaryButtonClass} min-h-[60px] text-lg`} onClick={() => dispatch({ type: 'resume' })}>再開</button>
        )}
        <div className="mt-3.5 grid grid-cols-3 gap-2.5">
          <button className={buttonClass} onClick={() => dispatch({ type: 'previous', routine })}>前へ</button>
          <button className={buttonClass} onClick={() => dispatch({ type: 'skip', routine })}>次へ</button>
          <button className={dangerButtonClass} onClick={() => dispatch({ type: 'finish' })}>終了</button>
        </div>
      </div>
    </main>
  );
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}分${sec}秒`;
}
