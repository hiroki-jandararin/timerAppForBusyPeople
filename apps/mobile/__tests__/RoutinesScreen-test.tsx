import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import RoutinesScreen from '../app/(app)/routines/index';

jest.mock('react-native-gesture-handler/Swipeable', () => {
  const { View, Animated } = require('react-native');
  const mockProgress = new Animated.Value(1);
  return ({ children, renderRightActions }: any) => (
    <View>
      {children}
      {renderRightActions?.(mockProgress, mockProgress, 0)}
    </View>
  );
});

const mockPush = jest.fn();
const mockCreate = jest.fn().mockResolvedValue({});
const mockGetAll = jest.fn();
const mockDelete = jest.fn().mockResolvedValue({});

let _emitRoutineChanged: () => void = () => {};
jest.mock('@/features/routines/routineEvents', () => ({
  onRoutineChanged: (fn: () => void) => {
    _emitRoutineChanged = fn;
    return () => { _emitRoutineChanged = () => {}; };
  },
  emitRoutineChanged: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@timeapp/api-client', () => ({
  routineApiClient: () => ({ getAll: mockGetAll, create: mockCreate, delete: mockDelete }),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token', signOut: jest.fn() }),
}));

const sampleRoutine = {
  id: 'r1',
  name: 'テストルーティン',
  items: [{ id: 'i1', type: 'workout' as const, title: 'スクワット', durationSec: 30, voiceText: '' }],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

jest.spyOn(Alert, 'alert');

beforeEach(() => {
  _emitRoutineChanged = () => {};
  (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  mockPush.mockClear();
  mockCreate.mockClear();
  mockDelete.mockClear();
  (Alert.alert as jest.Mock).mockClear();
  mockGetAll.mockResolvedValue([sampleRoutine]);
});

describe('RoutinesScreen', () => {
  it('FABをタップすると作成方法選択画面へ遷移する', async () => {
    render(<RoutinesScreen />);

    fireEvent.press(await screen.findByText('＋'));

    expect(mockPush).toHaveBeenCalledWith('/(app)/routines/create-method');
  });

  it('ルーティン作成後にイベントを受け取ると一覧を再取得する', async () => {
    render(<RoutinesScreen />);
    await screen.findByText('テストルーティン');
    mockGetAll.mockClear();

    const newRoutine = { ...sampleRoutine, id: 'r2', name: '新しいルーティン' };
    mockGetAll.mockResolvedValueOnce([sampleRoutine, newRoutine]);
    await act(async () => { _emitRoutineChanged(); });

    expect(await screen.findByText('新しいルーティン')).toBeTruthy();
    expect(mockGetAll).toHaveBeenCalledTimes(1);
  });

  it('「複製」ボタンをタップするとルーティンが複製される', async () => {
    render(<RoutinesScreen />);

    await screen.findByText('テストルーティン');
    fireEvent.press(screen.getByText('⋮'));
    fireEvent.press(await screen.findByText('複製'));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'テストルーティン コピー' }),
    );
  });
});

describe('RoutinesScreen — CRUD 操作確認 (4.1)', () => {
  it('「編集」をタップすると編集画面へ遷移する', async () => {
    render(<RoutinesScreen />);
    await screen.findByText('テストルーティン');
    fireEvent.press(screen.getByText('⋮'));
    fireEvent.press(await screen.findByText('編集'));
    expect(mockPush).toHaveBeenCalledWith('/(app)/routines/r1/edit');
  });

  it('削除ボタンをタップすると確認ダイアログが表示される', async () => {
    render(<RoutinesScreen />);
    await screen.findByText('テストルーティン');
    fireEvent.press(screen.getByText('削除'));
    expect(Alert.alert).toHaveBeenCalledWith(
      '削除',
      expect.stringContaining('テストルーティン'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'キャンセル' }),
        expect.objectContaining({ text: '削除' }),
      ]),
    );
  });

  it('削除ダイアログで確認すると api.delete が呼ばれる', async () => {
    (Alert.alert as jest.Mock).mockImplementationOnce((_title: string, _msg: string, buttons: any[]) => {
      buttons.find((b) => b.text === '削除')?.onPress?.();
    });
    render(<RoutinesScreen />);
    await screen.findByText('テストルーティン');
    fireEvent.press(screen.getByText('削除'));
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(mockDelete).toHaveBeenCalledWith('r1');
  });
});
