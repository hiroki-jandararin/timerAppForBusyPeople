import { useState } from 'react';
import {
  calculateTargetDifference,
  calculateTotalDuration,
  formatClockDuration,
  formatSignedDifference,
  getTargetDuration,
} from '../features/routines/routineTime';
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
  const targetDuration = getTargetDuration(routine);
  const targetDifference = calculateTargetDifference(routine);
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
        <div className="mb-3 grid grid-cols-[1fr_auto] items-start gap-2">
          <h2 className="m-0 min-w-0 text-xl font-black leading-tight">{routine.name}</h2>
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
        <div className="mb-3 grid gap-2 rounded-lg border border-[#f5a568] bg-[#fff0df] p-3 shadow-sm shadow-[#f26a21]/10">
          <div className="flex items-end justify-between gap-3">
            <span className="text-sm font-bold text-[#8a4b23]">予定時間</span>
            <span className="text-3xl font-black leading-none text-[#b84b12]">
              {formatClockDuration(total)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm font-bold">
            <div className="rounded-lg bg-[#fffdfa] px-3 py-2 text-[#6d5a4d]">
              目標 {targetDuration === null ? '未設定' : formatClockDuration(targetDuration)}
            </div>
            <div
              className={`rounded-lg px-3 py-2 ${
                targetDifference === null || targetDifference >= 0
                  ? 'bg-[#eef8ef] text-[#2d6b2c]'
                  : 'bg-[#fff0ee] text-[#9c211b]'
              }`}
            >
              {targetDifference === null ? '差分 未設定' : formatSignedDifference(targetDifference)}
            </div>
          </div>
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
