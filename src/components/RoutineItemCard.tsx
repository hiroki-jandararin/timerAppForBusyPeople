import { useState } from 'react';
import { DurationPresetSelect } from './DurationPresetSelect';
import type { RoutineItem } from '../features/routines/routineTypes';

type Props = {
  item: RoutineItem;
  index: number;
  onChange: (patch: Partial<Omit<RoutineItem, 'id' | 'type'>>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function RoutineItemCard({
  item,
  index,
  onChange,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const isInterval = item.type === 'interval';

  const accentColor = isInterval ? '#4ADE80' : '#FF6B35';
  const inputClass =
    'min-h-10 w-full rounded-xl border border-[#3C3C42] bg-[#1E1E21] px-3 text-sm text-[#F5F5F5] placeholder-[#A0A0A5] shadow-inner shadow-black/20 outline-none transition focus:ring-2 ' +
    (isInterval
      ? 'focus:border-[#4ADE80] focus:ring-[#4ADE80]/15'
      : 'focus:border-[#FF6B35] focus:ring-[#FF6B35]/15');
  const labelClass = 'grid gap-1.5 text-xs font-black tracking-[0.12em] uppercase text-[#A0A0A5]';

  return (
    <article
      className="grid gap-2 rounded-2xl border bg-[#2C2C30] p-3 shadow-md shadow-black/20"
      style={{
        borderColor: '#3C3C42',
        borderLeftWidth: 4,
        borderLeftColor: accentColor,
      }}
    >
      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
        >
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              <strong
                className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-black"
                style={{ backgroundColor: accentColor + '20', color: accentColor }}
              >
                {index + 1}. {isInterval ? 'インターバル' : 'ワークアウト'}
              </strong>
              <span
                className="rounded-lg px-2 py-0.5 text-xs font-bold"
                style={{ backgroundColor: accentColor + '12', color: accentColor }}
              >
                {item.durationSec}秒
              </span>
            </div>
            <div className="truncate text-base font-black text-[#F5F5F5]">
              {item.title || '無題のカード'}
            </div>
          </div>
        </button>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-xl border border-[#3C3C42] bg-[#1E1E21] text-sm font-bold text-[#A0A0A5] transition active:scale-[0.93]"
            onClick={onMoveUp}
            aria-label="上へ移動"
          >
            ↑
          </button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-xl border border-[#3C3C42] bg-[#1E1E21] text-sm font-bold text-[#A0A0A5] transition active:scale-[0.93]"
            onClick={onMoveDown}
            aria-label="下へ移動"
          >
            ↓
          </button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-xl border font-black transition active:scale-[0.93]"
            style={{
              borderColor: accentColor + '40',
              backgroundColor: accentColor + '15',
              color: accentColor,
            }}
            onClick={() => setIsOpen((current) => !current)}
            aria-label={isOpen ? '閉じる' : '開く'}
            aria-expanded={isOpen}
          >
            {isOpen ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="grid gap-2 border-t border-[#3C3C42] pt-2">
          <label className={labelClass}>
            カード名
            <input
              className={inputClass}
              value={item.title}
              onChange={(event) => onChange({ title: event.target.value })}
            />
          </label>
          <label className={labelClass}>
            秒数
            <DurationPresetSelect
              className={inputClass}
              value={item.durationSec}
              onChange={(durationSec) => onChange({ durationSec })}
            />
          </label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="min-h-10 rounded-xl border border-[#3C3C42] bg-[#1E1E21] text-sm font-bold text-[#A0A0A5] transition active:scale-[0.97]"
              onClick={onDuplicate}
            >
              複製
            </button>
            <button
              type="button"
              className="min-h-10 rounded-xl border border-[#EF444430] bg-[#EF444408] text-sm font-bold text-[#EF4444] transition active:scale-[0.97]"
              onClick={onDelete}
            >
              削除
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
