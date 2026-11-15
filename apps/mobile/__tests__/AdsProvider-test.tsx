import { act, render, screen, waitFor } from '@testing-library/react-native';
import { AppState, Text } from 'react-native';
import { AdsProvider, useAds } from '../features/ads/AdsProvider';
import { createMockAdsService } from '../features/ads/mockAdsService';

function StateProbe() {
  const { state } = useAds();
  return <Text testID="state">{state.status === 'disabled' ? `disabled:${state.reason}` : state.status}</Text>;
}

function renderWith(service = createMockAdsService()) {
  render(
    <AdsProvider service={service}>
      <StateProbe />
    </AdsProvider>
  );
  return service;
}

let appStateListener: ((state: 'active' | 'inactive' | 'background') => void) | null = null;

const originalAppState = AppState.currentState;

function setCurrentAppState(state: 'active' | 'inactive' | 'background') {
  (AppState as { currentState: string }).currentState = state;
}

beforeEach(() => {
  appStateListener = null;
  setCurrentAppState('active');
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_type: string, listener: typeof appStateListener) => {
    appStateListener = listener;
    return { remove: jest.fn() };
  }) as never);
});

afterEach(() => {
  (AppState as { currentState: string }).currentState = originalAppState;
  jest.restoreAllMocks();
});

describe('AdsProvider', () => {
  it('子の描画をブロックせず、初期化中を経て利用可能になる', async () => {
    renderWith();
    expect(screen.getByTestId('state').props.children).toBe('initializing');
    await waitFor(() => expect(screen.getByTestId('state').props.children).toBe('ready'));
  });

  it('初期化に失敗したら無効（初期化失敗）になる', async () => {
    renderWith(createMockAdsService({ initResult: { ok: false, reason: 'init-failed' } }));
    await waitFor(() => expect(screen.getByTestId('state').props.children).toBe('disabled:init-failed'));
  });

  it('同意が得られなければ無効（同意なし）になる', async () => {
    renderWith(createMockAdsService({ initResult: { ok: false, reason: 'consent-denied' } }));
    await waitFor(() => expect(screen.getByTestId('state').props.children).toBe('disabled:consent-denied'));
  });

  it('ユニット ID がなければ初期化せず、無効（ユニット ID なし）になる', async () => {
    const service = renderWith(createMockAdsService({ bannerUnitId: null }));
    await waitFor(() => expect(screen.getByTestId('state').props.children).toBe('disabled:unit-id-missing'));
    expect(service.initializeCallCount).toBe(0);
  });

  it('アプリが前面になるまで初期化を呼ばない', async () => {
    setCurrentAppState('background');
    const service = renderWith();
    expect(service.initializeCallCount).toBe(0);
    expect(screen.getByTestId('state').props.children).toBe('initializing');

    await act(async () => {
      appStateListener?.('active');
    });
    await waitFor(() => expect(screen.getByTestId('state').props.children).toBe('ready'));
    expect(service.initializeCallCount).toBe(1);
  });

  it('前面に何度戻っても初期化は1回だけ', async () => {
    setCurrentAppState('inactive');
    const service = renderWith();
    await act(async () => {
      appStateListener?.('active');
      appStateListener?.('active');
    });
    await waitFor(() => expect(screen.getByTestId('state').props.children).toBe('ready'));
    expect(service.initializeCallCount).toBe(1);
  });

  it('初期化の完了前にアンマウントしても、状態更新の警告を出さない', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(
      <AdsProvider service={createMockAdsService()}>
        <StateProbe />
      </AdsProvider>
    );
    unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe('useAds', () => {
  it('プロバイダーの外では無効（プロバイダーなし）を返す', () => {
    render(<StateProbe />);
    expect(screen.getByTestId('state').props.children).toBe('disabled:no-provider');
  });
});
