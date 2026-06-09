import { fireEvent, render, screen } from '@testing-library/react-native';
import RoutineForm from '../components/RoutineForm';

const emptyRoutine = {
  id: 'r1',
  name: 'テスト',
  items: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('RoutineForm — まとめてセット追加', () => {
  it('「セットを追加」ボタンが存在する', () => {
    render(<RoutineForm title="作成" initialValues={emptyRoutine} onSubmit={jest.fn()} />);
    expect(screen.getByText('セットを追加')).toBeTruthy();
  });

  it('「セットを追加」を押すとセットフォームが開く', () => {
    render(<RoutineForm title="作成" initialValues={emptyRoutine} onSubmit={jest.fn()} />);

    fireEvent.press(screen.getByText('セットを追加'));

    expect(screen.getByPlaceholderText('種目名')).toBeTruthy();
  });

  it('フォームに入力して「追加」を押すとアイテムが増える', () => {
    render(<RoutineForm title="作成" initialValues={emptyRoutine} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByText('セットを追加'));

    fireEvent.changeText(screen.getByPlaceholderText('種目名'), 'ベンチプレス');
    fireEvent.press(screen.getByText('追加'));

    expect(screen.getAllByPlaceholderText('アイテム名').length).toBeGreaterThan(0);
  });

  it('3セット分のアイテムが追加される（既存1 + 種目×3 + 休憩×2 = 6アイテム）', () => {
    render(<RoutineForm title="作成" initialValues={emptyRoutine} onSubmit={jest.fn()} />);
    fireEvent.press(screen.getByText('セットを追加'));

    fireEvent.changeText(screen.getByPlaceholderText('種目名'), 'スクワット');
    fireEvent.press(screen.getByText('追加'));

    expect(screen.getAllByPlaceholderText('アイテム名').length).toBe(6);
  });
});
