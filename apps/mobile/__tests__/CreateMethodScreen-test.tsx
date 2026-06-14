import { fireEvent, render, screen } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

import CreateMethodScreen from '../app/(app)/routines/create-method';

beforeEach(() => jest.clearAllMocks());

describe('CreateMethodScreen — A1 作成方法選択', () => {
  it('「新規作成」タイトルが表示される', () => {
    render(<CreateMethodScreen />);
    expect(screen.getByText('新規作成')).toBeTruthy();
  });

  it('「AIで作成」カードが表示される', () => {
    render(<CreateMethodScreen />);
    expect(screen.getByText('AIで作成')).toBeTruthy();
  });

  it('「テンプレートから選ぶ」カードが表示される', () => {
    render(<CreateMethodScreen />);
    expect(screen.getByText('テンプレートから選ぶ')).toBeTruthy();
  });

  it('「最初から作る」カードが表示される', () => {
    render(<CreateMethodScreen />);
    expect(screen.getByText('最初から作る')).toBeTruthy();
  });

  it('「AIで作成」を押すと ai-prompt 画面へ遷移する', () => {
    render(<CreateMethodScreen />);
    fireEvent.press(screen.getByText('AIで作成'));
    expect(mockPush).toHaveBeenCalledWith('/(app)/routines/ai-prompt');
  });

  it('「テンプレートから選ぶ」を押すと templates 画面へ遷移する', () => {
    render(<CreateMethodScreen />);
    fireEvent.press(screen.getByText('テンプレートから選ぶ'));
    expect(mockPush).toHaveBeenCalledWith('/(app)/routines/templates');
  });

  it('「最初から作る」を押すと new 画面へ遷移する', () => {
    render(<CreateMethodScreen />);
    fireEvent.press(screen.getByText('最初から作る'));
    expect(mockPush).toHaveBeenCalledWith('/(app)/routines/new');
  });
});
