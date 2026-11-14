import { renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockDispatch = jest.fn();
let mockPreventRemoveArgs: [boolean, (e: { data: { action: unknown } }) => void] | null = null;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ dispatch: mockDispatch }),
  usePreventRemove: (prevent: boolean, cb: (e: { data: { action: unknown } }) => void) => {
    mockPreventRemoveArgs = [prevent, cb];
  },
}));

import { useUnsavedChangesGuard } from '../features/routines/useUnsavedChangesGuard';

describe('useUnsavedChangesGuard', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockPreventRemoveArgs = null;
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('未変更のときは画面離脱を止めない', () => {
    renderHook(() => useUnsavedChangesGuard(false));
    expect(mockPreventRemoveArgs?.[0]).toBe(false);
  });

  it('変更ありのときは画面離脱を止める', () => {
    renderHook(() => useUnsavedChangesGuard(true));
    expect(mockPreventRemoveArgs?.[0]).toBe(true);
  });

  it('離脱を試みると、保存されていないことを知らせる警告を表示する', () => {
    renderHook(() => useUnsavedChangesGuard(true));
    mockPreventRemoveArgs![1]({ data: { action: { type: 'GO_BACK' } } });
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const [title, message] = (Alert.alert as jest.Mock).mock.calls[0];
    expect(`${title}${message}`).toContain('保存');
  });

  it('「編集を続ける」を選んでも画面は閉じない', () => {
    renderHook(() => useUnsavedChangesGuard(true));
    mockPreventRemoveArgs![1]({ data: { action: { type: 'GO_BACK' } } });
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const keep = buttons.find((b: { text: string }) => b.text === '編集を続ける');
    expect(keep.style).toBe('cancel');
    keep.onPress?.();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('「保存せずに戻る」を選ぶと、元の離脱アクションを実行する', () => {
    renderHook(() => useUnsavedChangesGuard(true));
    const action = { type: 'GO_BACK' };
    mockPreventRemoveArgs![1]({ data: { action } });
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const discard = buttons.find((b: { text: string }) => b.text === '保存せずに戻る');
    expect(discard.style).toBe('destructive');
    discard.onPress();
    expect(mockDispatch).toHaveBeenCalledWith(action);
  });
});
