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

export function RoutineListPage({
  routines,
  onCreate,
  onEdit,
  onStart,
  onDuplicate,
  onDelete,
}: Props) {
  const buttonBase =
    'min-h-12 rounded-lg border px-3 font-bold shadow-sm transition active:translate-y-px';
  const primaryButtonClass = `${buttonBase} border-[#e45112] bg-[#e95f1a] text-white shadow-[#f26a21]/25`;
  const createButtonClass =
    'min-h-10 shrink-0 rounded-lg border border-[#efc4a2] bg-[#fff7ef] px-3 text-sm font-bold text-[#b84b12] shadow-sm shadow-[#d96a1f]/5 transition active:translate-y-px';

  return (
    <main className="mx-auto min-h-screen w-full max-w-[720px] p-4 text-[#241710] sm:p-5">
      <header className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="m-0 text-[clamp(1.6rem,8vw,2.3rem)] font-black leading-[1.1]">
              QuickFit Timer
            </h1>
            <p className="m-0 mt-1 text-sm font-medium leading-snug text-[#a65a2a]">
              忙しい人の筋トレタイマー
            </p>
          </div>
          <button className={`${createButtonClass} mt-8`} onClick={onCreate}>
            ＋ 新規
          </button>
        </div>
      </header>

      {routines.length === 0 ? (
        <section className="grid min-h-64 content-center gap-3 rounded-lg border border-[#f4d0b3] bg-[#fffdfa] p-4 text-center shadow-sm shadow-[#d96a1f]/5">
          <h2 className="mb-2 text-2xl font-black leading-tight">まだルーティンがありません</h2>
          <button className={`${primaryButtonClass} min-h-[60px] text-lg`} onClick={onCreate}>
            最初のルーティンを作成
          </button>
        </section>
      ) : (
        <section className="grid gap-3" aria-label="保存済みルーティン一覧">
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
