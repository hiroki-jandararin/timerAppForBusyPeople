import { useEffect, useRef, useState, type ReactNode } from 'react';
import { getBaseTitle, getExerciseGroupRange, type Routine, type RoutineItem } from '@timeapp/core';
import type { TimerState } from '@timeapp/core';

type Props = {
  routine: Routine;
  state: TimerState;
  plannedEndLabel: string;
  scheduleDeltaLabel: string;
  scheduleDeltaSec: number;
  onPrevious: () => void;
  onNext: () => void;
  controls: ReactNode;
  onDefer?: () => void;
  onDoNext?: (groupStart: number) => void;
};

export function TimerDisplay({
  routine,
  state,
  plannedEndLabel,
  scheduleDeltaLabel,
  scheduleDeltaSec,
  onPrevious,
  onNext,
  controls,
  onDefer,
  onDoNext,
}: Props) {
  const current = routine.items[state.currentIndex];
  const previous = routine.items[state.currentIndex - 1];
  const next = routine.items[state.currentIndex + 1];
  const completed = state.status === 'finished' ? routine.items.length : state.currentIndex;
  const progress =
    routine.items.length === 0 ? 0 : Math.round((completed / routine.items.length) * 100);
  const isCountdown = state.status === 'countdown';
  const isRest = !isCountdown && current?.type === 'interval' && state.status !== 'finished';
  const isFinished = state.status === 'finished';
  const isLate = scheduleDeltaSec > 0;
  const displayRemainingSec =
    state.status === 'idle' ? (current?.durationSec ?? 0) : state.remainingSec;
  const isWarning =
    !isCountdown && !isFinished && displayRemainingSec > 0 && displayRemainingSec <= 3;
  const tone = getTimerTone({ isFinished, isLate, isRest, isCountdown, isWarning });
  const resultMessage = formatFinishedMessage(scheduleDeltaSec);
  const currentDurationSec = current?.durationSec ?? displayRemainingSec;
  const remainingRatio =
    currentDurationSec <= 0
      ? 0
      : Math.max(0, Math.min(1, displayRemainingSec / currentDurationSec));
  const ringRadius = 52;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - remainingRatio);
  const currentItemRef = useRef<HTMLDivElement | null>(null);
  const [selectedGroupStart, setSelectedGroupStart] = useState<number | null>(null);

  useEffect(() => {
    currentItemRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [state.currentIndex]);

  const groups = buildGroups(routine.items, state.currentIndex, isFinished);
  const currentIsWorkout = current?.type === 'workout' && !isFinished && state.status !== 'idle';
  const currentGroup = groups.find((g) => g.status === 'current');
  const nextGroup = groups.find((g) => g.status === 'upcoming');
  const remainingSets = currentGroup ? currentGroup.setCount - currentGroup.completedSets : 0;
  const [showDeferConfirm, setShowDeferConfirm] = useState(false);

  function handleGroupTap(groupStart: number) {
    setSelectedGroupStart((prev) => (prev === groupStart ? null : groupStart));
  }

  function handleDoNext(groupStart: number) {
    onDoNext?.(groupStart);
    setSelectedGroupStart(null);
  }

  return (
    <section className="grid gap-4 rounded-2xl bg-[#1E1E21] p-4 py-5 shadow-2xl shadow-black/60 border border-[#2C2C30]">
      {isFinished ? (
        <>
          <Confetti />
          <div
            className="celebrate-pop grid gap-5 rounded-2xl border p-5"
            style={{
              borderColor: isLate ? '#EF444430' : '#4ADE8030',
              backgroundColor: isLate ? '#EF444408' : '#4ADE8008',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="rounded-lg px-3 py-1 text-xs font-black tracking-[0.15em] uppercase"
                style={{
                  color: isLate ? '#EF4444' : '#4ADE80',
                  backgroundColor: isLate ? '#EF444420' : '#4ADE8020',
                }}
              >
                COMPLETED
              </span>
              <span className="text-xs font-bold tracking-wider text-[#A0A0A5]">
                終了 {plannedEndLabel}
              </span>
            </div>

            <div className="grid gap-3 py-6 text-center">
              <p
                className="stamp-in m-0 font-bebas leading-none"
                style={{
                  fontSize: 'clamp(4.5rem, 22vw, 8rem)',
                  color: isLate ? '#EF4444' : '#4ADE80',
                  textShadow: `0 0 60px ${isLate ? '#EF4444' : '#4ADE80'}50`,
                }}
                aria-label="トレーニング完了"
              >
                完了！
              </p>
              <p className="m-0 text-base font-black leading-snug text-[#F5F5F5]">
                {resultMessage.prefix}
                {resultMessage.delta && (
                  <span
                    className="whitespace-nowrap font-black"
                    style={{ color: isLate ? '#EF4444' : '#4ADE80' }}
                  >
                    {resultMessage.delta}
                  </span>
                )}
                {resultMessage.suffix}
              </p>
              <p className="m-0 text-sm font-bold text-[#A0A0A5]">
                {routine.items.filter((item) => item.type === 'workout').length}種目 お疲れ様でした
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="grid gap-4">
          {/* Phase chip + end time */}
          <div className="flex items-center justify-between">
            <span
              className="rounded-lg px-3 py-1 text-xs font-black tracking-[0.15em] uppercase"
              style={{ color: tone.phaseColor, backgroundColor: tone.phaseColor + '22' }}
            >
              {tone.label}
            </span>
            <span className="text-xs font-bold tracking-wider text-[#A0A0A5]">
              終了予定 {plannedEndLabel}
            </span>
          </div>

          {/* Progress ring + timer */}
          <div className="grid justify-items-center">
            <div
              className="relative grid aspect-square w-full max-w-[18rem] place-items-center"
              aria-label="現在カードの残り時間ゲージ"
            >
              {/* Ambient glow behind ring */}
              <div
                className="pointer-events-none absolute rounded-full"
                style={{
                  width: '55%',
                  height: '55%',
                  background: `radial-gradient(ellipse, ${tone.phaseColor}30 0%, transparent 75%)`,
                  filter: 'blur(18px)',
                }}
              />
              <svg
                className="absolute inset-0 h-full w-full -rotate-90"
                viewBox="0 0 120 120"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="workGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF6B35" />
                    <stop offset="100%" stopColor="#FFA94D" />
                  </linearGradient>
                </defs>
                {/* Track */}
                <circle
                  cx="60"
                  cy="60"
                  r={ringRadius}
                  fill="none"
                  stroke="#2C2C30"
                  strokeWidth="9"
                />
                {/* Progress arc */}
                <circle
                  cx="60"
                  cy="60"
                  r={ringRadius}
                  fill="none"
                  stroke={tone.useGradient ? 'url(#workGradient)' : tone.ringColor}
                  strokeLinecap="round"
                  strokeWidth="9"
                  style={{
                    strokeDasharray: ringCircumference,
                    strokeDashoffset: ringOffset,
                    transition: 'stroke-dashoffset 1000ms linear',
                    filter: `drop-shadow(0 0 6px ${tone.useGradient ? '#FF6B35' : tone.ringColor}90)`,
                  }}
                />
              </svg>

              {/* Timer inside ring */}
              <div className="z-10 grid place-items-center text-center">
                <p className="m-0 mb-1 text-[0.58rem] font-black tracking-[0.22em] uppercase text-[#A0A0A5]">
                  {isRest ? 'REST' : isCountdown ? 'READY' : '残り'}
                </p>
                <p
                  className={`m-0 font-bebas leading-none tabular-nums${isWarning ? ' pulse-warning' : ''}`}
                  style={{
                    fontSize: 'clamp(3.8rem, 19vw, 6.5rem)',
                    color: tone.phaseColor,
                    textShadow: `0 0 40px ${tone.phaseColor}55`,
                  }}
                  aria-label={isRest ? '休憩終了までの残り時間' : '残り時間'}
                >
                  {formatCountdown(displayRemainingSec)}
                </p>
              </div>
            </div>
          </div>

          {/* Current item + prev/next navigation */}
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <button
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[#3C3C42] bg-[#2C2C30] text-2xl font-black text-[#A0A0A5] transition active:scale-95 disabled:opacity-25"
              onClick={onPrevious}
              disabled={!previous}
              aria-label="前の種目へ移動"
            >
              ‹
            </button>
            <div className="min-w-0 text-center">
              <p className="m-0 text-[0.6rem] font-black tracking-[0.15em] uppercase text-[#A0A0A5]">
                {isRest ? 'INTERVAL' : isCountdown ? 'NEXT UP' : 'WORKOUT'}
              </p>
              <p className="m-0 truncate text-lg font-black leading-tight text-[#F5F5F5]">
                {isCountdown ? (current?.title ?? 'なし') : (current?.title ?? '—')}
              </p>
              {!isCountdown && next && (
                <p className="m-0 mt-0.5 truncate text-xs text-[#A0A0A5]">NEXT: {next.title}</p>
              )}
            </div>
            <button
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[#3C3C42] bg-[#2C2C30] text-2xl font-black text-[#A0A0A5] transition active:scale-95 disabled:opacity-25"
              onClick={onNext}
              disabled={!(isCountdown ? current : next)}
              aria-label="次の種目へ移動"
            >
              ›
            </button>
          </div>

          {/* 後回しボタン / 確認ダイアログ */}
          {currentIsWorkout && onDefer && (
            showDeferConfirm ? (
              <div
                role="dialog"
                aria-label="後回しにしますか？"
                className="grid gap-3 rounded-xl border border-[#FF6B3530] bg-[#FF6B3508] p-4"
              >
                <div className="grid gap-1">
                  <p className="m-0 text-sm font-black text-[#F5F5F5]">後回しにしますか？</p>
                  <p className="m-0 text-sm text-[#D0D0D5]">
                    「{currentGroup?.baseTitle}」の残り {remainingSets} セットを末尾に移動します。
                  </p>
                  {nextGroup && (
                    <p className="m-0 text-sm text-[#D0D0D5]">
                      次は「{nextGroup.baseTitle}」から続けます。
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="rounded-xl bg-[#FF6B35] py-2.5 text-sm font-black text-[#F5F5F5] transition active:scale-[0.97]"
                    onClick={() => { onDefer(); setShowDeferConfirm(false); }}
                  >
                    後回しにする
                  </button>
                  <button
                    className="rounded-xl border border-[#3C3C42] py-2.5 text-sm font-bold text-[#A0A0A5] transition active:scale-[0.97]"
                    onClick={() => setShowDeferConfirm(false)}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <button
                aria-label="後回し"
                className="flex w-full items-center justify-between rounded-xl border border-[#FF6B3530] bg-[#FF6B3508] px-4 py-3 text-sm font-bold text-[#FF6B35] transition active:scale-[0.97]"
                onClick={() => setShowDeferConfirm(true)}
              >
                <span>後回し</span>
                <span className="text-xs font-normal text-[#A0A0A5]">別の種目を先にやる →</span>
              </button>
            )
          )}

          {/* Schedule delta */}
          <div
            className="rounded-xl px-3 py-2 text-center text-sm font-black tracking-wide"
            style={{
              backgroundColor: isLate ? '#EF444415' : '#4ADE8015',
              color: isLate ? '#EF4444' : '#4ADE80',
            }}
          >
            {scheduleDeltaLabel}
          </div>

          {/* Controls slot (pause/resume/start from TimerPage) */}
          {controls}
        </div>
      )}

      {/* Progress bar — always visible */}
      <div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-[#2C2C30]"
          aria-label="全体進捗"
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #FF6B35, #FFA94D)',
            }}
          />
        </div>
        <p className="m-0 mt-1.5 text-center text-xs font-bold tracking-wider text-[#A0A0A5]">
          {Math.min(state.currentIndex + 1, routine.items.length)} / {routine.items.length}
        </p>
      </div>

      {/* Item queue */}
      <div className="rounded-xl bg-[#2C2C30] p-3" role="region" aria-label="現在の位置">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="m-0 text-[0.6rem] font-black tracking-[0.2em] uppercase text-[#A0A0A5]">
            QUEUE
          </h2>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-bold"
            style={{ backgroundColor: '#FF6B3520', color: '#FF6B35' }}
          >
            {progress}%
          </span>
        </div>
        <div className="max-h-48 overflow-y-auto grid gap-1.5">
          {groups.map((group) => {
            const isSelected = selectedGroupStart === group.itemStart;
            return (
              <div
                key={group.itemStart}
                data-group={group.itemStart}
                ref={group.status === 'current' ? currentItemRef : null}
                className="rounded-xl px-2.5 py-2 text-sm transition"
                style={{
                  backgroundColor:
                    group.status === 'current'
                      ? '#FF6B3512'
                      : group.status === 'done'
                        ? '#FFFFFF06'
                        : isSelected
                          ? '#FFFFFF14'
                          : '#FFFFFF08',
                  border: `1px solid ${group.status === 'current' ? '#FF6B3535' : isSelected ? '#FF6B3540' : '#3C3C42'}`,
                  cursor: group.status === 'upcoming' ? 'pointer' : 'default',
                }}
                onClick={group.status === 'upcoming' ? () => handleGroupTap(group.itemStart) : undefined}
              >
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-black"
                    style={{
                      backgroundColor:
                        group.status === 'current'
                          ? '#FF6B35'
                          : group.status === 'done'
                            ? '#3C3C42'
                            : '#1E1E21',
                      color:
                        group.status === 'current'
                          ? '#F5F5F5'
                          : group.status === 'done'
                            ? '#4ADE80'
                            : '#A0A0A5',
                    }}
                  >
                    {group.status === 'done' ? '✓' : group.status === 'current' ? '→' : '·'}
                  </span>
                  <div className="min-w-0">
                    <span
                      className={`truncate font-bold ${group.status === 'current' ? 'text-[#F5F5F5]' : group.status === 'done' ? 'text-[#A0A0A5]' : 'text-[#D0D0D5]'}`}
                    >
                      {group.baseTitle}
                      {group.setCount > 1 && (
                        <span className="ml-1.5 text-xs font-bold text-[#A0A0A5]">
                          × {group.setCount}
                        </span>
                      )}
                    </span>
                    {group.status === 'current' && group.setCount > 1 && (
                      <p className="m-0 text-[0.6rem] font-bold text-[#A0A0A5]">
                        {group.completedSets}/{group.setCount} セット完了
                      </p>
                    )}
                    {group.restSec > 0 && (
                      <p className="m-0 text-[0.6rem] font-normal text-[#6C6C72]">
                        {group.setCount > 1
                          ? `(${formatSubtextSec(group.perSetSec)} ＋ 休憩 ${formatSubtextSec(group.restSec)}) × ${group.setCount}`
                          : `${formatSubtextSec(group.perSetSec)} ＋ 休憩 ${formatSubtextSec(group.restSec)}`}
                      </p>
                    )}
                  </div>
                  <span
                    className="shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold"
                    style={{ backgroundColor: '#FF6B3515', color: '#FF6B35' }}
                  >
                    {formatClockDurationSec(group.totalSec)}
                  </span>
                </div>
                {isSelected && onDoNext && (
                  <div className="mt-2">
                    <button
                      className="w-full rounded-xl bg-[#FF6B35] py-1.5 text-xs font-black text-[#F5F5F5] transition active:scale-[0.97]"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDoNext(group.itemStart);
                      }}
                    >
                      次にやる
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Queue group helpers ─────────────────────────────────────────────────────

type ExerciseGroup = {
  baseTitle: string;
  setCount: number;
  totalSec: number;
  perSetSec: number;
  restSec: number;
  completedSets: number;
  status: 'done' | 'current' | 'upcoming';
  itemStart: number;
  itemEnd: number;
};

function buildGroups(
  items: RoutineItem[],
  currentIndex: number,
  isFinished: boolean,
): ExerciseGroup[] {
  const groups: ExerciseGroup[] = [];
  let i = 0;

  while (i < items.length) {
    const item = items[i];
    if (item.type !== 'workout') {
      i++;
      continue;
    }

    const { start, end } = getExerciseGroupRange(items, i);
    const workoutItems = items.slice(start, end + 1).filter((it) => it.type === 'workout');
    const intervalItems = items.slice(start, end + 1).filter((it) => it.type === 'interval');
    const totalSec = items.slice(start, end + 1).reduce((sum, it) => sum + it.durationSec, 0);
    const perSetSec = workoutItems[0]?.durationSec ?? 0;
    const restSec = intervalItems[0]?.durationSec ?? 0;

    let status: ExerciseGroup['status'];
    let completedSets: number;

    if (isFinished || currentIndex > end) {
      status = 'done';
      completedSets = workoutItems.length;
    } else if (currentIndex >= start && currentIndex <= end) {
      status = 'current';
      completedSets = items
        .slice(start, currentIndex)
        .filter((it) => it.type === 'workout').length;
    } else {
      status = 'upcoming';
      completedSets = 0;
    }

    groups.push({
      baseTitle: getBaseTitle(item.title),
      setCount: workoutItems.length,
      totalSec,
      perSetSec,
      restSec,
      completedSets,
      status,
      itemStart: start,
      itemEnd: end,
    });

    i = end + 1;
  }

  return groups;
}

function formatSubtextSec(sec: number): string {
  if (sec < 60) return `${sec}秒`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m}分`;
}

function formatClockDurationSec(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m}:00`;
}

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatFinishedMessage(seconds: number): {
  prefix: string;
  delta: string;
  suffix: string;
} {
  if (seconds === 0) {
    return { prefix: '予定通りに', delta: '', suffix: 'トレーニングを完了しました' };
  }
  const absoluteSeconds = Math.abs(seconds);
  const minutes = Math.floor(absoluteSeconds / 60);
  const restSeconds = absoluteSeconds % 60;
  const duration = minutes > 0 ? `${minutes}分${restSeconds}秒` : `${restSeconds}秒`;
  return {
    prefix: '予定より',
    delta: duration,
    suffix: seconds > 0 ? '遅くトレーニングを完了しました' : '早くトレーニングを完了しました',
  };
}

type TimerToneInput = {
  isFinished: boolean;
  isLate: boolean;
  isRest: boolean;
  isCountdown: boolean;
  isWarning: boolean;
};

function getTimerTone({ isFinished, isLate, isRest, isCountdown, isWarning }: TimerToneInput) {
  if (isFinished) {
    return {
      label: isLate ? '完了' : '完了',
      ringColor: isLate ? '#EF4444' : '#4ADE80',
      useGradient: false,
      phaseColor: isLate ? '#EF4444' : '#4ADE80',
    };
  }
  if (isWarning) {
    return {
      label: isRest ? 'REST' : 'WORKOUT',
      ringColor: '#FFC107',
      useGradient: false,
      phaseColor: '#FFC107',
    };
  }
  if (isRest) {
    return {
      label: 'REST',
      ringColor: '#4ADE80',
      useGradient: false,
      phaseColor: '#4ADE80',
    };
  }
  if (isCountdown) {
    return {
      label: 'READY',
      ringColor: '#FF6B35',
      useGradient: true,
      phaseColor: '#FF6B35',
    };
  }
  return {
    label: 'WORKOUT',
    ringColor: '#FF6B35',
    useGradient: true,
    phaseColor: '#FF6B35',
  };
}


const CONFETTI_PIECES: Array<{
  x: number;
  color: string;
  w: number;
  h: number;
  delay: number;
  dur: number;
}> = [
  { x: 3, color: '#FF6B35', w: 10, h: 6, delay: 0, dur: 2.6 },
  { x: 10, color: '#FFC107', w: 8, h: 8, delay: 0.1, dur: 2.9 },
  { x: 18, color: '#4ADE80', w: 12, h: 5, delay: 0.25, dur: 2.4 },
  { x: 26, color: '#FFA94D', w: 9, h: 7, delay: 0.05, dur: 3.0 },
  { x: 33, color: '#FF6B35', w: 7, h: 9, delay: 0.35, dur: 2.7 },
  { x: 41, color: '#FFC107', w: 11, h: 6, delay: 0.15, dur: 2.5 },
  { x: 48, color: '#4ADE80', w: 8, h: 8, delay: 0.4, dur: 2.8 },
  { x: 55, color: '#FFA94D', w: 10, h: 5, delay: 0.08, dur: 3.1 },
  { x: 62, color: '#4ADE80', w: 9, h: 7, delay: 0.3, dur: 2.6 },
  { x: 70, color: '#FF6B35', w: 12, h: 6, delay: 0.2, dur: 2.9 },
  { x: 77, color: '#FFC107', w: 8, h: 9, delay: 0.45, dur: 2.4 },
  { x: 84, color: '#FFA94D', w: 10, h: 6, delay: 0.12, dur: 2.7 },
  { x: 91, color: '#4ADE80', w: 7, h: 8, delay: 0.28, dur: 3.0 },
  { x: 97, color: '#FFC107', w: 11, h: 5, delay: 0.18, dur: 2.5 },
  { x: 7, color: '#FF6B35', w: 9, h: 7, delay: 0.5, dur: 2.8 },
  { x: 22, color: '#4ADE80', w: 8, h: 6, delay: 0.38, dur: 2.6 },
  { x: 37, color: '#FFA94D', w: 10, h: 8, delay: 0.22, dur: 3.2 },
  { x: 52, color: '#FFC107', w: 7, h: 7, delay: 0.55, dur: 2.7 },
  { x: 67, color: '#4ADE80', w: 11, h: 5, delay: 0.32, dur: 2.9 },
  { x: 82, color: '#FF6B35', w: 9, h: 9, delay: 0.42, dur: 2.5 },
];

function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {CONFETTI_PIECES.map((piece, i) => (
        <div
          key={i}
          className="absolute top-0 rounded-sm"
          style={{
            left: `${piece.x}%`,
            width: piece.w,
            height: piece.h,
            backgroundColor: piece.color,
            animation: `confetti-drop ${piece.dur}s ease-in ${piece.delay}s both`,
          }}
        />
      ))}
    </div>
  );
}
