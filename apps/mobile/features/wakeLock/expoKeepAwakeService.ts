import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type { WakeLockService } from '@timeapp/core';

export class ExpoKeepAwakeService implements WakeLockService {
  async request(): Promise<void> {
    await activateKeepAwakeAsync();
  }

  async release(): Promise<void> {
    await deactivateKeepAwake();
  }
}
