import { fireEvent, render, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import RoutinesScreen from '../app/(app)/routines/index';

const mockPush = jest.fn();
const mockCreate = jest.fn().mockResolvedValue({});
const mockGetAll = jest.fn();

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('@timeapp/api-client', () => ({
  routineApiClient: () => ({ getAll: mockGetAll, create: mockCreate, delete: jest.fn() }),
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

beforeEach(() => {
  (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  mockPush.mockClear();
  mockCreate.mockClear();
  mockGetAll.mockResolvedValue([sampleRoutine]);
});

describe('RoutinesScreen', () => {
  it('FABをタップすると作成方法選択画面へ遷移する', async () => {
    render(<RoutinesScreen />);

    fireEvent.press(await screen.findByText('＋'));

    expect(mockPush).toHaveBeenCalledWith('/(app)/routines/create-method');
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
