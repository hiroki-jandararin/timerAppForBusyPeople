import type { Routine, RoutineItem } from '../features/routines/routineTypes';
import type { TimerState } from '../features/timer/timerTypes';

type Props = {
  routine: Routine;
  state: TimerState;
  plannedEndLabel: string;
  scheduleDeltaLabel: string;
  scheduleDeltaSec: number;
};

export function TimerDisplay({
  routine,
  state,
  plannedEndLabel,
  scheduleDeltaLabel,
  scheduleDeltaSec,
}: Props) {
  const current = routine.items[state.currentIndex];
  const next = routine.items[state.currentIndex + 1];
  const completed = state.status === 'finished' ? routine.items.length : state.currentIndex;
  const progress = routine.items.length === 0 ? 0 : Math.round((completed / routine.items.length) * 100);
  const isCountdown = state.status === 'countdown';
  const isRest = !isCountdown && current?.type === 'interval' && state.status !== 'finished';
  const isFinished = state.status === 'finished';
  const isLate = scheduleDeltaSec > 0;
  const displayRemainingSec = state.status === 'idle' ? current?.durationSec ?? 0 : state.remainingSec;
  const visibleItems = getVisibleItems(routine.items, state.currentIndex);
  const action = getActionMessage(state, current, next);
  const tone = getTimerTone({ isFinished, isLate, isRest, isCountdown });
  const resultMessage = formatFinishedMessage(scheduleDeltaSec);
  const currentDurationSec = current?.durationSec ?? displayRemainingSec;
  const remainingRatio =
    currentDurationSec <= 0 ? 0 : Math.max(0, Math.min(1, displayRemainingSec / currentDurationSec));
  const ringRadius = 54;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - remainingRatio);

  return (
    <section className="my-4 grid content-center gap-3 rounded-lg border border-[#f1c29b] bg-[#fffdfa] p-4 py-5 text-center shadow-xl shadow-[#d96a1f]/10">
      {isFinished ? (
        <div className={`grid gap-4 rounded-lg border p-4 text-center ${tone.panelClass}`}>
          <div className="flex items-center justify-between gap-3 text-left">
            <p className="m-0 rounded-lg bg-white/75 px-3 py-1 text-sm font-black">{tone.label}</p>
            <p className="m-0 text-sm font-black">終了 {plannedEndLabel}</p>
          </div>
          <div className="grid min-h-[240px] content-center gap-3 rounded-lg bg-white/75 px-4 py-6">
            <p className="m-0 text-sm font-black opacity-75">結果</p>
            <p className="m-0 text-center text-[clamp(1.8rem,7vw,3.2rem)] font-black leading-[1.18]">
              {resultMessage.prefix}
              <span className="inline-block whitespace-nowrap text-[clamp(2.3rem,9vw,4.4rem)] leading-none">
                {resultMessage.delta}
              </span>
              {resultMessage.suffix}
            </p>
          </div>
        </div>
      ) : (
      <div className={`grid gap-4 rounded-lg border p-4 text-left ${tone.panelClass}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 rounded-lg bg-white/75 px-3 py-1 text-sm font-black">{tone.label}</p>
          <p className="m-0 text-sm font-black">終了 {plannedEndLabel}</p>
        </div>
        <div>
          <p className="m-0 text-sm font-black opacity-85">今すぐ</p>
          <p className="m-0 mt-1 text-[clamp(1.8rem,8vw,3.4rem)] font-black leading-tight">{action}</p>
        </div>
        <div className="grid justify-items-center gap-3">
          <div className="relative grid aspect-square w-full max-w-[360px] place-items-center" aria-label="現在カードの残り時間ゲージ">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                <circle
                  cx="60"
                  cy="60"
                  r={ringRadius}
                  fill="none"
                  stroke={tone.trackColor}
                  strokeWidth="9"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={ringRadius}
                  fill="none"
                  stroke={tone.ringColor}
                  strokeLinecap="round"
                  strokeWidth="9"
                  style={{
                    strokeDasharray: ringCircumference,
                    strokeDashoffset: ringOffset,
                    transition: 'stroke-dashoffset 1000ms linear',
                  }}
                />
              </svg>
              <div
                className="z-10 grid aspect-square w-[78%] place-items-center rounded-full p-4 text-center shadow-inner shadow-black/5"
                style={{ backgroundColor: tone.innerColor }}
              >
                <p className="m-0 text-xs font-black opacity-75">
                  {isRest ? '休憩終了まで' : isCountdown ? '開始まで' : '残り'}
                </p>
                <p
                  className="m-0 text-[clamp(5.6rem,30vw,10rem)] font-black leading-[0.9]"
                  aria-label={isRest ? '休憩終了までの残り秒数' : '残り秒数'}
                >
                  {displayRemainingSec}
                </p>
                <p className="m-0 text-sm font-black opacity-80">秒</p>
              </div>
            </div>
          <div className="grid w-full gap-1 rounded-lg bg-white/75 px-3 py-3 text-center">
            <p className="m-0 text-xs font-black opacity-75">
              {isRest ? 'レスト' : formatType(current)}
            </p>
            <p className="m-0 text-[clamp(1.8rem,8vw,3.2rem)] font-black leading-tight">
              {isCountdown ? current?.title ?? 'なし' : current?.title ?? 'カードなし'}
            </p>
          </div>
        </div>
        <div className="grid gap-1 rounded-lg bg-white/75 px-3 py-2">
          <p className="m-0 text-xs font-black opacity-75">次</p>
          <p className="m-0 text-xl font-black leading-tight">
            {isCountdown ? current?.title ?? 'なし' : next?.title ?? 'なし'}
          </p>
        </div>
        <div className={`rounded-lg bg-white/75 px-3 py-2 text-center text-2xl font-black leading-tight ${isLate ? 'text-[#9c211b]' : 'text-[#2d6b2c]'}`}>
          {scheduleDeltaLabel}
        </div>
      </div>
      )}

      <div className="h-4 overflow-hidden rounded-full bg-[#f5d4bb] shadow-inner" aria-label="全体進捗">
        <div className="h-full rounded-full bg-[#f26a21]" style={{ width: `${progress}%` }} />
      </div>
      <p className="m-0 text-sm font-bold text-[#8a4b23]">
        {Math.min(state.currentIndex + 1, routine.items.length)} / {routine.items.length}
      </p>
      <div className="mt-3 rounded-lg border border-[#f1c29b] bg-[#fff7ef] p-3 text-left" aria-label="現在の位置">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="m-0 text-sm font-bold text-[#8a4b23]">現在の位置</h2>
          <span className="rounded-full bg-[#f26a21] px-2.5 py-1 text-xs font-bold text-white">{progress}%</span>
        </div>
      <div className="grid gap-2">
          {visibleItems.map(({ item, index }) => {
            const isCurrent = state.status !== 'finished' && index === state.currentIndex;
            const isDone = state.status === 'finished' || index < state.currentIndex;
            return (
              <div
                key={item.id}
                className={`grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${
                  isCurrent
                    ? 'border-[#e45112] bg-[#ffead8] text-[#241710] shadow-sm shadow-[#f26a21]/20'
                    : isDone
                      ? 'border-[#ead8c7] bg-[#fffdfa] text-[#8a7465]'
                      : 'border-[#ead8c7] bg-white text-[#4b392e]'
                }`}
                >
                <span className={`grid h-6 w-6 place-items-center rounded-lg text-xs ${isCurrent ? 'bg-[#f26a21] font-black text-white' : isDone ? 'bg-[#d8e2e8] font-bold text-[#5c7485]' : 'bg-[#fff0df] font-bold text-[#b84b12]'}`}>
                  {isDone ? '✓' : index + 1}
                </span>
                <span className={`truncate ${isCurrent ? 'font-black' : 'font-medium'}`}>{item.title}</span>
                <span className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${item.type === 'interval' ? 'border-[#cfd9e0] bg-[#f1f5f8] text-[#577082]' : 'border-[#f5a568] bg-[#fffdfa] text-[#b84b12]'}`}>{item.durationSec}秒</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function formatType(item: RoutineItem | undefined): string {
  if (!item) return '';
  return item.type === 'workout' ? 'ワークアウト' : 'インターバル';
}

function getActionMessage(
  state: TimerState,
  current: RoutineItem | undefined,
  next: RoutineItem | undefined,
): string {
  if (state.status === 'idle') return '開始ボタンを押す';
  if (state.status === 'countdown') return `${current?.title ?? '最初の種目'}の準備`;
  if (state.status === 'paused') return '再開して予定を守る';
  if (state.status === 'finished') return '完了。結果を確認する';
  if (!current) return 'カードを追加する';
  if (current.type === 'interval') return `${next?.title ?? '次の種目'}に備える`;
  return `${current.title}を続ける`;
}

function formatFinishedMessage(seconds: number): { prefix: string; delta: string; suffix: string } {
  if (seconds === 0) {
    return {
      prefix: '予定通りに',
      delta: '',
      suffix: 'トレーニングを完了しました',
    };
  }
  const absoluteSeconds = Math.abs(seconds);
  const minutes = Math.floor(absoluteSeconds / 60);
  const restSeconds = absoluteSeconds % 60;
  const duration =
    minutes > 0 ? `${minutes}分${restSeconds}秒` : `${restSeconds}秒`;
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
};

function getTimerTone({ isFinished, isLate, isRest, isCountdown }: TimerToneInput) {
  if (isFinished) {
    return {
      label: '完了',
      ringColor: isLate ? '#a9211b' : '#2d6b2c',
      trackColor: isLate ? '#fff0ee' : '#eef8ef',
      innerColor: isLate ? '#fff0ee' : '#eef8ef',
      panelClass: isLate
        ? 'border-[#f0b3a2] bg-[#fff0ee] text-[#9c211b]'
        : 'border-[#b6d9b4] bg-[#eef8ef] text-[#2d6b2c]',
    };
  }
  if (isLate) {
    return {
      label: '遅れ',
      ringColor: '#a9211b',
      trackColor: '#fff0ee',
      innerColor: '#fff0ee',
      panelClass: 'border-[#f0b3a2] bg-[#fff0ee] text-[#9c211b]',
    };
  }
  if (isCountdown) {
    return {
      label: '準備',
      ringColor: '#d95f1a',
      trackColor: '#fff0df',
      innerColor: '#fff0df',
      panelClass: 'border-[#f5a568] bg-[#fff0df] text-[#b84b12]',
    };
  }
  if (isRest) {
    return {
      label: 'レスト',
      ringColor: '#577082',
      trackColor: '#f1f5f8',
      innerColor: '#f1f5f8',
      panelClass: 'border-[#cfd9e0] bg-[#f1f5f8] text-[#577082]',
    };
  }
  return {
    label: 'ワークアウト',
    ringColor: '#e95f1a',
    trackColor: '#fff0df',
    innerColor: '#fff0df',
    panelClass: 'border-[#f5a568] bg-[#fff0df] text-[#b84b12]',
  };
}

function getVisibleItems(items: RoutineItem[], currentIndex: number): Array<{ item: RoutineItem; index: number }> {
  const start = Math.max(0, currentIndex - 1);
  const end = Math.min(items.length, currentIndex + 4);
  return items.slice(start, end).map((item, offset) => ({
    item,
    index: start + offset,
  }));
}
