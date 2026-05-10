import { useEffect, useReducer, useRef, useState } from 'react';
import { TimerDisplay } from '../components/TimerDisplay';
import {
  calculateRemainingRoutineDuration,
  calculateTotalDuration,
  formatClockDuration,
  formatJapaneseDuration,
} from '../features/routines/routineTime';
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

const PRE_START_COUNTDOWN_SEC = 3;

export function TimerPage({ routine, voiceService, wakeLockService, onBack }: Props) {
  const [state, rawDispatch] = useReducer(timerReducer, initialTimerState);
  const [plannedStartAtMs, setPlannedStartAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [finishedAtMs, setFinishedAtMs] = useState<number | null>(null);
  const stateRef = useRef<TimerState>(state);
  const buttonBase =
    'min-h-12 rounded-lg border px-3 font-bold shadow-sm transition active:translate-y-px';
  const buttonClass = `${buttonBase} border-[#efc4a2] bg-[#fffdfa] text-[#241710]`;
  const primaryButtonClass = `${buttonBase} border-[#e45112] bg-[#e95f1a] text-white shadow-[#f26a21]/25`;
  const dangerButtonClass = `${buttonBase} border-[#c8332c] bg-[#fffdfa] text-[#c8332c]`;
  const backLinkClass = 'border-0 bg-transparent p-0 text-sm font-bold text-[#8a4b23] shadow-none';

  function dispatch(action: TimerAction) {
    const previous = stateRef.current;
    const next = timerReducer(previous, action);
    stateRef.current = next;
    if (action.type === 'start') {
      const plannedStart = Date.now() + PRE_START_COUNTDOWN_SEC * 1000;
      setPlannedStartAtMs(plannedStart);
      setFinishedAtMs(null);
      setNowMs(Date.now());
    }
    if (next.status === 'finished' && previous.status !== 'finished') {
      const finishedAt = Date.now();
      setFinishedAtMs(finishedAt);
      setNowMs(finishedAt);
    }
    if (action.type === 'end') {
      setPlannedStartAtMs(null);
      setFinishedAtMs(null);
    }
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
    if (state.status === 'idle' || state.status === 'finished') return undefined;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state.status]);

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

  const totalDuration = calculateTotalDuration(routine);
  const timing = calculateTimingSummary(routine, state, plannedStartAtMs, finishedAtMs ?? nowMs);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-[720px] grid-rows-[auto_auto_1fr_auto] p-4 text-[#241710] sm:p-5">
      <header className="flex items-start justify-between gap-3 mb-3">
        <button className={backLinkClass} onClick={onBack}>
          ← 戻る
        </button>
        <div className="rounded-full bg-[#f26a21] px-3 py-1.5 text-sm font-bold text-white">
          合計 {formatClockDuration(totalDuration)}
        </div>
      </header>
      <section className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-[#f5a568] bg-[#fff0df] p-3 shadow-sm shadow-[#f26a21]/10">
        <div>
          <p className="m-0 text-xs font-black text-[#8a4b23]">予定終了</p>
          <p className="m-0 mt-1 text-xl font-black text-[#b84b12]">{timing.plannedEndLabel}</p>
        </div>
        <div>
          <p className="m-0 text-xs font-black text-[#8a4b23]">予定との差分</p>
          <p className={`m-0 mt-1 text-xl font-black ${timing.deltaSec > 0 ? 'text-[#9c211b]' : 'text-[#2d6b2c]'}`}>
            {timing.deltaLabel}
          </p>
        </div>
      </section>
      <p className="mb-3 mt-3 rounded-lg border border-[#f5c198] bg-[#fff7ef] px-3 py-2 text-sm font-medium text-[#8a4b23]">
        画面を開いたまま使用してください
      </p>
      <TimerDisplay routine={routine} state={state} />
      <div className="grid gap-3">
        {state.status === 'idle' || state.status === 'finished' ? (
          <button
            className={`${primaryButtonClass} min-h-[60px] text-lg`}
            onClick={() => dispatch({ type: 'start', routine })}
          >
            開始
          </button>
        ) : state.status === 'running' ? (
          <button
            className={`${primaryButtonClass} min-h-[60px] text-lg`}
            onClick={() => dispatch({ type: 'pause' })}
          >
            一時停止
          </button>
        ) : state.status === 'countdown' ? (
          <button className={`${primaryButtonClass} min-h-[60px] text-lg`} disabled>
            カウントダウン
          </button>
        ) : (
          <button
            className={`${primaryButtonClass} min-h-[60px] text-lg`}
            onClick={() => dispatch({ type: 'resume' })}
          >
            再開
          </button>
        )}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button className={buttonClass} onClick={() => dispatch({ type: 'previous', routine })}>
            前へ
          </button>
          <button className={buttonClass} onClick={() => dispatch({ type: 'skip', routine })}>
            次へ
          </button>
          <button className={dangerButtonClass} onClick={() => dispatch({ type: 'finish' })}>
            終了
          </button>
        </div>
      </div>
    </main>
  );
}

function calculateTimingSummary(
  routine: Routine,
  state: TimerState,
  plannedStartAtMs: number | null,
  nowMs: number,
) {
  const totalDuration = calculateTotalDuration(routine);
  const plannedEndAtMs = plannedStartAtMs
    ? plannedStartAtMs + totalDuration * 1000
    : nowMs + totalDuration * 1000;
  const projectedEndAtMs =
    plannedStartAtMs && state.status !== 'countdown'
      ? nowMs + calculateRemainingRoutineDuration(routine, state.currentIndex, state.remainingSec) * 1000
      : plannedEndAtMs;
  const deltaSec = plannedStartAtMs ? Math.round((projectedEndAtMs - plannedEndAtMs) / 1000) : 0;

  return {
    plannedEndLabel: formatTime(plannedEndAtMs),
    deltaSec,
    deltaLabel: plannedStartAtMs ? formatScheduleDifference(deltaSec) : '開始前',
  };
}

function formatTime(timestampMs: number): string {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestampMs));
}

function formatScheduleDifference(seconds: number): string {
  if (seconds === 0) return '予定通り';
  const duration = formatJapaneseDuration(Math.abs(seconds));
  return seconds > 0 ? `${duration}遅れ` : `${duration}早い`;
}
