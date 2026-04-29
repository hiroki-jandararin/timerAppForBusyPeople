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

  return (
    <section className="my-4 grid content-center gap-3 rounded-lg border border-[#f1c29b] bg-[#fffdfa] px-4 py-8 text-center shadow-xl shadow-[#d96a1f]/10">
      <p className="m-0 mx-auto mb-1.5 rounded-full bg-[#fff0df] px-4 py-1.5 font-extrabold text-[#b84b12]">{isCountdown ? 'カウントダウン' : formatType(current)}</p>
      <h1 className="m-0 text-[clamp(2rem,12vw,4rem)] font-black leading-[1.05]">{isCountdown ? '開始まで' : state.status === 'finished' ? '完了' : current?.title ?? 'カードなし'}</h1>
      <div className="text-[clamp(6rem,34vw,12rem)] font-black leading-[0.95] text-[#e95f1a]" aria-label="残り秒数">{state.remainingSec}</div>
      <p className="m-0 rounded-lg bg-[#fff7ef] px-3 py-2 text-xl font-extrabold">{isCountdown ? `最初: ${current?.title ?? 'なし'}` : `次: ${next?.title ?? 'なし'}`}</p>
      <div className="h-4 overflow-hidden rounded-full bg-[#f5d4bb] shadow-inner" aria-label="全体進捗">
        <div className="h-full rounded-full bg-[#f26a21]" style={{ width: `${progress}%` }} />
      </div>
      <p className="m-0 font-extrabold text-[#8a4b23]">
        {Math.min(state.currentIndex + 1, routine.items.length)} / {routine.items.length}
      </p>
    </section>
  );
}

function formatType(item: RoutineItem | undefined): string {
  if (!item) return '';
  return item.type === 'workout' ? 'ワークアウト' : 'インターバル';
}
