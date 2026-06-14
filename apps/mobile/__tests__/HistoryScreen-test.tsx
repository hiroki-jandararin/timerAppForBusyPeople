import { render, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import HistoryScreen from '../app/(app)/history';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@timeapp/api-client', () => ({
  workoutHistoryApiClient: () => ({ getAll: mockGetAll }),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token', signOut: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

const mockGetAll = jest.fn();

const sampleHistories = [
  {
    id: 'h1',
    userId: 'u1',
    routineId: 'r1',
    routineName: '腕トレーニング',
    startedAt: '2026-06-14T09:00:00.000Z',
    finishedAt: '2026-06-14T09:20:00.000Z',
    completed: true,
    itemsCount: 24,
    itemsCompleted: 24,
    createdAt: '2026-06-14T09:20:00.000Z',
  },
  {
    id: 'h2',
    userId: 'u1',
    routineId: 'r1',
    routineName: '胸トレーニング',
    startedAt: '2026-06-13T10:00:00.000Z',
    finishedAt: '2026-06-13T10:15:00.000Z',
    completed: false,
    itemsCount: 20,
    itemsCompleted: 10,
    createdAt: '2026-06-13T10:15:00.000Z',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue({ back: jest.fn() });
  mockGetAll.mockResolvedValue(sampleHistories);
});

describe('HistoryScreen', () => {
  it('「ワークアウト履歴」見出しが表示される', async () => {
    render(<HistoryScreen />);
    expect(await screen.findByText('ワークアウト履歴')).toBeTruthy();
  });

  it('通算回数が表示される', async () => {
    render(<HistoryScreen />);
    await screen.findByText('ワークアウト履歴');
    expect(screen.getByText('通算回数')).toBeTruthy();
  });

  it('履歴のルーティン名が一覧表示される', async () => {
    render(<HistoryScreen />);
    expect(await screen.findByText('腕トレーニング')).toBeTruthy();
    expect(screen.getByText('胸トレーニング')).toBeTruthy();
  });

  it('completed:true の履歴には「完了」バッジが表示される', async () => {
    render(<HistoryScreen />);
    await screen.findByText('腕トレーニング');
    expect(screen.getByText('完了')).toBeTruthy();
  });

  it('completed:false の履歴には「中断」バッジが表示される', async () => {
    render(<HistoryScreen />);
    await screen.findByText('胸トレーニング');
    expect(screen.getByText('中断')).toBeTruthy();
  });

  it('履歴がない場合は空状態メッセージが表示される', async () => {
    mockGetAll.mockResolvedValue([]);
    render(<HistoryScreen />);
    expect(await screen.findByText('まだ履歴がありません')).toBeTruthy();
  });
});
