import { ExpoKeepAwakeService } from '../features/wakeLock/expoKeepAwakeService';
import * as KeepAwake from 'expo-keep-awake';

jest.mock('expo-keep-awake');

describe('ExpoKeepAwakeService', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('request() が activateKeepAwakeAsync を呼ぶ', async () => {
    const service = new ExpoKeepAwakeService();
    await service.request();
    expect(KeepAwake.activateKeepAwakeAsync).toHaveBeenCalledTimes(1);
  });

  it('release() が deactivateKeepAwake を呼ぶ', async () => {
    const service = new ExpoKeepAwakeService();
    await service.release();
    expect(KeepAwake.deactivateKeepAwake).toHaveBeenCalledTimes(1);
  });
});
