import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { AdsService, AdsState } from './adsTypes';
import { createDefaultAdsService } from './defaultAdsService';

interface AdsContextValue {
  state: AdsState;
  // プロバイダーの外では null
  service: AdsService | null;
}

const AdsContext = createContext<AdsContextValue>({
  state: { status: 'disabled', reason: 'no-provider' },
  service: null,
});

interface AdsProviderProps {
  // 省略時は Google Mobile Ads 実装
  service?: AdsService;
  children: ReactNode;
}

export function AdsProvider({ service: injected, children }: AdsProviderProps) {
  const [service] = useState<AdsService>(() => injected ?? createDefaultAdsService());
  const [state, setState] = useState<AdsState>({ status: 'initializing' });

  useEffect(() => {
    if (service.bannerUnitId === null) {
      // 広告を出せないので、ATT ダイアログも出さない
      setState({ status: 'disabled', reason: 'unit-id-missing' });
      return;
    }

    let cancelled = false;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      void service.initialize().then((result) => {
        if (cancelled) return;
        setState(
          result.ok
            ? { status: 'ready', trackingGranted: result.trackingGranted }
            : { status: 'disabled', reason: result.reason }
        );
      });
    };

    // ATT ダイアログはアプリが前面（active）でないと表示されないことがあるため、前面になってから初期化する
    if (AppState.currentState === 'active') {
      start();
      return () => {
        cancelled = true;
      };
    }
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') start();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [service]);

  return <AdsContext.Provider value={{ state, service }}>{children}</AdsContext.Provider>;
}

export function useAds(): AdsContextValue {
  return useContext(AdsContext);
}
