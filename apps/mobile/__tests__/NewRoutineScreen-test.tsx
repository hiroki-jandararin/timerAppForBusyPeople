import { fireEvent, render, screen } from '@testing-library/react-native';
import { ROUTINE_TEMPLATES } from '@timeapp/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import NewRoutineScreen from '../app/(app)/routines/new';

const mockDismissAll = jest.fn();
const mockCreate = jest.fn().mockResolvedValue({});
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));
jest.mock('@timeapp/api-client', () => ({
  routineApiClient: () => ({ create: mockCreate }),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));
jest.mock('@/features/routines/routineEvents', () => ({
  emitRoutineChanged: jest.fn(),
}));

beforeEach(() => {
  (useRouter as jest.Mock).mockReturnValue({ dismissAll: mockDismissAll });
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  mockDismissAll.mockClear();
  mockCreate.mockClear();
});

describe('NewRoutineScreen', () => {
  it('templateId なしで開くとルーティン名は空', () => {
    render(<NewRoutineScreen />);
    expect(screen.getByPlaceholderText('例: 朝トレ10分').props.value).toBe('');
  });

  it('templateId ありで開くとテンプレート名が初期値として入る', () => {
    const template = ROUTINE_TEMPLATES[0];
    (useLocalSearchParams as jest.Mock).mockReturnValue({ templateId: template.id });

    render(<NewRoutineScreen />);

    expect(screen.getByPlaceholderText('例: 朝トレ10分').props.value).toBe(template.name);
  });

  it('templateId ありで開くとテンプレートの最初のアイテム名が表示される', () => {
    const template = ROUTINE_TEMPLATES[0];
    (useLocalSearchParams as jest.Mock).mockReturnValue({ templateId: template.id });

    render(<NewRoutineScreen />);

    expect(screen.getAllByText(template.items[0].title).length).toBeGreaterThan(0);
  });

  it('目標時間未入力で保存するとエラーメッセージが表示される', async () => {
    const template = ROUTINE_TEMPLATES[0];
    (useLocalSearchParams as jest.Mock).mockReturnValue({ templateId: template.id });

    render(<NewRoutineScreen />);
    fireEvent.press(screen.getByText('保存'));

    expect(await screen.findByText('目標時間を設定してください')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('目標時間を入力して保存すると dismissAll でマイルーティン画面へ戻る', async () => {
    const template = ROUTINE_TEMPLATES[0];
    (useLocalSearchParams as jest.Mock).mockReturnValue({ templateId: template.id });

    render(<NewRoutineScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('目標時間（分）'), '20');
    fireEvent.press(screen.getByText('保存'));

    await screen.findByText('保存');
    expect(mockCreate).toHaveBeenCalled();
    expect(mockDismissAll).toHaveBeenCalled();
  });

  it('目標時間エラー表示後に入力するとエラーが消える', async () => {
    const template = ROUTINE_TEMPLATES[0];
    (useLocalSearchParams as jest.Mock).mockReturnValue({ templateId: template.id });

    render(<NewRoutineScreen />);
    fireEvent.press(screen.getByText('保存'));
    expect(await screen.findByText('目標時間を設定してください')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('目標時間（分）'), '20');
    expect(screen.queryByText('目標時間を設定してください')).toBeNull();
  });
});
