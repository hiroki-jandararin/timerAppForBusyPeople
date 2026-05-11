import { useEffect, useReducer, useRef, useState } from 'react';
import { TimerDisplay } from '../components/TimerDisplay';
import {
  calculateRemainingRoutineDuration,
  calculateTotalDuration,
  formatClockDuration,
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
const ADJUSTMENT_SUGGESTION_DELAY_SEC = 30;
const MIN_SHORTENED_REST_SEC = 15;

type RestShorteningPlan = {
  routine: Routine;
  recoveredSec: number;
  changedCount: number;
  changes: Array<{
    title: string;
    beforeSec: number;
    afterSec: number;
    shortenedSec: number;
  }>;
};

export function TimerPage({ routine, voiceService, wakeLockService, onBack }: Props) {
  const [state, rawDispatch] = useReducer(timerReducer, initialTimerState);
  const [activeRoutine, setActiveRoutine] = useState(routine);
  const [plannedStartAtMs, setPlannedStartAtMs] = useState<number | null>(null);
  const [plannedEndAtMs, setPlannedEndAtMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [finishedAtMs, setFinishedAtMs] = useState<number | null>(null);
  const [isAdjustmentPromptOpen, setIsAdjustmentPromptOpen] = useState(false);
  const [hasShownAdjustmentPrompt, setHasShownAdjustmentPrompt] = useState(false);
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
    const actionRoutine = 'routine' in action ? action.routine : activeRoutine;
    stateRef.current = next;
    if (action.type === 'start') {
      const plannedStart = Date.now() + PRE_START_COUNTDOWN_SEC * 1000;
      setPlannedStartAtMs(plannedStart);
      setPlannedEndAtMs(plannedStart + calculateTotalDuration(activeRoutine) * 1000);
      setFinishedAtMs(null);
      setNowMs(Date.now());
      setIsAdjustmentPromptOpen(false);
      setHasShownAdjustmentPrompt(false);
    }
    if (next.status === 'finished' && previous.status !== 'finished') {
      const finishedAt = Date.now();
      setFinishedAtMs(finishedAt);
      setNowMs(finishedAt);
    }
    if (action.type === 'end') {
      setPlannedStartAtMs(null);
      setPlannedEndAtMs(null);
      setFinishedAtMs(null);
      setIsAdjustmentPromptOpen(false);
      setHasShownAdjustmentPrompt(false);
    }
    announceForTransition(previous, next, actionRoutine, voiceService);
    rawDispatch(action);
  }

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (state.status !== 'running' && state.status !== 'countdown') return undefined;
    const id = window.setInterval(() => dispatch({ type: 'tick', routine: activeRoutine }), 1000);
    return () => window.clearInterval(id);
  }, [state.status, activeRoutine]);

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

  useEffect(() => {
    if (state.status !== 'idle') return;
    setActiveRoutine(routine);
  }, [routine, state.status]);

  const totalDuration = calculateTotalDuration(activeRoutine);
  const timing = calculateTimingSummary(
    activeRoutine,
    state,
    plannedStartAtMs,
    plannedEndAtMs,
    finishedAtMs ?? nowMs
  );
  const restShorteningPlan = createRestShorteningPlan(
    activeRoutine,
    state.currentIndex,
    Math.max(0, timing.deltaSec)
  );
  const shouldSuggestAdjustment =
    timing.deltaSec >= ADJUSTMENT_SUGGESTION_DELAY_SEC &&
    (state.status === 'running' || state.status === 'paused') &&
    restShorteningPlan.recoveredSec > 0;

  useEffect(() => {
    if (!shouldSuggestAdjustment || hasShownAdjustmentPrompt) return;
    setIsAdjustmentPromptOpen(true);
    setHasShownAdjustmentPrompt(true);
  }, [hasShownAdjustmentPrompt, shouldSuggestAdjustment]);

  function applyRestShortening() {
    if (restShorteningPlan.recoveredSec <= 0) return;
    setActiveRoutine(restShorteningPlan.routine);
    setIsAdjustmentPromptOpen(false);
    if (stateRef.current.status === 'paused') {
      dispatch({ type: 'resume' });
    }
  }

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
      <p className="mb-3 rounded-lg border border-[#f5c198] bg-[#fff7ef] px-3 py-2 text-sm font-medium text-[#8a4b23]">
        画面を開いたまま使用してください
      </p>
      <TimerDisplay
        routine={activeRoutine}
        state={state}
        plannedEndLabel={timing.plannedEndLabel}
        scheduleDeltaLabel={timing.deltaLabel}
        scheduleDeltaSec={timing.deltaSec}
      />
      <div className="grid gap-3">
        {state.status === 'idle' || state.status === 'finished' ? (
          <button
            className={`${primaryButtonClass} min-h-[60px] text-lg`}
            onClick={() => dispatch({ type: 'start', routine: activeRoutine })}
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
          <button
            className={buttonClass}
            onClick={() => dispatch({ type: 'previous', routine: activeRoutine })}
          >
            前へ
          </button>
          <button
            className={buttonClass}
            onClick={() => dispatch({ type: 'skip', routine: activeRoutine })}
          >
            次へ
          </button>
          <button className={dangerButtonClass} onClick={() => dispatch({ type: 'finish' })}>
            終了
          </button>
        </div>
      </div>
      {isAdjustmentPromptOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#241710]/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="adjustment-suggestion-title"
        >
          <section className="grid w-full max-w-[420px] gap-4 rounded-lg border border-[#f0b3a2] bg-[#fffdfa] p-4 text-left text-[#241710] shadow-2xl">
            <div className="grid gap-1">
              <p className="m-0 text-sm font-black text-[#9c211b]">
                {formatScheduleDifference(timing.deltaSec)}
              </p>
              <h2 id="adjustment-suggestion-title" className="m-0 text-xl font-black leading-tight">
                この先の休憩を短縮しますか？
              </h2>
              <p className="m-0 text-sm font-bold text-[#6d5a4d]">
                種目は残したまま、休憩を合計{restShorteningPlan.recoveredSec}秒短縮できます。
              </p>
            </div>
            <article className="rounded-lg border border-[#ead8c7] bg-[#fff7ef] p-3">
              <h3 className="m-0 text-base font-black">休憩短縮</h3>
              <p className="m-0 mt-1 text-sm font-bold text-[#6d5a4d]">
                この先の休憩{restShorteningPlan.changedCount}件を同じ割合で短くします。
              </p>
              <div className="mt-3 grid gap-2">
                {restShorteningPlan.changes.map((change, index) => (
                  <div
                    key={`${change.title}-${index}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg bg-white/75 px-3 py-2 text-sm"
                  >
                    <span className="font-bold text-[#4b392e]">{change.title}</span>
                    <span className="font-black text-[#9c211b]">
                      {change.beforeSec}秒 → {change.afterSec}秒（-{change.shortenedSec}秒）
                    </span>
                  </div>
                ))}
              </div>
            </article>
            <button className={`${primaryButtonClass} min-h-12`} onClick={applyRestShortening}>
              休憩を短縮する
            </button>
            <button className={buttonClass} onClick={() => setIsAdjustmentPromptOpen(false)}>
              今回はしない
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

function calculateTimingSummary(
  routine: Routine,
  state: TimerState,
  plannedStartAtMs: number | null,
  plannedEndAtMs: number | null,
  nowMs: number
) {
  const totalDuration = calculateTotalDuration(routine);
  const plannedEnd =
    plannedEndAtMs ??
    (plannedStartAtMs ? plannedStartAtMs + totalDuration * 1000 : nowMs + totalDuration * 1000);
  const projectedEndAtMs =
    plannedStartAtMs && state.status !== 'countdown'
      ? nowMs +
        calculateRemainingRoutineDuration(routine, state.currentIndex, state.remainingSec) * 1000
      : plannedEnd;
  const deltaSec = plannedStartAtMs ? Math.round((projectedEndAtMs - plannedEnd) / 1000) : 0;

  return {
    plannedEndLabel: formatTime(plannedEnd),
    deltaSec,
    deltaLabel: plannedStartAtMs ? formatScheduleDifference(deltaSec) : '開始前',
  };
}

function createRestShorteningPlan(
  routine: Routine,
  currentIndex: number,
  requiredSec: number
): RestShorteningPlan {
  const restCandidates = routine.items
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item, index }) =>
        index > currentIndex &&
        item.type === 'interval' &&
        item.durationSec > MIN_SHORTENED_REST_SEC
    );
  const totalRestSec = restCandidates.reduce((sum, { item }) => sum + item.durationSec, 0);
  const maxRecoverableSec = restCandidates.reduce(
    (sum, { item }) => sum + item.durationSec - MIN_SHORTENED_REST_SEC,
    0
  );
  const targetRecoverSec = Math.min(requiredSec, maxRecoverableSec);

  if (totalRestSec <= 0 || targetRecoverSec <= 0) {
    return {
      routine,
      recoveredSec: 0,
      changedCount: 0,
      changes: [],
    };
  }

  const reductionRatio = targetRecoverSec / totalRestSec;
  const shortenPlans = restCandidates.map(({ item, index }) => {
    const maxShortenSec = item.durationSec - MIN_SHORTENED_REST_SEC;
    const proportionalShortenSec = item.durationSec * reductionRatio;
    const baseShortenSec = Math.min(maxShortenSec, Math.floor(proportionalShortenSec));
    return {
      index,
      maxShortenSec,
      shortenSec: baseShortenSec,
      remainder: proportionalShortenSec - baseShortenSec,
    };
  });
  let recoveredSec = shortenPlans.reduce((sum, plan) => sum + plan.shortenSec, 0);
  let remainingShortenSec = targetRecoverSec - recoveredSec;
  const plansByRemainder = [...shortenPlans].sort((a, b) => b.remainder - a.remainder);

  while (remainingShortenSec > 0) {
    let distributedInPass = 0;
    for (const plan of plansByRemainder) {
      if (remainingShortenSec <= 0) break;
      if (plan.shortenSec >= plan.maxShortenSec) continue;
      plan.shortenSec += 1;
      recoveredSec += 1;
      remainingShortenSec -= 1;
      distributedInPass += 1;
    }
    if (distributedInPass === 0) break;
  }

  const shortenByIndex = new Map(shortenPlans.map((plan) => [plan.index, plan.shortenSec]));
  const items = routine.items.map((item, index) => {
    const shortenSec = shortenByIndex.get(index) ?? 0;
    if (shortenSec <= 0) return item;
    return {
      ...item,
      durationSec: item.durationSec - shortenSec,
    };
  });
  const changes = shortenPlans
    .filter((plan) => plan.shortenSec > 0)
    .map((plan) => {
      const item = routine.items[plan.index];
      return {
        title: item.title,
        beforeSec: item.durationSec,
        afterSec: item.durationSec - plan.shortenSec,
        shortenedSec: plan.shortenSec,
      };
    });

  return {
    routine:
      recoveredSec > 0 ? { ...routine, items, updatedAt: new Date().toISOString() } : routine,
    recoveredSec,
    changedCount: changes.length,
    changes,
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
  return seconds > 0 ? `${Math.abs(seconds)}秒遅れ` : `${Math.abs(seconds)}秒早い`;
}
