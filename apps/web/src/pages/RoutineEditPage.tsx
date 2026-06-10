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
  MUSCLE_GROUPS,
} from '@timeapp/core';
import {
  calculateTargetDifference,
  calculateTotalDuration,
  formatClockDuration,
  formatSignedDifference,
  getTargetDuration,
} from '@timeapp/core';
import type { Routine, RoutineItem } from '@timeapp/core';

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
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [pickerReps, setPickerReps] = useState('10');
  const [isSetFormOpen, setIsSetFormOpen] = useState(true);
  const [setTitle, setSetTitle] = useState('ワークアウト');
  const [setReps, setSetReps] = useState('10');
  const [setWorkoutDurationSec, setSetWorkoutDurationSec] = useState('60');
  const [setIntervalDurationSec, setSetIntervalDurationSec] = useState('90');
  const [setCount, setSetCount] = useState('3');
  const [includeLastInterval, setIncludeLastInterval] = useState(false);

  const totalDuration = calculateTotalDuration(draft);
  const targetDifference = calculateTargetDifference(draft);

  const inputClass =
    'min-h-11 w-full rounded-xl border border-[#3C3C42] bg-[#2C2C30] px-3 text-sm text-[#F5F5F5] placeholder-[#A0A0A5] shadow-inner shadow-black/20 outline-none transition focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/15';
  const labelClass = 'grid gap-1.5 text-xs font-black tracking-[0.12em] uppercase text-[#A0A0A5]';

  function save() {
    const validationErrors = validateRoutine(draft, existingRoutines);
    setErrors(validationErrors);
    if (validationErrors.length === 0) onSave(draft);
  }

  function updateCard(itemId: string, patch: Partial<Omit<RoutineItem, 'id' | 'type'>>) {
    setDraft((current) => updateItem(current, itemId, patch));
  }

  function addSet() {
    const reps = Number(setReps);
    const title = reps > 0 ? `${setTitle} ${reps}回` : setTitle;
    setDraft((current) =>
      addWorkoutSet(current, {
        title,
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
    <main className="mx-auto min-h-screen w-full max-w-lg p-4 sm:p-5">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 mb-4">
        <button
          className="text-sm font-bold tracking-widest text-[#A0A0A5] uppercase transition hover:text-[#F5F5F5]"
          onClick={onBack}
        >
          ← 戻る
        </button>
        <button
          className="rounded-xl bg-[#FF6B35] px-4 py-2 text-sm font-black tracking-wide text-[#F5F5F5] shadow-lg shadow-[#FF6B35]/20 transition active:scale-[0.97]"
          onClick={save}
        >
          保存
        </button>
      </header>

      <section className="grid gap-3">
        {/* Sticky time summary */}
        <section className="sticky top-3 z-10 rounded-2xl border border-[#FF6B3520] bg-[#1A1A1D]/95 p-3 shadow-lg shadow-black/40 backdrop-blur-sm">
          <div className="flex items-end justify-between gap-3">
            <span className="text-xs font-black tracking-[0.15em] uppercase text-[#A0A0A5]">
              予定時間
            </span>
            <span className="font-bebas text-5xl leading-none tracking-wide text-[#FF6B35]">
              {formatClockDuration(totalDuration)}
            </span>
          </div>
          <div
            className="mt-2 rounded-xl px-3 py-1.5 text-sm font-black"
            style={
              targetDifference === null || targetDifference >= 0
                ? { backgroundColor: '#4ADE8010', color: '#4ADE80' }
                : { backgroundColor: '#FFC10712', color: '#FFC107' }
            }
          >
            {targetDifference === null
              ? '目標時間を設定すると差分を表示します'
              : formatSignedDifference(targetDifference)}
          </div>
        </section>

        {/* Routine name */}
        <label className={labelClass}>
          ルーティン名
          <input
            className={inputClass}
            value={draft.name}
            onChange={(event) => setDraft(renameRoutine(draft, event.target.value))}
            placeholder="ルーティン名を入力"
          />
        </label>

        {/* Target duration */}
        <label className={labelClass}>
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

        {/* Quick add buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            className="min-h-11 rounded-xl border border-[#FF6B3535] bg-[#FF6B3510] text-sm font-black tracking-wide text-[#FF6B35] transition active:scale-[0.97]"
            onClick={() => setIsExercisePickerOpen((v) => !v)}
          >
            {isExercisePickerOpen ? '種目選択を閉じる' : 'ワークアウト追加'}
          </button>
          <button
            className="min-h-11 rounded-xl border border-[#4ADE8030] bg-[#4ADE8010] text-sm font-black tracking-wide text-[#4ADE80] transition active:scale-[0.97]"
            onClick={() => setDraft(addItem(draft, 'interval'))}
          >
            インターバル追加
          </button>
        </div>

        {/* Exercise picker */}
        {isExercisePickerOpen && (
          <section className="rounded-2xl border border-[#FF6B3530] bg-[#1E1E21] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest uppercase text-[#A0A0A5]">
                  種目を選択
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={pickerReps}
                    onChange={(e) => setPickerReps(e.target.value)}
                    className="w-14 rounded-lg border border-[#3C3C42] bg-[#2C2C30] px-2 py-1 text-center text-sm font-bold text-[#F5F5F5] outline-none focus:border-[#FF6B35]"
                  />
                  <span className="text-xs font-bold text-[#505058]">回</span>
                </div>
              </div>
              <button
                className="rounded-lg border border-[#3C3C42] px-3 py-1 text-xs font-bold text-[#A0A0A5] transition hover:text-[#F5F5F5]"
                onClick={() => {
                  setDraft(addItem(draft, 'workout'));
                  setIsExercisePickerOpen(false);
                }}
              >
                ＋ 空白で追加
              </button>
            </div>
            <div className="grid gap-4">
              {MUSCLE_GROUPS.map((group) => (
                <div key={group.id}>
                  <p className="m-0 mb-2 text-[0.65rem] font-black tracking-widest uppercase text-[#505058]">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.exercises.map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        className="rounded-xl border border-[#3C3C42] bg-[#2C2C30] px-3 py-1.5 text-sm font-bold text-[#A0A0A5] transition hover:border-[#FF6B3560] hover:text-[#FF6B35] active:scale-[0.95]"
                        onClick={() => {
                          const reps = Number(pickerReps);
                          const title = reps > 0 ? `${ex.name} ${reps}回` : ex.name;
                          setDraft((d) => {
                            const next = addItem(d, 'workout');
                            const added = next.items[next.items.length - 1];
                            return {
                              ...next,
                              items: next.items.map((item) =>
                                item.id === added.id ? { ...item, title } : item
                              ),
                            };
                          });
                          setIsExercisePickerOpen(false);
                        }}
                      >
                        {ex.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bulk set form */}
        <section className="rounded-2xl border border-[#3C3C42] bg-[#2C2C30] p-3">
          <button
            type="button"
            className="grid min-h-10 w-full grid-cols-[1fr_auto] items-center gap-2 text-left"
            onClick={() => setIsSetFormOpen((current) => !current)}
            aria-expanded={isSetFormOpen}
          >
            <span className="text-sm font-black tracking-wide text-[#F5F5F5]">セット一括追加</span>
            <span className="text-xs font-bold text-[#A0A0A5]">
              {isSetFormOpen ? '閉じる' : '開く'}
            </span>
          </button>

          {isSetFormOpen && (
            <div className="grid gap-3 border-t border-[#3C3C42] pt-3">
              <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                <label className={labelClass}>
                  種目名
                  <input
                    className={inputClass}
                    value={setTitle}
                    onChange={(event) => setSetTitle(event.target.value)}
                    placeholder="スクワット"
                  />
                </label>
                <label className={labelClass}>
                  回数
                  <input
                    className={inputClass}
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={setReps}
                    onChange={(event) => setSetReps(event.target.value)}
                    style={{ width: '5rem' }}
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className={labelClass}>
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
                <label className={labelClass}>
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
                <label className={labelClass}>
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
                <label className="flex min-h-11 items-center gap-2 text-xs font-black tracking-wide text-[#A0A0A5] uppercase">
                  <input
                    type="checkbox"
                    checked={includeLastInterval}
                    onChange={(event) => setIncludeLastInterval(event.target.checked)}
                    className="accent-[#FF6B35]"
                  />
                  最後も休憩
                </label>
              </div>
              <button
                type="button"
                className="min-h-11 w-full rounded-xl bg-[#FF6B35] text-sm font-black tracking-wide text-[#F5F5F5] shadow-lg shadow-[#FF6B35]/15 transition active:scale-[0.97]"
                onClick={addSet}
              >
                セットを追加
              </button>
            </div>
          )}
        </section>

        {/* Validation errors */}
        {errors.length > 0 && (
          <ul className="m-0 rounded-xl border border-[#EF444430] bg-[#EF444410] py-3 pr-4 pl-8 font-bold text-[#EF4444]">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}

        {/* Item list */}
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

        {/* Bottom save button */}
        <button
          className="min-h-16 w-full rounded-2xl bg-[#FF6B35] text-xl font-black tracking-wide text-[#F5F5F5] shadow-lg shadow-[#FF6B35]/20 transition active:scale-[0.97]"
          onClick={save}
        >
          保存
        </button>
      </section>
    </main>
  );
}
