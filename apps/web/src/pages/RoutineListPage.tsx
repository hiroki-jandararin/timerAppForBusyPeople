import { RoutineCard } from '../components/RoutineCard';
import type { Routine } from '@timeapp/core';

type Props = {
  routines: Routine[];
  onCreate: () => void | Promise<void>;
  onEdit: (id: string) => void;
  onStart: (id: string) => void;
  onDuplicate: (routine: Routine) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  currentUserEmail?: string | null;
  onSignOut?: () => void | Promise<void>;
};

export function RoutineListPage({
  routines,
  onCreate,
  onEdit,
  onStart,
  onDuplicate,
  onDelete,
  currentUserEmail,
  onSignOut,
}: Props) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-lg p-4 sm:p-5">
      {/* Header */}
      <header className="mb-6">
        {/* Top bar: account info + new button */}
        <div className="mb-3 flex items-center justify-end gap-2">
          {onSignOut && (
            <>
              <span className="min-w-0 truncate text-[0.65rem] text-[#505058]">
                {currentUserEmail ?? ''}
              </span>
              <button
                className="shrink-0 rounded-lg border border-[#2C2C30] px-2.5 py-1 text-[0.65rem] font-bold text-[#505058] transition hover:text-[#A0A0A5] active:scale-[0.97]"
                type="button"
                onClick={onSignOut}
              >
                ログアウト
              </button>
            </>
          )}
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1
              className="m-0 font-bebas leading-none tracking-wide text-[#F5F5F5]"
              style={{
                fontSize: 'clamp(2.6rem, 13vw, 3.8rem)',
                textShadow: '0 0 48px #FF6B3538',
              }}
            >
              QuickFit Timer
            </h1>
            <p className="m-0 mt-1 text-[0.6rem] font-black tracking-[0.25em] uppercase text-[#505058]">
              忙しい人のための筋トレタイマー
            </p>
          </div>
          <button
            className="mb-1 shrink-0 rounded-xl border border-[#FF6B3545] px-4 py-2 text-sm font-black tracking-wide text-[#FF6B35] transition active:scale-[0.95]"
            style={{ backgroundColor: '#FF6B3512' }}
            onClick={onCreate}
          >
            ＋ 新規
          </button>
        </div>

        {/* Divider */}
        <div
          className="mt-4 h-px"
          style={{
            background: 'linear-gradient(90deg, #FF6B3530 0%, #3C3C42 60%, transparent 100%)',
          }}
        />
      </header>

      {routines.length === 0 ? (
        <section className="grid min-h-64 content-center gap-4 rounded-2xl border border-[#2C2C30] bg-[#1E1E21] p-6 text-center">
          <div>
            <p
              className="m-0 font-bebas text-6xl leading-none"
              style={{ color: '#2C2C30', textShadow: 'none' }}
            >
              0
            </p>
            <h2 className="m-0 mt-1 text-xl font-black text-[#F5F5F5]">
              まだルーティンがありません
            </h2>
            <p className="m-0 mt-1 text-xs font-bold tracking-widest uppercase text-[#A0A0A5]">
              最初のルーティンを作成して始めよう
            </p>
          </div>
          <button
            className="min-h-16 w-full rounded-2xl text-xl font-black text-[#F5F5F5] transition active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #FF6B35, #FF8C42)',
              boxShadow: '0 4px 24px #FF6B3530',
            }}
            onClick={onCreate}
          >
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
