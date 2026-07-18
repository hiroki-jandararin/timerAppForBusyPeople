import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AccountScreen from '../app/(app)/account';

const mockSignOut = jest.fn();
const mockDeleteAccount = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'test-token', signOut: mockSignOut }),
}));

jest.mock('@timeapp/api-client', () => ({
  authApiClient: () => ({ deleteAccount: mockDeleteAccount }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.spyOn(Alert, 'alert');

beforeEach(() => {
  jest.clearAllMocks();
});

it('アカウント削除ボタンが表示される', () => {
  render(<AccountScreen />);
  expect(screen.getByText('アカウントを削除')).toBeTruthy();
});

it('削除ボタンを押すと確認ダイアログが表示される', () => {
  render(<AccountScreen />);
  fireEvent.press(screen.getByText('アカウントを削除'));
  expect(Alert.alert).toHaveBeenCalledWith(
    'アカウントを削除',
    expect.any(String),
    expect.arrayContaining([
      expect.objectContaining({ text: 'キャンセル' }),
      expect.objectContaining({ text: '削除する' }),
    ])
  );
});

it('確認後にAPIを呼びサインアウトする', async () => {
  mockDeleteAccount.mockResolvedValue(undefined);
  (Alert.alert as jest.Mock).mockImplementationOnce((_title, _message, buttons) => {
    const deleteButton = (buttons as any[]).find((b) => b.text === '削除する');
    deleteButton?.onPress?.();
  });

  render(<AccountScreen />);
  fireEvent.press(screen.getByText('アカウントを削除'));

  await waitFor(() => {
    expect(mockDeleteAccount).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalled();
  });
});

it('API失敗時にエラーアラートが表示される', async () => {
  mockDeleteAccount.mockRejectedValue(new Error('削除失敗'));
  (Alert.alert as jest.Mock).mockImplementationOnce((_title, _message, buttons) => {
    const deleteButton = (buttons as any[]).find((b) => b.text === '削除する');
    deleteButton?.onPress?.();
  });

  render(<AccountScreen />);
  fireEvent.press(screen.getByText('アカウントを削除'));

  await waitFor(() => {
    expect(Alert.alert).toHaveBeenCalledWith('エラー', expect.any(String));
  });
});
