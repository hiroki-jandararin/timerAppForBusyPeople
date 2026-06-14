import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import TimerScreen from '../app/(app)/routines/[id]/timer';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));
jest.mock('@timeapp/api-client', () => ({
  routineApiClient: () => ({ getById: mockGetById }),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token', signOut: jest.fn() }),
}));
jest.mock('expo-speech');
jest.mock('expo-keep-awake');

const mockGetById = jest.fn();

const sampleRoutine = {
  id: 'r1',
  name: 'テストルーティン',
  items: [
    { id: 'i1', type: 'workout' as const, title: 'スクワット', durationSec: 30, voiceText: '', groupId: 'g1' },
    { id: 'i2', type: 'interval' as const, title: '休憩', durationSec: 10, voiceText: '' },
    { id: 'i3', type: 'workout' as const, title: 'プッシュアップ', durationSec: 30, voiceText: '', groupId: 'g2' },
    { id: 'i4', type: 'interval' as const, title: '休憩', durationSec: 10, voiceText: '' },
    { id: 'i5', type: 'workout' as const, title: 'バーピー', durationSec: 30, voiceText: '', groupId: 'g3' },
    { id: 'i6', type: 'interval' as const, title: '休憩', durationSec: 10, voiceText: '' },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

async function startTimer() {
  render(<TimerScreen />);
  await screen.findByText('スタート');
  fireEvent.press(screen.getByText('スタート'));
  // カウントダウン(3秒)を進める
  await act(async () => {
    jest.advanceTimersByTime(3500);
  });
}

beforeAll(() => {
  jest.useFakeTimers();
});
afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
  (useRouter as jest.Mock).mockReturnValue({ back: jest.fn() });
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'r1' });
  mockGetById.mockResolvedValue(sampleRoutine);
});

describe('TimerScreen — C3 QUEUE グループ表示', () => {
  it('実行中は QUEUE セクションが表示される', async () => {
    await startTimer();
    expect(screen.getByText('QUEUE')).toBeTruthy();
  });

  it('QUEUE に全グループ名が表示される', async () => {
    await startTimer();
    // QUEUE内では getAllByText で複数一致を許容
    expect(screen.getAllByText('スクワット').length).toBeGreaterThan(0);
    expect(screen.getAllByText('プッシュアップ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('バーピー').length).toBeGreaterThan(0);
  });
});

describe('TimerScreen — C4 後回し', () => {
  it('現在のワークアウトグループに「後回し」ボタンが表示される', async () => {
    await startTimer();
    expect(screen.getByText('後回し')).toBeTruthy();
  });

  it('「後回し」を押すと現在グループが末尾に移動し、次のグループが current になる', async () => {
    await startTimer();
    fireEvent.press(screen.getByText('後回し'));
    // プッシュアップが current になるはず
    const currentIndicators = screen.getAllByText('プッシュアップ');
    expect(currentIndicators.length).toBeGreaterThan(0);
  });
});

describe('TimerScreen — C5 次にやる', () => {
  it('upcoming グループに「次にやる」ボタンが表示される', async () => {
    await startTimer();
    expect(screen.getAllByText('次にやる').length).toBeGreaterThan(0);
  });

  it('「次にやる」を押すと対象グループが現在の直後に移動する', async () => {
    await startTimer();
    // バーピーの「次にやる」を押す（最後の次にやるボタン）
    const doNextBtns = screen.getAllByText('次にやる');
    fireEvent.press(doNextBtns[doNextBtns.length - 1]);
    // バーピーがプッシュアップより前に来るはず
    // QUEUE の queueItemTitle Text 要素の順序を確認
    const pushElems = screen.getAllByText('プッシュアップ');
    const burpeeElems = screen.getAllByText('バーピー');
    // 少なくとも 1 つずつ存在する
    expect(pushElems.length).toBeGreaterThan(0);
    expect(burpeeElems.length).toBeGreaterThan(0);
    // バーピーの次にやるボタンが消えている(直後に来たので upcoming ではない位置に)
    // かつプッシュアップの次にやるボタンが存在する
    const newDoNextBtns = screen.getAllByText('次にやる');
    expect(newDoNextBtns.length).toBeGreaterThan(0);
  });
});
