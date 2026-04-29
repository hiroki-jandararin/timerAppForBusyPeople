import { RoutineCard } from '../components/RoutineCard';
import type { Routine } from '../features/routines/routineTypes';

type Props = {
  routines: Routine[];
  onCreate: () => void;
  onEdit: (id: string) => void;
  onStart: (id: string) => void;
  onDuplicate: (routine: Routine) => void;
  onDelete: (id: string) => void;
};

export function RoutineListPage({ routines, onCreate, onEdit, onStart, onDuplicate, onDelete }: Props) {
  const buttonBase = 'min-h-12 rounded-lg border px-3 font-bold shadow-sm transition active:translate-y-px';
  const primaryButtonClass = `${buttonBase} border-[#e45112] bg-[#e95f1a] text-white shadow-[#f26a21]/25`;

  return (
    <main className="mx-auto min-h-screen w-full max-w-[720px] p-4 text-[#241710] sm:p-5">
      <header className="mb-5 rounded-lg border border-[#f5c198] bg-[#ffead8] p-4 shadow-sm shadow-[#d96a1f]/10">
        <div className="flex items-start justify-between gap-3 sm:items-center">
          <div>
            <p className="m-0 mb-1.5 font-extrabold text-[#c24f13]">Workout Timer</p>
            <h1 className="m-0 text-[clamp(1.6rem,8vw,2.3rem)] font-black leading-[1.1]">忙しい人の筋トレタイマー</h1>
          </div>
          <button className={primaryButtonClass} onClick={onCreate}>新規作成</button>
        </div>
      </header>

      {routines.length === 0 ? (
        <section className="grid min-h-64 content-center gap-3.5 rounded-lg border border-[#f1c29b] bg-[#fffdfa] p-5 text-center shadow-lg shadow-[#d96a1f]/10">
          <h2 className="mb-1.5 text-2xl font-bold leading-tight">まだルーティンがありません</h2>
          <button className={`${primaryButtonClass} min-h-[60px] text-lg`} onClick={onCreate}>最初のルーティンを作成</button>
        </section>
      ) : (
        <section className="grid gap-3.5" aria-label="保存済みルーティン一覧">
          {routines.map((routine) => (
            <RoutineCard
              routine={routine}
              key={routine.id}
              onStart={() => onStart(routine.id)}
              onEdit={() => onEdit(routine.id)}
              onDuplicate={() => onDuplicate(routine)}
              onDelete={() => onDelete(routine.id)}
            />
          ))}
        </section>
      )}
    </main>
  );
}
