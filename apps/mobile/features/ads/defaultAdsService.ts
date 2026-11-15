import type { AdsService } from './adsTypes';
import { createGoogleMobileAdsService } from './googleMobileAdsService';

// 本番ビルド（eas.json の production が EXPO_PUBLIC_APP_ENV=production を渡す）かつ開発ビルドでないときだけ本番扱いにする。
// EXPO_PUBLIC_* はビルド時に埋め込まれるため、process.env.NAME の形のまま参照する
export function createDefaultAdsService(): AdsService {
  return createGoogleMobileAdsService({
    isProduction: process.env.EXPO_PUBLIC_APP_ENV === 'production' && !__DEV__,
    productionUnitId: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID,
  });
}
