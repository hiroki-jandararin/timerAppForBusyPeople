import type { Routine, RoutineItem } from '../features/routines/routineTypes';
import type { TimerState } from '../features/timer/timerTypes';

type Props = {
  routine: Routine;
  state: TimerState;
};

export function TimerDisplay({ routine, state }: Props) {
  const current = routine.items[state.currentIndex];
  const next = routine.items[state.currentIndex + 1];
  const completed = state.status === 'finished' ? routine.items.length : state.currentIndex;
  const progress = routine.items.length === 0 ? 0 : Math.round((completed / routine.items.length) * 100);
  const isCountdown = state.status === 'countdown';
  const displayRemainingSec = state.status === 'idle' ? current?.durationSec ?? 0 : state.remainingSec;
  const visibleItems = getVisibleItems(routine.items, state.currentIndex);

  return (
    <section className="my-4 grid content-center gap-3 rounded-lg border border-[#f1c29b] bg-[#fffdfa] p-4 py-8 text-center shadow-xl shadow-[#d96a1f]/10">
      <p className={`m-0 mx-auto mb-2 rounded-lg border px-4 py-2 text-sm font-bold ${isCountdown ? 'border-[#f5a568] bg-[#fff0df] text-[#b84b12]' : 'border-[#f4d0b3] bg-[#fff7ef] text-[#8a4b23]'}`}>{isCountdown ? 'カウントダウン' : formatType(current)}</p>
      <h1 className="m-0 text-[clamp(2rem,12vw,4rem)] font-black leading-[1.05]">{isCountdown ? '開始まで' : state.status === 'finished' ? '完了' : current?.title ?? 'カードなし'}</h1>
      <div className="text-[clamp(6rem,34vw,12rem)] font-black leading-[0.95] text-[#e95f1a]" aria-label="残り秒数">{displayRemainingSec}</div>
      <p className="m-0 rounded-lg bg-[#fff7ef] px-3 py-2 text-base font-bold text-[#6d5a4d]">{isCountdown ? `最初: ${current?.title ?? 'なし'}` : `次: ${next?.title ?? 'なし'}`}</p>
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

function getVisibleItems(items: RoutineItem[], currentIndex: number): Array<{ item: RoutineItem; index: number }> {
  const start = Math.max(0, currentIndex - 1);
  const end = Math.min(items.length, currentIndex + 4);
  return items.slice(start, end).map((item, offset) => ({
    item,
    index: start + offset,
  }));
}
