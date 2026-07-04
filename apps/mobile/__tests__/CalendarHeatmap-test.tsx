import { fireEvent, render, screen } from '@testing-library/react-native';
import CalendarHeatmap from '../components/CalendarHeatmap';

const sampleDates = ['2026-06-01', '2026-06-01', '2026-06-14', '2026-06-28'];

describe('CalendarHeatmap', () => {
  it('月ラベルが表示される', () => {
    render(<CalendarHeatmap markedDates={sampleDates} initialYear={2026} initialMonth={6} />);
    expect(screen.getByText('2026年6月')).toBeTruthy();
  });

  it('曜日ヘッダーが表示される', () => {
    render(<CalendarHeatmap markedDates={sampleDates} initialYear={2026} initialMonth={6} />);
    expect(screen.getByText('月')).toBeTruthy();
    expect(screen.getByText('日')).toBeTruthy();
  });

  it('前月ボタンで月が変わる', () => {
    render(<CalendarHeatmap markedDates={sampleDates} initialYear={2026} initialMonth={6} />);
    fireEvent.press(screen.getByTestId('prev-month'));
    expect(screen.getByText('2026年5月')).toBeTruthy();
  });

  it('翌月ボタンで月が変わる', () => {
    render(<CalendarHeatmap markedDates={sampleDates} initialYear={2026} initialMonth={6} />);
    fireEvent.press(screen.getByTestId('next-month'));
    expect(screen.getByText('2026年7月')).toBeTruthy();
  });

  it('ワークアウトのある日のセルにtestIDが設定される', () => {
    render(<CalendarHeatmap markedDates={sampleDates} initialYear={2026} initialMonth={6} />);
    expect(screen.getByTestId('day-2026-06-01')).toBeTruthy();
    expect(screen.getByTestId('day-2026-06-14')).toBeTruthy();
    expect(screen.getByTestId('day-2026-06-28')).toBeTruthy();
  });
});
