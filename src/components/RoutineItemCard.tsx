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

export function RoutineItemCard({ item, index, onChange, onMoveUp, onMoveDown, onDuplicate, onDelete }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonBase = 'min-h-10 rounded-lg border px-3 text-sm font-bold shadow-sm transition active:translate-y-px';
  const isInterval = item.type === 'interval';
  const accentBorder = isInterval ? 'border-[#77c8bf]' : 'border-[#efc4a2]';
  const accentFocus = isInterval
    ? 'focus:border-[#2a9d8f] focus:ring-[#2a9d8f]/20 shadow-[#2a9d8f]/10'
    : 'focus:border-[#f26a21] focus:ring-[#f26a21]/20 shadow-[#f2d5bd]/40';
  const neutralButton = `${buttonBase} ${accentBorder} bg-[#fffdfa] text-[#241710]`;
  const dangerButton = `${buttonBase} border-[#c8332c] bg-[#fffdfa] text-[#c8332c]`;
  const inputClass = `min-h-10 w-full rounded-lg border ${accentBorder} bg-[#fffdfa] px-3 text-sm text-[#241710] shadow-inner focus:outline-none focus:ring-2 ${accentFocus}`;
  const labelClass = 'grid gap-1.5 text-sm font-bold';

  return (
    <article className={`grid gap-2.5 rounded-lg border bg-[#fffdfa] p-3 shadow-md ${item.type === 'workout' ? 'border-[#f1c29b] border-l-[6px] border-l-[#f26a21] shadow-[#d96a1f]/10' : 'border-[#77c8bf] border-l-[6px] border-l-[#2a9d8f] shadow-[#2a9d8f]/10'}`}>
      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
        >
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <strong className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${item.type === 'workout' ? 'bg-[#fff0df] text-[#b84b12]' : 'bg-[#e7f5f3] text-[#12675d]'}`}>
                {index + 1}. {item.type === 'workout' ? 'ワークアウト' : 'インターバル'}
              </strong>
              <span className="rounded-full bg-[#241710] px-2 py-0.5 text-xs font-extrabold text-white">{item.durationSec}秒</span>
            </div>
            <div className="truncate text-base font-black text-[#241710]">{item.title || '無題のカード'}</div>
          </div>
        </button>
        <div className="grid grid-cols-3 gap-1.5">
          <button type="button" className={`${neutralButton} min-h-9 w-9 px-0`} onClick={onMoveUp} aria-label="上へ移動">↑</button>
          <button type="button" className={`${neutralButton} min-h-9 w-9 px-0`} onClick={onMoveDown} aria-label="下へ移動">↓</button>
          <button
            type="button"
            className={`grid h-9 w-9 place-items-center rounded-full border font-black ${item.type === 'workout' ? 'border-[#efc4a2] bg-[#fff0df] text-[#b84b12]' : 'border-[#77c8bf] bg-[#e7f5f3] text-[#12675d]'}`}
            onClick={() => setIsOpen((current) => !current)}
            aria-label={isOpen ? '閉じる' : '開く'}
            aria-expanded={isOpen}
          >
            {isOpen ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="grid gap-2.5 border-t border-[#f1e1d4] pt-2.5">
          <label className={labelClass}>
            カード名
            <input className={inputClass} value={item.title} onChange={(event) => onChange({ title: event.target.value })} />
          </label>
          <label className={labelClass}>
            秒数
            <DurationPresetSelect className={inputClass} value={item.durationSec} onChange={(durationSec) => onChange({ durationSec })} />
          </label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button type="button" className={neutralButton} onClick={onDuplicate}>複製</button>
            <button type="button" className={dangerButton} onClick={onDelete}>削除</button>
          </div>
        </div>
      )}
    </article>
  );
}
