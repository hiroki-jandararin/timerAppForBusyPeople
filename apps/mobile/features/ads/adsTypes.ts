import type { ComponentType } from 'react';

export type AdsDisabledReason =
  | 'consent-denied' // 広告リクエストが許可されなかった
  | 'init-failed' // 初期化のいずれかの段階で例外が発生した
  | 'unit-id-missing' // 本番でバナーユニット ID が未設定
  | 'no-provider'; // AdsProvider の外で使われた

export type AdsState =
  | { status: 'initializing' }
  | { status: 'ready'; trackingGranted: boolean }
  | { status: 'disabled'; reason: AdsDisabledReason };

export type AdsInitFailureReason = Extract<AdsDisabledReason, 'consent-denied' | 'init-failed'>;

export type AdsInitResult =
  | { ok: true; trackingGranted: boolean }
  | { ok: false; reason: AdsInitFailureReason };

export interface BannerViewProps {
  unitId: string;
  nonPersonalized: boolean;
  onLoaded: () => void;
  onFailedToLoad: () => void;
}

// 広告 SDK へのポート。バナー以外の広告形式は公開しない
export interface AdsService {
  // ATT → 同意 → ミュート → SDK 初期化。例外を投げず、結果で返す
  initialize(): Promise<AdsInitResult>;
  readonly BannerView: ComponentType<BannerViewProps>;
  // 環境に応じて解決済みのバナーユニット ID。null は未設定
  readonly bannerUnitId: string | null;
}
