import { useState } from 'react';
import { RoutineItemCard } from '../components/RoutineItemCard';
import {
  addItem,
  addWorkoutSet,
  deleteItem,
  duplicateItem,
  moveItemDown,
  moveItemUp,
  renameRoutine,
  updateRoutineTargetDuration,
  updateItem,
  validateRoutine,
} from '../features/routines/routineOperations';
import {
  calculateTargetDifference,
  calculateTotalDuration,
  formatClockDuration,
  formatSignedDifference,
  getTargetDuration,
} from '../features/routines/routineTime';
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
  const [targetMinutes, setTargetMinutes] = useState(() => {
    const targetDuration = getTargetDuration(routine);
    return targetDuration === null ? '' : String(Math.floor(targetDuration / 60));
  });
  const [isSetFormOpen, setIsSetFormOpen] = useState(true);
  const [setTitle, setSetTitle] = useState('ワークアウト');
  const [setWorkoutDurationSec, setSetWorkoutDurationSec] = useState('60');
  const [setIntervalDurationSec, setSetIntervalDurationSec] = useState('90');
  const [setCount, setSetCount] = useState('3');
  const [includeLastInterval, setIncludeLastInterval] = useState(false);
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
  const totalDuration = calculateTotalDuration(draft);
  const targetDifference = calculateTargetDifference(draft);

  function save() {
    const validationErrors = validateRoutine(draft, existingRoutines);
    setErrors(validationErrors);
    if (validationErrors.length === 0) onSave(draft);
  }

  function updateCard(itemId: string, patch: Partial<Omit<RoutineItem, 'id' | 'type'>>) {
    setDraft((current) => updateItem(current, itemId, patch));
  }

  function addSet() {
    setDraft((current) =>
      addWorkoutSet(current, {
        title: setTitle,
        workoutDurationSec: Number(setWorkoutDurationSec),
        intervalDurationSec: Number(setIntervalDurationSec),
        setCount: Number(setCount),
        includeLastInterval,
      })
    );
  }

  function updateTargetDuration(value: string) {
    setTargetMinutes(value);
    const trimmed = value.trim();
    if (!trimmed) {
      setDraft((current) => updateRoutineTargetDuration(current, null));
      return;
    }

    const minutes = Math.max(1, Math.floor(Number(trimmed)));
    if (!Number.isFinite(minutes)) return;
    setDraft((current) => updateRoutineTargetDuration(current, minutes * 60));
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-180 p-4 text-[#241710] sm:p-5">
      <header className="flex items-start justify-between gap-3">
        <button className={backLinkClass} onClick={onBack}>
          ← 戻る
        </button>
        <button className={saveButtonClass} onClick={save}>
          保存
        </button>
      </header>
      <section className="grid gap-3">
        <section className="sticky top-3 z-10 grid gap-2 rounded-lg border border-[#f5a568] bg-[#fff0df] p-3 shadow-lg shadow-[#d96a1f]/10">
          <div className="flex items-end justify-between gap-3">
            <span className="text-sm font-black text-[#8a4b23]">予定時間</span>
            <span className="text-4xl font-black leading-none text-[#b84b12]">
              {formatClockDuration(totalDuration)}
            </span>
          </div>
          <div
            className={`rounded-lg px-3 py-2 text-sm font-bold ${
              targetDifference === null || targetDifference >= 0
                ? 'bg-[#eef8ef] text-[#2d6b2c]'
                : 'bg-[#fff0ee] text-[#9c211b]'
            }`}
          >
            {targetDifference === null
              ? '目標時間を設定すると差分を表示します'
              : formatSignedDifference(targetDifference)}
          </div>
        </section>
        <label className="grid gap-2 text-sm font-medium text-[#000000]">
          ルーティン名
          <input
            className={inputClass}
            value={draft.name}
            onChange={(event) => setDraft(renameRoutine(draft, event.target.value))}
            placeholder="ルーティン名を入力"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#000000]">
          目標筋トレ時間（分）
          <input
            className={inputClass}
            type="number"
            min="1"
            inputMode="numeric"
            value={targetMinutes}
            onChange={(event) => updateTargetDuration(event.target.value)}
            placeholder="45"
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
        <section className="grid gap-3 rounded-lg border border-[#efc4a2] bg-[#fffdfa] p-3 shadow-sm shadow-[#d96a1f]/10">
          <button
            type="button"
            className="grid min-h-10 grid-cols-[1fr_auto] items-center gap-2 text-left font-bold text-[#241710]"
            onClick={() => setIsSetFormOpen((current) => !current)}
            aria-expanded={isSetFormOpen}
          >
            <span>セット一括追加</span>
            <span className="text-[#8a4b23]">{isSetFormOpen ? '閉じる' : '開く'}</span>
          </button>
          {isSetFormOpen && (
            <div className="grid gap-3 border-t border-[#f1e1d4] pt-3">
              <label className="grid gap-2 text-sm font-medium text-[#6d5a4d]">
                種目名
                <input
                  className={inputClass}
                  value={setTitle}
                  onChange={(event) => setSetTitle(event.target.value)}
                  placeholder="スクワット"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-2 text-sm font-medium text-[#6d5a4d]">
                  ワークアウト秒数
                  <input
                    className={inputClass}
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={setWorkoutDurationSec}
                    onChange={(event) => setSetWorkoutDurationSec(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[#6d5a4d]">
                  休憩秒数
                  <input
                    className={inputClass}
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={setIntervalDurationSec}
                    onChange={(event) => setSetIntervalDurationSec(event.target.value)}
                  />
                </label>
              </div>
              <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                <label className="grid gap-2 text-sm font-medium text-[#6d5a4d]">
                  セット数
                  <input
                    className={inputClass}
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={setCount}
                    onChange={(event) => setSetCount(event.target.value)}
                  />
                </label>
                <label className="flex min-h-10 items-center gap-2 text-sm font-bold text-[#6d5a4d]">
                  <input
                    type="checkbox"
                    checked={includeLastInterval}
                    onChange={(event) => setIncludeLastInterval(event.target.checked)}
                  />
                  最後も休憩
                </label>
              </div>
              <button type="button" className={saveButtonClass} onClick={addSet}>
                セットを追加
              </button>
            </div>
          )}
        </section>
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
          className="min-h-15 rounded-lg border border-[#e45112] bg-[#e95f1a] px-4 text-lg font-bold text-white shadow-sm shadow-[#f26a21]/20 transition active:translate-y-px"
          onClick={save}
        >
          保存
        </button>
      </section>
    </main>
  );
}
