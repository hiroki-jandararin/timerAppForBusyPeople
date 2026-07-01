import { Colors } from '@/constants/colors';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  markedDates: string[]; // 'YYYY-MM-DD' の配列（重複あり = 同日複数回）
  initialYear?: number;
  initialMonth?: number; // 1-indexed
};

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];

function countByDate(dates: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of dates) {
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  return map;
}

function cellColor(count: number): string {
  if (count === 0) return '#1E1E21';
  if (count === 1) return '#FF6B3560';
  if (count === 2) return '#FF6B35A0';
  return Colors.orange;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export default function CalendarHeatmap({ markedDates, initialYear, initialMonth }: Props) {
  const now = new Date();
  const [year, setYear] = useState(initialYear ?? now.getFullYear());
  const [month, setMonth] = useState(initialMonth ?? now.getMonth() + 1);

  const counts = countByDate(markedDates);
  const todayStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

  const firstDay = new Date(year, month - 1, 1);
  // 月曜始まり: 月=0, 火=1, ..., 日=6
  const firstDow = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  // カレンダーグリッドのセル配列を作成（空白 + 日付）
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // 7の倍数になるよう末尾を埋める
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={styles.container}>
      {/* ナビゲーション */}
      <View style={styles.nav}>
        <Pressable onPress={prevMonth} testID="prev-month" style={styles.navBtn} hitSlop={12}>
          <Text style={styles.navIcon}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{year}年{month}月</Text>
        <Pressable onPress={nextMonth} testID="next-month" style={styles.navBtn} hitSlop={12}>
          <Text style={styles.navIcon}>›</Text>
        </Pressable>
      </View>

      {/* 曜日ヘッダー */}
      <View style={styles.row}>
        {WEEKDAYS.map((d) => (
          <Text key={d} style={[styles.cell, styles.weekdayText]}>{d}</Text>
        ))}
      </View>

      {/* 日付グリッド */}
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((day, ci) => {
            if (!day) return <View key={ci} style={styles.cell} />;
            const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;
            const count = counts.get(dateStr) ?? 0;
            const isToday = dateStr === todayStr;
            return (
              <View
                key={ci}
                testID={count > 0 ? `day-${dateStr}` : undefined}
                style={[
                  styles.cell,
                  styles.dayCell,
                  { backgroundColor: cellColor(count) },
                  isToday && styles.todayBorder,
                ]}
              >
                <Text style={[styles.dayText, count > 0 && styles.dayTextMarked]}>
                  {day}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { padding: 4 },
  navIcon: { color: Colors.textSub, fontSize: 24, lineHeight: 28 },
  monthLabel: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center' },
  weekdayText: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
  dayCell: { borderRadius: 8 },
  todayBorder: { borderWidth: 1.5, borderColor: Colors.orange },
  dayText: { color: Colors.textMuted, fontSize: 13 },
  dayTextMarked: { color: Colors.text, fontWeight: '700' },
});
