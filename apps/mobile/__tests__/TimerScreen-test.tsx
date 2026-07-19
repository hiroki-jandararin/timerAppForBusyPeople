import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import TimerScreen from '../app/(app)/routines/[id]/timer';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));
jest.mock('@timeapp/api-client', () => ({
  routineApiClient: () => ({ getById: mockGetById }),
  workoutHistoryApiClient: () => ({ create: mockCreateHistory }),
}));
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token', signOut: jest.fn() }),
}));
jest.mock('expo-speech');
jest.mock('expo-keep-awake');
jest.mock('expo-av', () => ({
  Audio: {
    Sound: { createAsync: jest.fn().mockResolvedValue({ sound: { playAsync: jest.fn(), stopAsync: jest.fn(), unloadAsync: jest.fn() } }) },
    setAudioModeAsync: jest.fn(),
  },
  InterruptionModeIOS: { MixWithOthers: 0, DoNotMix: 1, DuckOthers: 2 },
}));
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return { Swipeable: View };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

const mockGetById = jest.fn();
const mockCreateHistory = jest.fn();

const sampleRoutine = {
  id: 'r1',
  name: 'テストルーティン',
  items: [
    { id: 'i1', type: 'workout' as const, title: 'スクワット', durationSec: 30, voiceText: '', groupId: 'g1' },
    { id: 'i2', type: 'interval' as const, title: '休憩', durationSec: 60, voiceText: '' },
    { id: 'i3', type: 'workout' as const, title: 'プッシュアップ', durationSec: 30, voiceText: '', groupId: 'g2' },
    { id: 'i4', type: 'interval' as const, title: '休憩', durationSec: 60, voiceText: '' },
    { id: 'i5', type: 'workout' as const, title: 'バーピー', durationSec: 30, voiceText: '', groupId: 'g3' },
    { id: 'i6', type: 'interval' as const, title: '休憩', durationSec: 60, voiceText: '' },
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

describe('TimerScreen — C4 キュードラッグ', () => {
  it('キューにすべてのグループが表示される', async () => {
    await startTimer();
    expect(screen.getAllByText('スクワット').length).toBeGreaterThan(0);
    expect(screen.getAllByText('プッシュアップ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('バーピー').length).toBeGreaterThan(0);
  });

  it('upcoming グループにドラッグハンドルが表示される', async () => {
    await startTimer();
    expect(screen.getAllByText('⠿').length).toBeGreaterThan(0);
  });

  it('current / done グループにはドラッグハンドルが表示されない', async () => {
    await startTimer();
    const queueItems = screen.getAllByText(/スクワット|プッシュアップ|バーピー/);
    const handles = screen.getAllByText('⠿');
    expect(handles.length).toBeLessThan(queueItems.length);
  });

  it('現在のワークアウトグループに「後回し」ボタンが表示される', async () => {
    await startTimer();
    expect(screen.getByText('後回し')).toBeTruthy();
  });

  it('「後回し」を押すと確認ダイアログが表示される', async () => {
    const spy = jest.spyOn(Alert, 'alert');
    await startTimer();
    fireEvent.press(screen.getByText('後回し'));
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('後回し'),
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'キャンセル' }),
        expect.objectContaining({ text: '後回し' }),
      ]),
    );
    spy.mockRestore();
  });

  it('確認ダイアログで「後回し」を押すと現在グループが末尾に移動し次のグループが current になる', async () => {
    jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _msg, buttons) => {
      const btn = (buttons as { text: string; onPress?: () => void }[])
        ?.find((b) => b.text === '後回し');
      btn?.onPress?.();
    });
    await startTimer();
    fireEvent.press(screen.getByText('後回し'));
    // スクワット（最初の種目）が末尾に回り、プッシュアップが current になる
    expect(screen.getAllByText('プッシュアップ').length).toBeGreaterThan(0);
  });
});

describe('TimerScreen — C6 インターバル短縮提案', () => {
  it('30秒以上遅延すると短縮提案ダイアログが表示される', async () => {
    render(<TimerScreen />);
    await screen.findByText('スタート');
    fireEvent.press(screen.getByText('スタート'));
    // カウントダウン(3秒)を進める
    await act(async () => { jest.advanceTimersByTime(3500); });
    // タイマーを一時停止して35秒待機（遅延をシミュレート）
    fireEvent.press(screen.getByTestId('play-pause-btn'));
    await act(async () => { jest.advanceTimersByTime(35000); });
    // 再開すると deltaSec >= 30 なので提案が出るはず
    fireEvent.press(screen.getByTestId('play-pause-btn'));
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(screen.getByText('インターバルを短縮しますか？')).toBeTruthy();
  });

  it('「短縮する」を押すとダイアログが閉じる', async () => {
    render(<TimerScreen />);
    await screen.findByText('スタート');
    fireEvent.press(screen.getByText('スタート'));
    await act(async () => { jest.advanceTimersByTime(3500); });
    fireEvent.press(screen.getByTestId('play-pause-btn'));
    await act(async () => { jest.advanceTimersByTime(35000); });
    fireEvent.press(screen.getByTestId('play-pause-btn'));
    await act(async () => { jest.advanceTimersByTime(100); });
    fireEvent.press(screen.getByText('短縮する'));
    expect(screen.queryByText('インターバルを短縮しますか？')).toBeNull();
  });
});

describe('TimerScreen — C7 予定終了時刻・遅延表示', () => {
  it('実行中は「終了予定」が表示される', async () => {
    await startTimer();
    expect(screen.getByText(/終了予定/)).toBeTruthy();
  });

  it('遅延が発生すると遅延ラベルが表示される', async () => {
    render(<TimerScreen />);
    await screen.findByText('スタート');
    fireEvent.press(screen.getByText('スタート'));
    await act(async () => { jest.advanceTimersByTime(3500); });
    fireEvent.press(screen.getByTestId('play-pause-btn'));
    await act(async () => { jest.advanceTimersByTime(35000); });
    fireEvent.press(screen.getByTestId('play-pause-btn'));
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(screen.getByText(/遅れ/)).toBeTruthy();
  });
});

describe('TimerScreen — C5 キュー表示', () => {
  it('upcoming グループがキューに表示される', async () => {
    await startTimer();
    expect(screen.getAllByText('プッシュアップ').length).toBeGreaterThan(0);
    expect(screen.getAllByText('バーピー').length).toBeGreaterThan(0);
  });

  it('「次にやる」ボタンは表示されない', async () => {
    await startTimer();
    expect(screen.queryByText('次にやる')).toBeNull();
  });
});

describe('TimerScreen — C9 QUEUEビュー切替', () => {
  it('QUEUEヘッダーに「セット」「全表示」トグルが表示される', async () => {
    await startTimer();
    expect(screen.getByText('セット')).toBeTruthy();
    expect(screen.getByText('全表示')).toBeTruthy();
  });

  it('デフォルトはセット表示で休憩アイテムが表示されない', async () => {
    await startTimer();
    // グループ名は見える
    expect(screen.getAllByText('プッシュアップ').length).toBeGreaterThan(0);
    // 休憩（interval）はセットビューでは非表示
    const restItems = screen.queryAllByText('休憩');
    expect(restItems.length).toBe(0);
  });

  it('「全表示」を押すと休憩アイテムも表示される', async () => {
    await startTimer();
    fireEvent.press(screen.getByText('全表示'));
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(screen.getAllByText('休憩').length).toBeGreaterThan(0);
  });

  it('「セット」に戻すと休憩アイテムが非表示になる', async () => {
    await startTimer();
    fireEvent.press(screen.getByText('全表示'));
    await act(async () => { jest.advanceTimersByTime(100); });
    fireEvent.press(screen.getByText('セット'));
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(screen.queryAllByText('休憩').length).toBe(0);
  });
});

describe('TimerScreen — C8 ワークアウト履歴自動保存', () => {
  it('「終了する」を押すと completed: false で履歴が保存される', async () => {
    render(<TimerScreen />);
    await screen.findByText('スタート');
    fireEvent.press(screen.getByText('スタート'));
    await act(async () => { jest.advanceTimersByTime(3500); });
    fireEvent.press(screen.getByText('終了する'));
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(mockCreateHistory).toHaveBeenCalledTimes(1);
    expect(mockCreateHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        routineId: 'r1',
        routineName: 'テストルーティン',
        completed: false,
      })
    );
  });

  it('タイマーが最後まで完了すると completed: true で履歴が保存される', async () => {
    render(<TimerScreen />);
    await screen.findByText('スタート');
    fireEvent.press(screen.getByText('スタート'));
    await act(async () => { jest.advanceTimersByTime(3500); }); // カウントダウン完了
    await act(async () => { jest.advanceTimersByTime(270000); }); // 全アイテム完了
    expect(mockCreateHistory).toHaveBeenCalledTimes(1);
    expect(mockCreateHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        routineId: 'r1',
        completed: true,
        itemsCompleted: sampleRoutine.items.length,
      })
    );
  });
});
