import { render, screen } from '@testing-library/react-native';
import { createGoogleMobileAdsService } from '../features/ads/googleMobileAdsService';

const mockCalls: string[] = [];
const mockInitialize = jest.fn();
const mockSetAppMuted = jest.fn();
const mockGatherConsent = jest.fn();
const mockGetTracking = jest.fn();
const mockRequestTracking = jest.fn();
let mockBannerProps: Record<string, unknown> | null = null;

jest.mock('react-native-google-mobile-ads', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: () => ({
      initialize: (...args: unknown[]) => mockInitialize(...args),
      setAppMuted: (...args: unknown[]) => mockSetAppMuted(...args),
    }),
    AdsConsent: { gatherConsent: (...args: unknown[]) => mockGatherConsent(...args) },
    BannerAd: (props: Record<string, unknown>) => {
      mockBannerProps = props;
      return React.createElement(View, { testID: 'sdk-banner' });
    },
    BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER' },
    TestIds: { BANNER: 'test-banner-id' },
  };
});

jest.mock('expo-tracking-transparency', () => ({
  PermissionStatus: { UNDETERMINED: 'undetermined', GRANTED: 'granted', DENIED: 'denied' },
  getTrackingPermissionsAsync: (...args: unknown[]) => mockGetTracking(...args),
  requestTrackingPermissionsAsync: (...args: unknown[]) => mockRequestTracking(...args),
}));

const options = { isProduction: false, productionUnitId: undefined };

beforeEach(() => {
  jest.clearAllMocks();
  mockCalls.length = 0;
  mockBannerProps = null;
  mockGetTracking.mockImplementation(async () => {
    mockCalls.push('att-get');
    return { status: 'undetermined' };
  });
  mockRequestTracking.mockImplementation(async () => {
    mockCalls.push('att-request');
    return { status: 'granted' };
  });
  mockGatherConsent.mockImplementation(async () => {
    mockCalls.push('consent');
    return { canRequestAds: true };
  });
  mockSetAppMuted.mockImplementation(() => {
    mockCalls.push('mute');
  });
  mockInitialize.mockImplementation(async () => {
    mockCalls.push('init');
    return [];
  });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('googleMobileAdsService.initialize', () => {
  it('ATT → 同意 → ミュート → 初期化の順に実行する', async () => {
    const result = await createGoogleMobileAdsService(options).initialize();
    expect(result).toEqual({ ok: true, trackingGranted: true });
    expect(mockCalls).toEqual(['att-get', 'att-request', 'consent', 'mute', 'init']);
    expect(mockSetAppMuted).toHaveBeenCalledWith(true);
  });

  it('ATT が決定済みのときは許可を要求しない', async () => {
    mockGetTracking.mockResolvedValue({ status: 'granted' });
    const result = await createGoogleMobileAdsService(options).initialize();
    expect(mockRequestTracking).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, trackingGranted: true });
  });

  it('ATT を拒否しても広告は有効のまま、トラッキングなしとして返す', async () => {
    mockRequestTracking.mockResolvedValue({ status: 'denied' });
    const result = await createGoogleMobileAdsService(options).initialize();
    expect(result).toEqual({ ok: true, trackingGranted: false });
    expect(mockInitialize).toHaveBeenCalled();
  });

  it('広告リクエストが許可されなければ無効（同意なし）で、SDK を初期化しない', async () => {
    mockGatherConsent.mockResolvedValue({ canRequestAds: false });
    const result = await createGoogleMobileAdsService(options).initialize();
    expect(result).toEqual({ ok: false, reason: 'consent-denied' });
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  it.each([
    ['ATT の取得', () => mockGetTracking.mockRejectedValue(new Error('x'))],
    ['ATT の要求', () => mockRequestTracking.mockRejectedValue(new Error('x'))],
    ['同意の取得', () => mockGatherConsent.mockRejectedValue(new Error('x'))],
    ['SDK の初期化', () => mockInitialize.mockRejectedValue(new Error('x'))],
  ])('%s で例外が起きても投げず、初期化失敗として返し、日本語で警告する', async (_name, arrange) => {
    arrange();
    const result = await createGoogleMobileAdsService(options).initialize();
    expect(result).toEqual({ ok: false, reason: 'init-failed' });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('広告'), expect.anything());
  });

  it('2回呼んでも初期化処理は1回だけ実行される', async () => {
    const service = createGoogleMobileAdsService(options);
    await service.initialize();
    await service.initialize();
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });
});

describe('googleMobileAdsService.bannerUnitId', () => {
  it('本番以外ではテスト ID', () => {
    expect(createGoogleMobileAdsService({ isProduction: false, productionUnitId: 'prod' }).bannerUnitId).toBe(
      'test-banner-id'
    );
  });

  it('本番では本番 ID、未設定なら null', () => {
    expect(createGoogleMobileAdsService({ isProduction: true, productionUnitId: 'prod' }).bannerUnitId).toBe('prod');
    expect(createGoogleMobileAdsService({ isProduction: true, productionUnitId: undefined }).bannerUnitId).toBeNull();
  });
});

describe('googleMobileAdsService.BannerView', () => {
  it('アンカー型の適応型サイズで描画し、非パーソナライズの指定とイベントを SDK に渡す', () => {
    const onLoaded = jest.fn();
    const onFailedToLoad = jest.fn();
    const { BannerView } = createGoogleMobileAdsService(options);
    render(<BannerView unitId="unit" nonPersonalized onLoaded={onLoaded} onFailedToLoad={onFailedToLoad} />);

    expect(screen.getByTestId('sdk-banner')).toBeTruthy();
    expect(mockBannerProps).toMatchObject({
      unitId: 'unit',
      size: 'ANCHORED_ADAPTIVE_BANNER',
      requestOptions: { requestNonPersonalizedAdsOnly: true },
    });
    (mockBannerProps?.onAdLoaded as () => void)();
    (mockBannerProps?.onAdFailedToLoad as () => void)();
    expect(onLoaded).toHaveBeenCalledTimes(1);
    expect(onFailedToLoad).toHaveBeenCalledTimes(1);
  });

  it('パーソナライズ可のときは非パーソナライズを指定しない', () => {
    const { BannerView } = createGoogleMobileAdsService(options);
    render(<BannerView unitId="unit" nonPersonalized={false} onLoaded={jest.fn()} onFailedToLoad={jest.fn()} />);
    expect(mockBannerProps).toMatchObject({ requestOptions: { requestNonPersonalizedAdsOnly: false } });
  });
});
