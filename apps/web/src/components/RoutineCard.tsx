import { useState } from 'react';
import { calculateTotalDuration, formatClockDuration } from '@timeapp/core';
import type { Routine } from '@timeapp/core';

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
  const workoutCount = routine.items.filter((i) => i.type === 'workout').length;

  return (
    <article
      className="overflow-hidden rounded-2xl border border-[#2C2C30] shadow-xl shadow-black/50"
      style={{ background: 'linear-gradient(160deg, #28282C 0%, #1E1E21 100%)' }}
    >
      {/* Top accent — fades right */}
      <div
        className="h-0.75"
        style={{ background: 'linear-gradient(90deg, #FF6B35 0%, #FFA94D 45%, transparent 100%)' }}
      />

      <div className="p-4">
        {/* Title row */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#FF6B35]" />
              <span className="text-[0.58rem] font-black tracking-[0.22em] uppercase text-[#A0A0A5]">
                {workoutCount}種目
              </span>
            </div>
            <h2 className="m-0 min-w-0 truncate text-xl font-black leading-tight text-[#F5F5F5]">
              {routine.name}
            </h2>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#3C3C42] bg-[#1A1A1D] text-lg text-[#A0A0A5] transition active:scale-[0.93]"
            onClick={() => setIsMenuOpen((c) => !c)}
            aria-label="ルーティン操作メニュー"
            aria-expanded={isMenuOpen}
          >
            ···
          </button>
        </div>

        {/* Hero time box */}
        <div className="relative mb-3 overflow-hidden rounded-2xl border border-[#2C2C30]">
          {/* Ambient glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at 75% 50%, #FF6B3520 0%, transparent 65%)',
            }}
          />

          <div className="relative flex items-end justify-between px-4 pt-4 pb-3">
            <div>
              <p className="m-0 text-[0.58rem] font-black tracking-[0.22em] uppercase text-[#A0A0A5]">
                予定時間
              </p>
              <p
                className="m-0 font-bebas text-[3.2rem] leading-none tracking-wide text-[#FF6B35]"
                style={{ textShadow: '0 0 24px #FF6B3548' }}
              >
                {formatClockDuration(total)}
              </p>
            </div>
            <div className="mb-1 text-right">
              <p className="m-0 font-bebas text-3xl leading-none" style={{ color: '#3C3C42' }}>
                {routine.items.length}
              </p>
              <p className="m-0 text-[0.55rem] font-black tracking-[0.18em] uppercase text-[#505058]">
                ITEMS
              </p>
            </div>
          </div>
        </div>

        {/* Start button */}
        <button
          className="min-h-14 w-full rounded-2xl text-lg font-black text-[#F5F5F5] transition active:scale-[0.97] disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
            boxShadow: '0 4px 24px #FF6B3530',
          }}
          onClick={onStart}
          disabled={routine.items.length === 0}
        >
          開始
        </button>

        {/* Menu items */}
        {isMenuOpen && (
          <div className="mt-2 grid gap-2 border-t border-[#2C2C30] pt-2">
            <button
              className="min-h-10 rounded-xl border border-[#3C3C42] bg-[#1A1A1D] font-bold text-[#F5F5F5] transition active:scale-[0.97]"
              onClick={onEdit}
            >
              編集
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="min-h-10 rounded-xl border border-[#3C3C42] bg-[#1A1A1D] text-sm font-bold text-[#A0A0A5] transition active:scale-[0.97]"
                onClick={onDuplicate}
              >
                複製
              </button>
              <button
                className="min-h-10 rounded-xl border border-[#EF444430] bg-[#EF444408] text-sm font-bold text-[#EF4444] transition active:scale-[0.97]"
                onClick={onDelete}
              >
                削除
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
