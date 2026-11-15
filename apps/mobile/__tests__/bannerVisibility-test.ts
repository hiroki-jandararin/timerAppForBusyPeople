import type { AdsState } from '../features/ads/adsTypes';
import { shouldRenderBanner, type BannerVisibilityInput } from '../features/ads/bannerVisibility';

const ready: AdsState = { status: 'ready', trackingGranted: true };

const base: BannerVisibilityInput = {
  ads: ready,
  isScreenFocused: true,
  appState: 'active',
  bannerUnitId: 'unit',
};

describe('shouldRenderBanner', () => {
  it('すべての条件が成り立つときだけ描画する', () => {
    expect(shouldRenderBanner(base)).toBe(true);
  });

  it('初期化中は描画しない（回答前は広告をリクエストしない）', () => {
    expect(shouldRenderBanner({ ...base, ads: { status: 'initializing' } })).toBe(false);
  });

  it('無効のときは理由を問わず描画しない', () => {
    expect(shouldRenderBanner({ ...base, ads: { status: 'disabled', reason: 'consent-denied' } })).toBe(false);
    expect(shouldRenderBanner({ ...base, ads: { status: 'disabled', reason: 'no-provider' } })).toBe(false);
  });

  it('画面がフォーカスされていないときは描画しない', () => {
    expect(shouldRenderBanner({ ...base, isScreenFocused: false })).toBe(false);
  });

  it('アプリが前面でないときは描画しない', () => {
    expect(shouldRenderBanner({ ...base, appState: 'inactive' })).toBe(false);
    expect(shouldRenderBanner({ ...base, appState: 'background' })).toBe(false);
  });

  it('ユニット ID がないときは描画しない', () => {
    expect(shouldRenderBanner({ ...base, bannerUnitId: null })).toBe(false);
  });

  it('ATT を拒否していても（非パーソナライズで）描画する', () => {
    expect(shouldRenderBanner({ ...base, ads: { status: 'ready', trackingGranted: false } })).toBe(true);
  });
});
