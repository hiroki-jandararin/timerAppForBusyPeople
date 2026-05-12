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
  const backLinkClass = 'border-0 bg-transparent p-0 text-sm font-bold text-[#8a4b23] shadow-none';
  const blankButtonClass =
    'min-h-12 w-full rounded-lg border border-[#efc4a2] bg-[#fffdfa] px-4 font-bold text-[#6d5a4d] shadow-sm transition active:translate-y-px';

  return (
    <main className="mx-auto min-h-screen w-full max-w-180 p-4 text-[#241710] sm:p-5">
      <header className="mb-5">
        <button className={backLinkClass} onClick={onBack}>
          ← 戻る
        </button>
        <h1 className="mt-3 text-2xl font-black leading-tight">テンプレートを選ぶ</h1>
        <p className="mt-1 text-sm font-medium text-[#8a4b23]">
          テンプレートを選ぶとすぐに編集・開始できます
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
              className="w-full rounded-lg border border-[#f4d0b3] bg-[#fffdfa] p-4 text-left shadow-sm shadow-[#d96a1f]/5 transition active:translate-y-px"
              onClick={() => onSelect(template)}
            >
              <div className="h-1 -mx-4 -mt-4 mb-3 rounded-t-lg bg-[#f26a21]" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 text-lg font-black leading-tight">{template.name}</p>
                  {template.description && (
                    <p className="m-0 mt-1 text-sm font-medium text-[#6d5a4d]">
                      {template.description}
                    </p>
                  )}
                </div>
                <div className="shrink-0 rounded-lg border border-[#f5a568] bg-[#fff0df] px-3 py-1.5 text-right">
                  <p className="m-0 text-sm font-black text-[#b84b12]">{formatMinutes(totalSec)}</p>
                  <p className="m-0 text-xs font-bold text-[#8a4b23]">{workoutCount}セット</p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <div className="mt-5">
        <button className={blankButtonClass} onClick={() => onSelect(null)}>
          最初から作る
        </button>
      </div>
    </main>
  );
}
