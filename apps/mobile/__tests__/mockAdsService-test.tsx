import { act, render, screen } from '@testing-library/react-native';
import { createMockAdsService } from '../features/ads/mockAdsService';

describe('mockAdsService', () => {
  it('既定では初期化に成功し、ネイティブに触れない', async () => {
    const service = createMockAdsService();
    await expect(service.initialize()).resolves.toEqual({ ok: true, trackingGranted: true });
    expect(service.initializeCallCount).toBe(1);
  });

  it('初期化結果とユニット ID をテストから指定できる', async () => {
    const service = createMockAdsService({
      initResult: { ok: false, reason: 'init-failed' },
      bannerUnitId: null,
    });
    await expect(service.initialize()).resolves.toEqual({ ok: false, reason: 'init-failed' });
    expect(service.bannerUnitId).toBeNull();
  });

  it('バナーの読み込み成功と失敗をテストから発火できる', () => {
    const onLoaded = jest.fn();
    const onFailedToLoad = jest.fn();
    const service = createMockAdsService();
    const { BannerView } = service;
    render(<BannerView unitId="unit" nonPersonalized={false} onLoaded={onLoaded} onFailedToLoad={onFailedToLoad} />);
    expect(screen.getByTestId('mock-banner-view')).toBeTruthy();

    act(() => service.emitBannerLoaded());
    expect(onLoaded).toHaveBeenCalledTimes(1);

    act(() => service.emitBannerFailed());
    expect(onFailedToLoad).toHaveBeenCalledTimes(1);
  });

  it('バナーがマウントされていないとき、発火しても何も起きない', () => {
    const service = createMockAdsService();
    expect(() => service.emitBannerLoaded()).not.toThrow();
  });
});
