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
  const accentBorder = isInterval ? 'border-[#d6e0e7]' : 'border-[#efc4a2]';
  const accentFocus = isInterval
    ? 'focus:border-[#7f97a8] focus:ring-[#7f97a8]/15 shadow-[#d6e0e7]/55'
    : 'focus:border-[#f26a21] focus:ring-[#f26a21]/20 shadow-[#f2d5bd]/40';
  const neutralButton = `${buttonBase} ${accentBorder} bg-[#fffdfa] text-[#241710]`;
  const dangerButton = `${buttonBase} border-[#c8332c] bg-[#fffdfa] text-[#c8332c]`;
  const inputClass = `min-h-10 w-full rounded-lg border ${accentBorder} bg-[#fffdfa] px-3 text-sm text-[#241710] shadow-inner focus:outline-none focus:ring-2 ${accentFocus}`;
  const labelClass = 'grid gap-2 text-sm font-medium text-[#6d5a4d]';

  return (
    <article className={`grid gap-2 rounded-lg border bg-[#fffdfa] p-3 shadow-md ${item.type === 'workout' ? 'border-[#f1c29b] border-l-[6px] border-l-[#f26a21] shadow-[#d96a1f]/10' : 'border-[#d6e0e7] border-l-[6px] border-l-[#7f97a8] shadow-[#7f97a8]/7'}`}>
      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
        >
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <strong className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-bold ${item.type === 'workout' ? 'border-[#f5a568] bg-[#fff0df] text-[#b84b12]' : 'border-[#cfd9e0] bg-[#f1f5f8] text-[#577082]'}`}>
                {index + 1}. {item.type === 'workout' ? 'ワークアウト' : 'インターバル'}
              </strong>
              <span className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${item.type === 'workout' ? 'border-[#f5a568] bg-[#fffdfa] text-[#b84b12]' : 'border-[#cfd9e0] bg-[#fffdfa] text-[#577082]'}`}>
                {item.durationSec}秒
              </span>
            </div>
            <div className="truncate text-base font-extrabold text-[#241710]">{item.title || '無題のカード'}</div>
          </div>
        </button>
        <div className="grid grid-cols-3 gap-2">
          <button type="button" className={`${neutralButton} min-h-9 w-9 px-0`} onClick={onMoveUp} aria-label="上へ移動">↑</button>
          <button type="button" className={`${neutralButton} min-h-9 w-9 px-0`} onClick={onMoveDown} aria-label="下へ移動">↓</button>
          <button
            type="button"
            className={`grid h-9 w-9 place-items-center rounded-lg border font-black ${item.type === 'workout' ? 'border-[#efc4a2] bg-[#fff0df] text-[#b84b12]' : 'border-[#cfd9e0] bg-[#f1f5f8] text-[#577082]'}`}
            onClick={() => setIsOpen((current) => !current)}
            aria-label={isOpen ? '閉じる' : '開く'}
            aria-expanded={isOpen}
          >
            {isOpen ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="grid gap-2 border-t border-[#f1e1d4] pt-2">
          <label className={labelClass}>
            カード名
            <input className={inputClass} value={item.title} onChange={(event) => onChange({ title: event.target.value })} />
          </label>
          <label className={labelClass}>
            秒数
            <DurationPresetSelect className={inputClass} value={item.durationSec} onChange={(durationSec) => onChange({ durationSec })} />
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" className={neutralButton} onClick={onDuplicate}>複製</button>
            <button type="button" className={dangerButton} onClick={onDelete}>削除</button>
          </div>
        </div>
      )}
    </article>
  );
}
