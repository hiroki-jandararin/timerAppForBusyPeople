import { fireEvent, render, screen } from '@testing-library/react-native';
import RoutineForm from '../components/RoutineForm';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

const twoItemRoutine = {
  id: 'r1',
  name: 'テスト',
  items: [
    { id: 'i1', type: 'workout' as const, title: 'スクワット', durationSec: 30, voiceText: '' },
    { id: 'i2', type: 'workout' as const, title: 'プッシュアップ', durationSec: 20, voiceText: '' },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('RoutineForm — アイテム並び替え', () => {
  it('「↑」ボタンが各アイテムカードに存在する', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);
    expect(screen.getAllByText('↑').length).toBe(2);
  });

  it('「↓」ボタンが各アイテムカードに存在する', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);
    expect(screen.getAllByText('↓').length).toBe(2);
  });

  it('2番目のアイテムの「↑」を押すと順番が入れ替わる', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);

    const upButtons = screen.getAllByText('↑');
    fireEvent.press(upButtons[1]);

    const inputs = screen.getAllByPlaceholderText('アイテム名');
    expect(inputs[0].props.value).toBe('プッシュアップ');
    expect(inputs[1].props.value).toBe('スクワット');
  });
});

describe('RoutineForm — アイテム複製', () => {
  it('「複製」ボタンが各アイテムカードに存在する', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);
    expect(screen.getAllByText('複製').length).toBe(2);
  });

  it('「複製」を押すとアイテムが1つ増える', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);

    fireEvent.press(screen.getAllByText('複製')[0]);

    expect(screen.getAllByPlaceholderText('アイテム名').length).toBe(3);
  });

  it('複製されたアイテムは元と同じタイトルを持つ', () => {
    render(<RoutineForm title="編集" initialValues={twoItemRoutine} onSubmit={jest.fn()} />);

    fireEvent.press(screen.getAllByText('複製')[0]);

    const inputs = screen.getAllByPlaceholderText('アイテム名');
    expect(inputs[0].props.value).toBe('スクワット');
    expect(inputs[1].props.value).toBe('スクワット');
  });
});
