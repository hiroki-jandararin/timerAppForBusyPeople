import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useScreenFocus } from '../features/ads/useScreenFocus';

// expo-router の useFocusEffect を、テストからフォーカスの付与・喪失を操作できるモックに差し替える
let mockEffect: (() => void | (() => void)) | null = null;
let mockCleanup: (() => void) | null = null;

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    mockEffect = effect;
  },
}));

function focus() {
  mockCleanup = (mockEffect?.() as (() => void) | undefined) ?? null;
}

function blur() {
  mockCleanup?.();
  mockCleanup = null;
}

function Probe() {
  const focused = useScreenFocus();
  return <Text testID="focused">{String(focused)}</Text>;
}

beforeEach(() => {
  mockEffect = null;
  mockCleanup = null;
});

describe('useScreenFocus', () => {
  it('フォーカスされるまでは偽', () => {
    render(<Probe />);
    expect(screen.getByTestId('focused').props.children).toBe('false');
  });

  it('フォーカスされると真、フォーカスを失うと偽になる', () => {
    render(<Probe />);
    act(() => focus());
    expect(screen.getByTestId('focused').props.children).toBe('true');
    act(() => blur());
    expect(screen.getByTestId('focused').props.children).toBe('false');
  });

  it('再度フォーカスされると真に戻る', () => {
    render(<Probe />);
    act(() => focus());
    act(() => blur());
    act(() => focus());
    expect(screen.getByTestId('focused').props.children).toBe('true');
  });
});
