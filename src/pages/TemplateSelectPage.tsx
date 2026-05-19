import { ROUTINE_TEMPLATES, type RoutineTemplate } from '../features/routines/routineTemplates';

type Props = {
  onSelect: (template: RoutineTemplate | null) => void;
  onBack: () => void;
};

function totalDurationSec(template: RoutineTemplate): number {
  return template.items.reduce((sum, item) => sum + item.durationSec, 0);
}

function formatMinutes(sec: number): string {
  return `約${Math.round(sec / 60)}分`;
}

export function TemplateSelectPage({ onSelect, onBack }: Props) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-lg p-4 sm:p-5">
      <header className="mb-6">
        <button
          className="text-sm font-bold tracking-widest text-[#A0A0A5] uppercase transition hover:text-[#F5F5F5]"
          onClick={onBack}
        >
          ← 戻る
        </button>
        <h1
          className="m-0 mt-3 text-[2.2rem] font-black leading-tight text-[#F5F5F5]"
          style={{ textShadow: '0 0 40px #FF6B3530' }}
        >
          テンプレートを選ぶ
        </h1>
        <p className="m-0 mt-1 text-[0.6rem] font-black tracking-[0.22em] uppercase text-[#505058]">
          Select a template to get started
        </p>
      </header>

      <section className="grid gap-3">
        {ROUTINE_TEMPLATES.map((template) => {
          const totalSec = totalDurationSec(template);
          const workoutCount = template.items.filter((item) => item.type === 'workout').length;
          return (
            <button
              key={template.id}
              type="button"
              className="w-full overflow-hidden rounded-2xl border border-[#3C3C42] bg-[#2C2C30] p-4 text-left shadow-lg shadow-black/20 transition active:scale-[0.98]"
              onClick={() => onSelect(template)}
            >
              <div
                className="h-0.75 -mx-4 -mt-4 mb-3 rounded-t-2xl"
                style={{ background: 'linear-gradient(90deg, #FF6B35, #FFA94D)' }}
              />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 text-lg font-black leading-tight text-[#F5F5F5]">
                    {template.name}
                  </p>
                  {template.description && (
                    <p className="m-0 mt-1 text-sm font-bold text-[#A0A0A5]">
                      {template.description}
                    </p>
                  )}
                </div>
                <div
                  className="shrink-0 rounded-xl border px-3 py-2 text-right"
                  style={{ backgroundColor: '#FF6B3510', borderColor: '#FF6B3530' }}
                >
                  <p className="m-0 text-sm font-black text-[#FF6B35]">{formatMinutes(totalSec)}</p>
                  <p className="m-0 text-xs font-bold text-[#A0A0A5]">{workoutCount}セット</p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <div className="mt-4">
        <button
          className="min-h-12 w-full rounded-2xl border border-[#3C3C42] bg-[#2C2C30] font-bold text-[#A0A0A5] transition active:scale-[0.97]"
          onClick={() => onSelect(null)}
        >
          最初から作る
        </button>
      </div>
    </main>
  );
}
