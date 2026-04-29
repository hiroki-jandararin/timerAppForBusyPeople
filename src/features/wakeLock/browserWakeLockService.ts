import type { WakeLockService } from './wakeLockService';

type WakeLockSentinel = {
  release: () => Promise<void>;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>;
  };
};

export class BrowserWakeLockService implements WakeLockService {
  private sentinel: WakeLockSentinel | null = null;

  async request(): Promise<void> {
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;
    if (!wakeLock) return;
    try {
      this.sentinel = await wakeLock.request('screen');
    } catch {
      this.sentinel = null;
    }
  }

  async release(): Promise<void> {
    if (!this.sentinel) return;
    try {
      await this.sentinel.release();
    } finally {
      this.sentinel = null;
    }
  }
}
