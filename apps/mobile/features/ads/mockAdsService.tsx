import { useEffect } from 'react';
import { View } from 'react-native';
import type { AdsInitResult, AdsService, BannerViewProps } from './adsTypes';

interface MockAdsServiceOptions {
  initResult?: AdsInitResult;
  bannerUnitId?: string | null;
}

export interface MockAdsService extends AdsService {
  readonly initializeCallCount: number;
  // 現在マウントされているバナーのイベントを発火する（未マウントなら何もしない）
  emitBannerLoaded(): void;
  emitBannerFailed(): void;
}

// テスト用の広告サービス。ネイティブにも通信にも触れない
export function createMockAdsService(options: MockAdsServiceOptions = {}): MockAdsService {
  const initResult = options.initResult ?? { ok: true, trackingGranted: true };
  const bannerUnitId = options.bannerUnitId === undefined ? 'mock-unit-id' : options.bannerUnitId;
  let initializeCallCount = 0;
  const mounted = new Set<BannerViewProps>();

  function BannerView(props: BannerViewProps) {
    useEffect(() => {
      mounted.add(props);
      return () => {
        mounted.delete(props);
      };
    }, [props]);
    return <View testID="mock-banner-view" />;
  }

  return {
    async initialize() {
      initializeCallCount += 1;
      return initResult;
    },
    BannerView,
    bannerUnitId,
    get initializeCallCount() {
      return initializeCallCount;
    },
    emitBannerLoaded() {
      mounted.forEach((props) => props.onLoaded());
    },
    emitBannerFailed() {
      mounted.forEach((props) => props.onFailedToLoad());
    },
  };
}
