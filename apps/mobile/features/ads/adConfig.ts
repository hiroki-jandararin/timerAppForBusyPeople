interface BannerUnitIdInput {
  isProduction: boolean;
  // EXPO_PUBLIC_ADMOB_IOS_BANNER_UNIT_ID
  productionUnitId: string | undefined;
  // SDK の TestIds.BANNER
  testUnitId: string;
}

// 本番以外では本番 ID が渡されても使わない（誤クリックによるアカウント停止を防ぐ）。
// 本番でユニット ID が未設定なら null を返し、広告を表示しない
export function resolveBannerUnitId({
  isProduction,
  productionUnitId,
  testUnitId,
}: BannerUnitIdInput): string | null {
  if (!isProduction) return testUnitId;
  const trimmed = productionUnitId?.trim();
  return trimmed ? trimmed : null;
}
