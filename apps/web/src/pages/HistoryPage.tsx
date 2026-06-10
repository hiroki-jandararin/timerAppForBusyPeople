import { useState } from 'react';
import type { WorkoutHistory } from '@timeapp/core';

type Props = {
  histories: WorkoutHistory[];
  onBack: () => void;
};

export function HistoryPage({ histories, onBack }: Props) {
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const byDate = groupByDate(histories);
  const stats = calcStats(histories, byDate);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const days = buildCalendarDays(currentYear, currentMonth);
  const selectedHistories = selectedDate ? (byDate.get(selectedDate) ?? []) : [];

  const monthLabel = new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long' }).format(
    new Date(currentYear, currentMonth, 1)
  );
  const thisMonthCount = countMonth(byDate, currentYear, currentMonth);

  return (
    <main className="mx-auto min-h-screen w-full max-w-lg p-4 sm:p-5">
      <header className="mb-5 flex items-center gap-3">
        <button
          className="text-sm font-bold tracking-widest text-[#A0A0A5] uppercase transition hover:text-[#F5F5F5]"
          onClick={onBack}
        >
          ← 戻る
        </button>
        <h1 className="m-0 text-xl font-black text-[#F5F5F5]">ワークアウト履歴</h1>
      </header>

      {/* Streak + summary */}
      <section className="mb-4 grid grid-cols-3 gap-3">
        <div className="col-span-1 rounded-2xl border border-[#FF6B3530] bg-[#FF6B3510] p-4 text-center">
          <p className="m-0 text-3xl font-black text-[#FF6B35]">
            {stats.currentStreak > 0 ? `🔥 ${stats.currentStreak}` : stats.currentStreak}
          </p>
          <p className="m-0 mt-1 text-[0.6rem] font-black tracking-widest uppercase text-[#FF6B3580]">
            日連続
          </p>
          {stats.longestStreak > 1 && (
            <p className="m-0 mt-1.5 text-[0.6rem] text-[#505058]">
              最長 {stats.longestStreak}日
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-[#3C3C42] bg-[#1E1E21] p-4 text-center">
          <p className="m-0 text-3xl font-black text-[#F5F5F5]">{stats.totalCount}</p>
          <p className="m-0 mt-1 text-[0.6rem] font-black tracking-widest uppercase text-[#505058]">
            通算回数
          </p>
        </div>
        <div className="rounded-2xl border border-[#3C3C42] bg-[#1E1E21] p-4 text-center">
          <p className="m-0 text-3xl font-black text-[#F5F5F5]">{thisMonthCount}</p>
          <p className="m-0 mt-1 text-[0.6rem] font-black tracking-widest uppercase text-[#505058]">
            今月の回数
          </p>
        </div>
      </section>

      {/* Calendar */}
      <section className="rounded-2xl border border-[#3C3C42] bg-[#1E1E21] p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            className="rounded-lg px-2 py-1 text-[#A0A0A5] transition hover:text-[#F5F5F5]"
            onClick={prevMonth}
          >
            ‹
          </button>
          <span className="text-sm font-black text-[#F5F5F5]">{monthLabel}</span>
          <button
            className="rounded-lg px-2 py-1 text-[#A0A0A5] transition hover:text-[#F5F5F5]"
            onClick={nextMonth}
          >
            ›
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center">
          {['日', '月', '火', '水', '木', '金', '土'].map(d => (
            <div key={d} className="text-[0.6rem] font-black tracking-wide text-[#505058]">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const dateStr = toDateString(currentYear, currentMonth, day);
            const count = byDate.get(dateStr)?.length ?? 0;
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === toDateString(...todayParts());
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={[
                  'aspect-square w-full rounded-lg text-xs font-bold transition',
                  count > 0
                    ? isSelected
                      ? 'bg-[#FF6B35] text-[#F5F5F5]'
                      : 'bg-[#FF6B3560] text-[#FF6B35] hover:bg-[#FF6B3580]'
                    : isToday
                      ? 'border border-[#505058] text-[#A0A0A5]'
                      : 'text-[#505058] hover:text-[#A0A0A5]',
                ].join(' ')}
              >
                {day}
                {count > 1 && (
                  <span className="block text-[0.5rem] leading-none">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected day detail */}
      {selectedDate && (
        <section className="mt-4 grid gap-2">
          <h2 className="m-0 text-sm font-black text-[#A0A0A5]">
            {formatDateLabel(selectedDate)}
          </h2>
          {selectedHistories.map(h => (
            <HistoryCard key={h.id} history={h} />
          ))}
        </section>
      )}

      {/* Empty state */}
      {histories.length === 0 && (
        <div className="mt-12 text-center">
          <p className="m-0 text-sm text-[#505058]">まだ履歴がありません</p>
          <p className="m-0 mt-1 text-xs text-[#3C3C42]">タイマーを完了すると記録されます</p>
        </div>
      )}
    </main>
  );
}

function HistoryCard({ history }: { history: WorkoutHistory }) {
  const start = new Date(history.startedAt);
  const finish = new Date(history.finishedAt);
  const durationMin = Math.round((finish.getTime() - start.getTime()) / 60000);

  return (
    <div className="rounded-xl border border-[#3C3C42] bg-[#1E1E21] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="m-0 font-bold text-[#F5F5F5]">{history.routineName}</p>
          <p className="m-0 mt-0.5 text-xs text-[#A0A0A5]">
            {formatTime(start)} 〜 {formatTime(finish)}（{durationMin}分）
          </p>
        </div>
        <span
          className={[
            'shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-black',
            history.completed
              ? 'bg-[#22c55e20] text-[#22c55e]'
              : 'bg-[#EF444420] text-[#EF4444]',
          ].join(' ')}
        >
          {history.completed ? '完了' : '中断'}
        </span>
      </div>
      <p className="m-0 mt-2 text-xs text-[#505058]">
        {history.itemsCompleted} / {history.itemsCount} 種目
      </p>
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────

type Stats = {
  currentStreak: number;
  longestStreak: number;
  totalCount: number;
};

export function calcCurrentStreak(
  byDate: Map<string, WorkoutHistory[]>,
  todayStr: string
): number {
  const yesterday = new Date(todayStr + 'T00:00:00');
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toDateString(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate()
  );

  // 今日か昨日にワークアウトがあれば streak 継続中
  const startStr = byDate.has(todayStr)
    ? todayStr
    : byDate.has(yesterdayStr)
      ? yesterdayStr
      : null;
  if (!startStr) return 0;

  let streak = 0;
  const cursor = new Date(startStr + 'T00:00:00');
  for (let i = 0; i < 365; i++) {
    const d = toDateString(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (byDate.has(d)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function calcStats(histories: WorkoutHistory[], byDate: Map<string, WorkoutHistory[]>): Stats {
  const totalCount = histories.length;
  if (totalCount === 0) return { currentStreak: 0, longestStreak: 0, totalCount: 0 };

  const today = toDateString(...todayParts());
  const currentStreak = calcCurrentStreak(byDate, today);

  let longestStreak = 0;
  let streak = 0;
  const sortedDates = [...byDate.keys()].sort();
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      streak = 1;
    } else {
      const prev = new Date(sortedDates[i - 1] + 'T00:00:00');
      const curr = new Date(sortedDates[i] + 'T00:00:00');
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      streak = diff === 1 ? streak + 1 : 1;
    }
    longestStreak = Math.max(longestStreak, streak);
  }

  return { currentStreak, longestStreak, totalCount };
}

function countMonth(byDate: Map<string, WorkoutHistory[]>, year: number, month: number): number {
  let count = 0;
  for (const [date, hs] of byDate) {
    if (date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
      count += hs.length;
    }
  }
  return count;
}

function groupByDate(histories: WorkoutHistory[]): Map<string, WorkoutHistory[]> {
  const map = new Map<string, WorkoutHistory[]>();
  for (const h of histories) {
    const key = h.startedAt.slice(0, 10);
    const list = map.get(key) ?? [];
    list.push(h);
    map.set(key, list);
  }
  return map;
}

function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayParts(): [number, number, number] {
  const t = new Date();
  return [t.getFullYear(), t.getMonth(), t.getDate()];
}

function formatDateLabel(dateStr: string): string {
  return new Intl.DateTimeFormat('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
    .format(new Date(dateStr + 'T00:00:00'));
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false })
    .format(date);
}
