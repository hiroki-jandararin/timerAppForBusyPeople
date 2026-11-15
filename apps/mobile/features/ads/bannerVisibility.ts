import type { AppStateStatus } from 'react-native';
import type { AdsState } from './adsTypes';

export interface BannerVisibilityInput {
  ads: AdsState;
  isScreenFocused: boolean;
  appState: AppStateStatus;
  bannerUnitId: string | null;
}

// 初期化済みで、画面がフォーカスされ、アプリが前面で、ユニット ID があるときだけ描画してよい。
// フォーカスを外れた画面（例: タイマー画面の裏の一覧）では描画せず、読み込み・更新を止める
export function shouldRenderBanner({
  ads,
  isScreenFocused,
  appState,
  bannerUnitId,
}: BannerVisibilityInput): boolean {
  return (
    ads.status === 'ready' && isScreenFocused && appState === 'active' && bannerUnitId !== null
  );
}
