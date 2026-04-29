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
  const buttonBase = 'min-h-12 rounded-lg border px-3 font-bold shadow-sm transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50';
  const neutralButton = `${buttonBase} border-[#efc4a2] bg-[#fffdfa] text-[#241710]`;
  const primaryButton = `${buttonBase} border-[#e45112] bg-[#e95f1a] text-white shadow-[#f26a21]/25`;
  const dangerButton = `${buttonBase} border-[#c8332c] bg-[#fffdfa] text-[#c8332c]`;
  return (
    <article className="overflow-hidden rounded-lg border border-[#f1c29b] bg-[#fffdfa] shadow-lg shadow-[#d96a1f]/10">
      <div className="h-2 bg-[#f26a21]" />
      <div className="p-4">
        <h2 className="mb-1.5 text-2xl font-bold leading-tight">{routine.name}</h2>
        <p className="m-0 inline-flex rounded-full bg-[#fff0df] px-3 py-1 text-sm font-extrabold text-[#b84b12]">
          {routine.items.length}カード / {formatDuration(total)}
        </p>
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

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return min > 0 ? `${min}分${sec}秒` : `${sec}秒`;
}
