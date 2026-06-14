import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

const mockGenerateAiRoutine = jest.fn();
jest.mock('@/features/ai/aiRoutineService', () => ({
  generateAiRoutine: (...args: unknown[]) => mockGenerateAiRoutine(...args),
}));

jest.mock('@/features/ai/aiRoutineStore', () => ({
  setPendingAiRoutine: jest.fn(),
}));

import AiPromptScreen from '../app/(app)/routines/ai-prompt';
import { setPendingAiRoutine } from '@/features/ai/aiRoutineStore';

beforeEach(() => jest.clearAllMocks());

describe('AiPromptScreen — A2 AI自動生成画面', () => {
  it('「どこを鍛える？」セクションが表示される', () => {
    render(<AiPromptScreen />);
    expect(screen.getByText('どこを鍛える？')).toBeTruthy();
  });

  it('部位チップが表示される', () => {
    render(<AiPromptScreen />);
    expect(screen.getByText('胸')).toBeTruthy();
    expect(screen.getByText('背中')).toBeTruthy();
    expect(screen.getByText('肩')).toBeTruthy();
  });

  it('時間プリセットが表示される', () => {
    render(<AiPromptScreen />);
    expect(screen.getByText('10分')).toBeTruthy();
    expect(screen.getByText('30分')).toBeTruthy();
    expect(screen.getByText('60分')).toBeTruthy();
  });

  it('部位と時間を選んで「生成する」を押すと generateAiRoutine が呼ばれる', async () => {
    mockGenerateAiRoutine.mockResolvedValueOnce({
      id: 'ai-r1',
      name: '胸トレ10分',
      items: [{ id: 'i1', type: 'workout', title: 'ベンチプレス', durationSec: 60, voiceText: '' }],
      createdAt: '',
      updatedAt: '',
    });

    render(<AiPromptScreen />);

    fireEvent.press(screen.getByText('胸'));
    fireEvent.press(screen.getByText('10分'));
    fireEvent.press(screen.getByText('生成する'));

    await waitFor(() => expect(mockGenerateAiRoutine).toHaveBeenCalledWith(
      'test-token',
      expect.stringContaining('胸'),
      600,
    ));
  });

  it('生成成功後に setPendingAiRoutine が呼ばれ /routines/new に遷移する', async () => {
    const routine = {
      id: 'ai-r1',
      name: '胸トレ10分',
      items: [{ id: 'i1', type: 'workout', title: 'ベンチプレス', durationSec: 60, voiceText: '' }],
      createdAt: '',
      updatedAt: '',
    };
    mockGenerateAiRoutine.mockResolvedValueOnce(routine);

    render(<AiPromptScreen />);
    fireEvent.press(screen.getByText('胸'));
    fireEvent.press(screen.getByText('10分'));
    fireEvent.press(screen.getByText('生成する'));

    await waitFor(() => expect(setPendingAiRoutine).toHaveBeenCalledWith(routine));
    expect(mockPush).toHaveBeenCalledWith('/(app)/routines/new');
  });

  it('生成エラー時にエラーメッセージが表示される', async () => {
    mockGenerateAiRoutine.mockRejectedValueOnce(new Error('failed'));

    render(<AiPromptScreen />);
    fireEvent.press(screen.getByText('胸'));
    fireEvent.press(screen.getByText('10分'));
    fireEvent.press(screen.getByText('生成する'));

    await waitFor(() =>
      expect(screen.getByText('生成に失敗しました。もう一度お試しください。')).toBeTruthy()
    );
  });
});
