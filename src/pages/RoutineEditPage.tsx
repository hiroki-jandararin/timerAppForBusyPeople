import { useState } from 'react';
import { RoutineItemCard } from '../components/RoutineItemCard';
import {
  addItem,
  deleteItem,
  duplicateItem,
  moveItemDown,
  moveItemUp,
  renameRoutine,
  updateItem,
  validateRoutine,
} from '../features/routines/routineOperations';
import type { Routine, RoutineItem } from '../features/routines/routineTypes';

type Props = {
  routine: Routine;
  existingRoutines: Routine[];
  onSave: (routine: Routine) => void | Promise<void>;
  onBack: () => void;
};

export function RoutineEditPage({ routine, existingRoutines, onSave, onBack }: Props) {
  const [draft, setDraft] = useState(routine);
  const [errors, setErrors] = useState<string[]>([]);
  const buttonBase =
    'min-h-11 rounded-lg border px-3 text-sm font-bold shadow-sm transition active:translate-y-px';
  const buttonClass = `${buttonBase} border-[#efc4a2] bg-[#fffdfa] text-[#241710]`;
  const addWorkoutButtonClass =
    'min-h-10 rounded-lg border border-[#f5a568] bg-[#fefefe] px-3 text-sm font-bold text-[#b84b12] shadow-sm shadow-[#f26a21]/10 transition active:translate-y-px';
  const addIntervalButtonClass =
    'min-h-10 rounded-lg border border-[#cfd9e0] bg-[#f1f5f8] px-3 text-sm font-bold text-[#577082] shadow-sm shadow-[#7f97a8]/10 transition active:translate-y-px';
  const saveButtonClass =
    'min-h-10 rounded-lg border border-[#e45112] bg-[#e95f1a] px-3 text-sm font-bold text-white shadow-sm shadow-[#f26a21]/20 transition active:translate-y-px';
  const inputClass =
    'min-h-10 w-full rounded-lg border border-[#efc4a2] bg-[#fffdfa] px-3 text-sm text-[#241710] shadow-inner shadow-[#f2d5bd]/40 focus:border-[#f26a21] focus:outline-none focus:ring-2 focus:ring-[#f26a21]/20';
  const backLinkClass = 'border-0 bg-transparent p-0 text-sm font-bold text-[#8a4b23] shadow-none';

  function save() {
    const validationErrors = validateRoutine(draft, existingRoutines);
    setErrors(validationErrors);
    if (validationErrors.length === 0) onSave(draft);
  }

  function updateCard(itemId: string, patch: Partial<Omit<RoutineItem, 'id' | 'type'>>) {
    setDraft((current) => updateItem(current, itemId, patch));
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[720px] p-4 text-[#241710] sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <button className={backLinkClass} onClick={onBack}>
          ← 戻る
        </button>
        <button className={saveButtonClass} onClick={save}>
          保存
        </button>
      </header>
      <section className="grid gap-3">
        <label className="grid gap-2 text-sm font-medium text-[#000000]">
          ルーティン名
          <input
            className={inputClass}
            value={draft.name}
            onChange={(event) => setDraft(renameRoutine(draft, event.target.value))}
            placeholder="ルーティン名を入力"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            className={addWorkoutButtonClass}
            onClick={() => setDraft(addItem(draft, 'workout'))}
          >
            ワークアウト追加
          </button>
          <button
            className={addIntervalButtonClass}
            onClick={() => setDraft(addItem(draft, 'interval'))}
          >
            インターバル追加
          </button>
        </div>
        {errors.length > 0 && (
          <ul className="m-0 rounded-lg bg-[#fff0ee] py-3 pr-4 pl-8 font-bold text-[#9c211b]">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
        <div className="grid gap-2">
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
        <button
          className="min-h-[60px] rounded-lg border border-[#e45112] bg-[#e95f1a] px-4 text-lg font-bold text-white shadow-sm shadow-[#f26a21]/20 transition active:translate-y-px"
          onClick={save}
        >
          保存
        </button>
      </section>
    </main>
  );
}
