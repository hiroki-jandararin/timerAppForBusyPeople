import mobileAds, { AdsConsent, BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import {
  getTrackingPermissionsAsync,
  PermissionStatus,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import { resolveBannerUnitId } from './adConfig';
import type { AdsInitResult, AdsService, BannerViewProps } from './adsTypes';

interface GoogleMobileAdsServiceOptions {
  isProduction: boolean;
  // EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID
  productionUnitId: string | undefined;
}

function BannerView({ unitId, nonPersonalized, onLoaded, onFailedToLoad }: BannerViewProps) {
  return (
    <BannerAd
      unitId={unitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: nonPersonalized }}
      onAdLoaded={() => onLoaded()}
      onAdFailedToLoad={() => onFailedToLoad()}
    />
  );
}

// Google Mobile Ads SDK と ATT モジュールの呼び出しをこのファイルに閉じ込める。
// 環境変数は直接読まず、呼び出し側から注入する（テストで切り替えられるようにするため）
export function createGoogleMobileAdsService({
  isProduction,
  productionUnitId,
}: GoogleMobileAdsServiceOptions): AdsService {
  let initialization: Promise<AdsInitResult> | null = null;

  async function run(): Promise<AdsInitResult> {
    let step = 'ATT の取得';
    try {
      let status = (await getTrackingPermissionsAsync()).status;
      if (status === PermissionStatus.UNDETERMINED) {
        step = 'ATT の要求';
        status = (await requestTrackingPermissionsAsync()).status;
      }
      // 拒否でも広告は有効のまま。非パーソナライズ広告として表示する
      const trackingGranted = status === PermissionStatus.GRANTED;

      step = '同意の取得';
      const consent = await AdsConsent.gatherConsent();
      if (!consent.canRequestAds) return { ok: false, reason: 'consent-denied' };

      step = 'SDK の初期化';
      const ads = mobileAds();
      // バナーの音声がタイマーの効果音・音声読み上げ・無音再生と競合しないようにする
      ads.setAppMuted(true);
      await ads.initialize();
      return { ok: true, trackingGranted };
    } catch (error) {
      console.warn(`広告の初期化に失敗しました（${step}）`, error);
      return { ok: false, reason: 'init-failed' };
    }
  }

  return {
    initialize() {
      initialization ??= run();
      return initialization;
    },
    BannerView,
    bannerUnitId: resolveBannerUnitId({
      isProduction,
      productionUnitId,
      testUnitId: TestIds.BANNER,
    }),
  };
}
