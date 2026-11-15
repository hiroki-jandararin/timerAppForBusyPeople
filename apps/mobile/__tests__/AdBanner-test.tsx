import { act, render, screen } from '@testing-library/react-native';
import { AppState, StyleSheet } from 'react-native';
import { AdBanner } from '../features/ads/AdBanner';
import type { BannerViewProps } from '../features/ads/adsTypes';
import { AdsProvider } from '../features/ads/AdsProvider';
import { createMockAdsService } from '../features/ads/mockAdsService';

let mockFocused = true;
jest.mock('../features/ads/useScreenFocus', () => ({
  useScreenFocus: () => mockFocused,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

const originalAppState = AppState.currentState;
let appStateListener: ((state: 'active' | 'inactive' | 'background') => void) | null = null;

beforeEach(() => {
  mockFocused = true;
  appStateListener = null;
  (AppState as { currentState: string }).currentState = 'active';
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_type: string, listener: typeof appStateListener) => {
    appStateListener = listener;
    return { remove: jest.fn() };
  }) as never);
});

afterEach(() => {
  (AppState as { currentState: string }).currentState = originalAppState;
  jest.restoreAllMocks();
});

async function renderReady(service = createMockAdsService()) {
  const view = render(
    <AdsProvider service={service}>
      <AdBanner />
    </AdsProvider>
  );
  // 初期化の完了（ready）を待つ
  await act(async () => {
    await Promise.resolve();
  });
  return { service, ...view };
}

describe('AdBanner', () => {
  it('初期化が終わるまでは何も描画しない', () => {
    render(
      <AdsProvider service={createMockAdsService()}>
        <AdBanner />
      </AdsProvider>
    );
    expect(screen.queryByTestId('mock-banner-view')).toBeNull();
  });

  it('プロバイダーの外では何も描画しない', () => {
    render(<AdBanner />);
    expect(screen.queryByTestId('mock-banner-view')).toBeNull();
  });

  it('初期化が無効になったら何も描画しない', async () => {
    await renderReady(createMockAdsService({ initResult: { ok: false, reason: 'init-failed' } }));
    expect(screen.queryByTestId('mock-banner-view')).toBeNull();
  });

  it('準備ができて画面がフォーカス中なら、バナーを読み込む', async () => {
    await renderReady();
    expect(screen.getByTestId('mock-banner-view')).toBeTruthy();
  });

  it('読み込み前は広告用の余白を確保せず、読み込み後にセーフエリア分の余白を持つ', async () => {
    const { service } = await renderReady();
    const before = StyleSheet.flatten(screen.getByTestId('ad-banner-container').props.style) ?? {};
    expect(before.paddingBottom ?? 0).toBe(0);

    act(() => service.emitBannerLoaded());
    const after = StyleSheet.flatten(screen.getByTestId('ad-banner-container').props.style);
    expect(after).toMatchObject({ paddingBottom: 34 });
  });

  it('読み込みに失敗したら、バナーも領域も描画せず、エラーも出さない', async () => {
    const { service } = await renderReady();
    act(() => service.emitBannerFailed());
    expect(screen.queryByTestId('mock-banner-view')).toBeNull();
    expect(screen.queryByTestId('ad-banner-container')).toBeNull();
  });

  it('画面がフォーカスを失うとバナーを破棄し、戻ると読み込みをやり直す', async () => {
    const { service, rerender } = await renderReady();
    act(() => service.emitBannerLoaded());

    mockFocused = false;
    rerender(
      <AdsProvider service={service}>
        <AdBanner />
      </AdsProvider>
    );
    expect(screen.queryByTestId('mock-banner-view')).toBeNull();

    mockFocused = true;
    rerender(
      <AdsProvider service={service}>
        <AdBanner />
      </AdsProvider>
    );
    expect(screen.getByTestId('mock-banner-view')).toBeTruthy();
    const container = StyleSheet.flatten(screen.getByTestId('ad-banner-container').props.style) ?? {};
    expect(container.paddingBottom ?? 0).toBe(0);
  });

  it('アプリがバックグラウンドに行くとバナーを破棄し、前面に戻ると再び読み込む', async () => {
    await renderReady();
    expect(screen.getByTestId('mock-banner-view')).toBeTruthy();

    act(() => appStateListener?.('background'));
    expect(screen.queryByTestId('mock-banner-view')).toBeNull();

    act(() => appStateListener?.('active'));
    expect(screen.getByTestId('mock-banner-view')).toBeTruthy();
  });

  it('ATT を拒否したときは非パーソナライズでバナーを読み込む', async () => {
    const service = createMockAdsService({ initResult: { ok: true, trackingGranted: false } });
    const seen: boolean[] = [];
    const Original = service.BannerView;
    const Wrapped = (props: BannerViewProps) => {
      seen.push(props.nonPersonalized);
      return <Original {...props} />;
    };
    await renderReady({ ...service, BannerView: Wrapped, initialize: service.initialize.bind(service) } as typeof service);
    expect(seen).toContain(true);
  });
});
