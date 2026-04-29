import { useState } from 'react';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const total = calculateTotalDuration(routine);
  const buttonBase = 'rounded-lg border font-bold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50';
  const primaryButton = `${buttonBase} min-h-[58px] border-[#e45112] bg-[#e95f1a] px-4 text-lg text-white shadow-sm shadow-[#f26a21]/15`;
  const menuButton = `${buttonBase} min-h-10 border-[#efc4a2] bg-[#fffdfa] px-3 text-[#6d5a4d] shadow-sm`;
  const editButton = `${buttonBase} min-h-10 border-[#efc4a2] bg-[#fffdfa] px-3 text-sm text-[#241710] shadow-sm`;
  const duplicateButton = `${buttonBase} min-h-10 border-[#efc4a2] bg-[#fffdfa] px-3 text-sm text-[#6d5a4d]`;
  const dangerButton = `${buttonBase} min-h-10 border-[#e7b6b3] bg-[#fff7f6] px-3 text-sm text-[#a83a34]`;
  return (
    <article className="overflow-hidden rounded-lg border border-[#f4d0b3] bg-[#fffdfa] shadow-sm shadow-[#d96a1f]/5">
      <div className="h-1 bg-[#f26a21]" />
      <div className="p-4">
        <div className="mb-3 grid grid-cols-[1fr_auto_auto] items-start gap-2">
          <h2 className="m-0 min-w-0 text-xl font-black leading-tight">{routine.name}</h2>
          <div className="grid min-h-10 shrink-0 place-items-center rounded-lg border border-[#f5a568] bg-[#fff0df] px-3 text-sm font-bold text-[#b84b12] shadow-sm shadow-[#f26a21]/10">
            {formatCompactDuration(total)}
          </div>
          <button
            type="button"
            className={`${menuButton} w-10 px-0`}
            onClick={() => setIsMenuOpen((current) => !current)}
            aria-label="ルーティン操作メニュー"
            aria-expanded={isMenuOpen}
          >
            …
          </button>
        </div>
        <div className="mt-3 grid gap-2">
          <button className={primaryButton} onClick={onStart} disabled={routine.items.length === 0}>
            開始
          </button>
          {isMenuOpen && (
            <div className="grid gap-2 border-t border-[#f1e1d4] pt-2">
              <button className={editButton} onClick={onEdit}>編集</button>
              <div className="grid grid-cols-2 gap-2">
                <button className={duplicateButton} onClick={onDuplicate}>複製</button>
                <button className={dangerButton} onClick={onDelete}>削除</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function formatCompactDuration(seconds: number): string {
  if (seconds % 60 === 0) return `${seconds / 60}分`;
  return formatDuration(seconds);
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return min > 0 ? `${min}分${sec}秒` : `${sec}秒`;
}
