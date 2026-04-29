import { calculateTotalDuration } from '../features/routines/routineOperations';
import type { Routine } from '../features/routines/routineTypes';

type Props = {
  routine: Routine;
  onStart: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function RoutineCard({ routine, onStart, onEdit, onDuplicate, onDelete }: Props) {
  const total = calculateTotalDuration(routine);
  const workoutTotal = calculateTypeDuration(routine, 'workout');
  const intervalTotal = calculateTypeDuration(routine, 'interval');
  const buttonBase = 'min-h-12 rounded-lg border px-3 font-bold shadow-sm transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50';
  const neutralButton = `${buttonBase} border-[#efc4a2] bg-[#fffdfa] text-[#241710]`;
  const primaryButton = `${buttonBase} border-[#e45112] bg-[#e95f1a] text-white shadow-[#f26a21]/25`;
  const dangerButton = `${buttonBase} border-[#c8332c] bg-[#fffdfa] text-[#c8332c]`;
  return (
    <article className="overflow-hidden rounded-lg border border-[#f1c29b] bg-[#fffdfa] shadow-lg shadow-[#d96a1f]/10">
      <div className="h-2 bg-[#f26a21]" />
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-wide text-[#c24f13]">Routine</p>
            <h2 className="m-0 text-2xl font-black leading-tight">{routine.name}</h2>
          </div>
          <div className="shrink-0 rounded-full border border-[#f5a568] bg-[#fff0df] px-3 py-1.5 text-sm font-black text-[#b84b12] shadow-sm shadow-[#f26a21]/10">
            {formatDuration(total)}
          </div>
        </div>
        <div className="rounded-lg border border-[#f1c29b] bg-[#fff7ef] p-2">
          <div className="mb-2 flex items-center justify-between text-xs font-black text-[#8a4b23]">
            <span>TIME BALANCE</span>
            <span>{routine.items.length} cards</span>
          </div>
          <div className="mb-2 flex h-2 overflow-hidden rounded-full bg-[#ead8c7]">
            <div className="bg-[#f26a21]" style={{ width: `${calculateRatio(workoutTotal, total)}%` }} />
            <div className="bg-[#2a9d8f]" style={{ width: `${calculateRatio(intervalTotal, total)}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SummaryPill label="ワークアウト" value={formatDuration(workoutTotal)} tone="workout" />
            <SummaryPill label="インターバル" value={formatDuration(intervalTotal)} tone="interval" />
          </div>
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <button className={primaryButton} onClick={onStart} disabled={routine.items.length === 0}>
            開始
          </button>
          <button className={neutralButton} onClick={onEdit}>編集</button>
          <button className={neutralButton} onClick={onDuplicate}>複製</button>
          <button className={dangerButton} onClick={onDelete}>削除</button>
        </div>
      </div>
    </article>
  );
}

function SummaryPill({ label, value, tone }: { label: string; value: string; tone: 'workout' | 'interval' }) {
  const toneClass = {
    workout: 'border-[#f1c29b] bg-[#fffdfa] text-[#b84b12]',
    interval: 'border-[#77c8bf] bg-[#fffdfa] text-[#12675d]',
  }[tone];

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <div className="text-[10px] font-black leading-tight">{label}</div>
      <div className="mt-1 text-base font-black leading-tight">{value}</div>
    </div>
  );
}

function calculateTypeDuration(routine: Routine, type: 'workout' | 'interval'): number {
  return routine.items
    .filter((item) => item.type === type)
    .reduce((total, item) => total + item.durationSec, 0);
}

function calculateRatio(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return min > 0 ? `${min}分${sec}秒` : `${sec}秒`;
}
