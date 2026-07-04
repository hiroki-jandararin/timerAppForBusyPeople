import { SilentAudioService } from '../features/backgroundTimer/silentAudioService';

const mockPlayAsync = jest.fn();
const mockStopAsync = jest.fn();
const mockUnloadAsync = jest.fn();
const mockSetAudioModeAsync = jest.fn();
const mockCreateAsync = jest.fn();

jest.mock('expo-av', () => ({
  Audio: {
    Sound: { createAsync: (...args: unknown[]) => mockCreateAsync(...args) },
    setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateAsync.mockResolvedValue({
    sound: { playAsync: mockPlayAsync, stopAsync: mockStopAsync, unloadAsync: mockUnloadAsync },
  });
});

describe('SilentAudioService', () => {
  it('start() でオーディオモードをバックグラウンド対応に設定する', async () => {
    const svc = new SilentAudioService();
    await svc.start();
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ staysActiveInBackground: true, playsInSilentModeIOS: true })
    );
  });

  it('start() で無音ファイルをループ再生する', async () => {
    const svc = new SilentAudioService();
    await svc.start();
    expect(mockCreateAsync).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isLooping: true })
    );
    expect(mockPlayAsync).toHaveBeenCalled();
  });

  it('stop() で再生を停止してアンロードする', async () => {
    const svc = new SilentAudioService();
    await svc.start();
    await svc.stop();
    expect(mockStopAsync).toHaveBeenCalled();
    expect(mockUnloadAsync).toHaveBeenCalled();
  });

  it('stop() でオーディオモードをバックグラウンド無効に戻す', async () => {
    const svc = new SilentAudioService();
    await svc.start();
    await svc.stop();
    expect(mockSetAudioModeAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ staysActiveInBackground: false })
    );
  });

  it('start() せずに stop() を呼んでもエラーにならない', async () => {
    const svc = new SilentAudioService();
    await expect(svc.stop()).resolves.not.toThrow();
  });
});
