import { Colors } from '@/constants/colors';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View, type AppStateStatus } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AdsService, AdsState } from './adsTypes';
import { useAds } from './AdsProvider';
import { shouldRenderBanner } from './bannerVisibility';
import { useScreenFocus } from './useScreenFocus';

function useAppState(): AppStateStatus {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);
  return appState;
}

interface BannerSlotProps {
  service: AdsService;
  unitId: string;
  nonPersonalized: boolean;
}

// 描画可と判定されている間だけマウントされる。外れるとアンマウントされ、読み込み・更新が止まる
function BannerSlot({ service, unitId, nonPersonalized }: BannerSlotProps) {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'loading' | 'loaded' | 'failed'>('loading');

  // 失敗時はバナーも領域も描画せず、エラーも見せない
  if (phase === 'failed') return null;

  return (
    <View
      testID="ad-banner-container"
      // 読み込み前は SDK のバナーが高さ 0 のため、余白を足さず領域を確保しない
      style={phase === 'loaded' ? [styles.loaded, { paddingBottom: insets.bottom }] : undefined}
    >
      <service.BannerView
        unitId={unitId}
        nonPersonalized={nonPersonalized}
        onLoaded={() => setPhase('loaded')}
        onFailedToLoad={() => setPhase('failed')}
      />
    </View>
  );
}

function BannerGate({ service, state }: { service: AdsService; state: AdsState }) {
  const isScreenFocused = useScreenFocus();
  const appState = useAppState();

  const unitId = service.bannerUnitId;
  if (!shouldRenderBanner({ ads: state, isScreenFocused, appState, bannerUnitId: unitId }) || unitId === null) {
    return null;
  }

  return (
    <BannerSlot
      service={service}
      unitId={unitId}
      nonPersonalized={state.status === 'ready' && !state.trackingGranted}
    />
  );
}

// 画面下部に置く共通バナー。表示可否はすべてここで判定する。
// プロバイダーの外（広告なし）では、フォーカスや AppState を購読せず何も描画しない
export function AdBanner() {
  const { state, service } = useAds();
  if (service === null) return null;
  return <BannerGate service={service} state={state} />;
}

const styles = StyleSheet.create({
  loaded: {
    alignItems: 'center',
    backgroundColor: Colors.bg,
  },
});
