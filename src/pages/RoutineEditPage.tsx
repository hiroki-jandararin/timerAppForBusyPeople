import { useState } from 'react';
import { RoutineItemCard } from '../components/RoutineItemCard';
import { addItem, deleteItem, duplicateItem, moveItemDown, moveItemUp, renameRoutine, updateItem, validateRoutine } from '../features/routines/routineOperations';
import type { Routine, RoutineItem } from '../features/routines/routineTypes';

type Props = {
  routine: Routine;
  onSave: (routine: Routine) => void;
  onBack: () => void;
};

export function RoutineEditPage({ routine, onSave, onBack }: Props) {
  const [draft, setDraft] = useState(routine);
  const [errors, setErrors] = useState<string[]>([]);
  const buttonBase = 'min-h-11 rounded-lg border px-3 text-sm font-bold shadow-sm transition active:translate-y-px';
  const buttonClass = `${buttonBase} border-[#efc4a2] bg-[#fffdfa] text-[#241710]`;
  const primaryButtonClass = `${buttonBase} border-[#e45112] bg-[#e95f1a] text-white shadow-[#f26a21]/25`;
  const inputClass = 'min-h-10 w-full rounded-lg border border-[#efc4a2] bg-[#fffdfa] px-3 text-sm text-[#241710] shadow-inner shadow-[#f2d5bd]/40 focus:border-[#f26a21] focus:outline-none focus:ring-2 focus:ring-[#f26a21]/20';

  function save() {
    const validationErrors = validateRoutine(draft);
    setErrors(validationErrors);
    if (validationErrors.length === 0) onSave(draft);
  }

  function updateCard(itemId: string, patch: Partial<Omit<RoutineItem, 'id' | 'type'>>) {
    setDraft((current) => updateItem(current, itemId, patch));
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[720px] p-4 text-[#241710] sm:p-5">
      <header className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-[#f5c198] bg-[#ffead8] p-3 shadow-sm shadow-[#d96a1f]/10 sm:items-center">
        <button className={buttonClass} onClick={onBack}>戻る</button>
        <button className={primaryButtonClass} onClick={save}>保存</button>
      </header>
      <section className="grid gap-3">
        <label className="grid gap-1.5 text-sm font-bold">
          ルーティン名
          <input className={inputClass} value={draft.name} onChange={(event) => setDraft(renameRoutine(draft, event.target.value))} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button className={primaryButtonClass} onClick={() => setDraft(addItem(draft, 'workout'))}>ワークアウト追加</button>
          <button className={buttonClass} onClick={() => setDraft(addItem(draft, 'interval'))}>インターバル追加</button>
        </div>
        {errors.length > 0 && (
          <ul className="m-0 rounded-lg bg-[#fff0ee] py-3 pr-4 pl-8 font-bold text-[#9c211b]">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
        <div className="grid gap-2.5">
          {draft.items.map((item, index) => (
            <RoutineItemCard
              key={item.id}
              item={item}
              index={index}
              onChange={(patch) => updateCard(item.id, patch)}
              onMoveUp={() => setDraft(moveItemUp(draft, item.id))}
              onMoveDown={() => setDraft(moveItemDown(draft, item.id))}
              onDuplicate={() => setDraft(duplicateItem(draft, item.id))}
              onDelete={() => setDraft(deleteItem(draft, item.id))}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
