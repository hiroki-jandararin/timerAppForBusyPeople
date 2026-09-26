import { SilentAudioService } from '../features/backgroundTimer/silentAudioService';

const mockPlayAsync = jest.fn();
const mockStopAsync = jest.fn();
const mockUnloadAsync = jest.fn();
const mockGetStatusAsync = jest.fn();
const mockSetOnPlaybackStatusUpdate = jest.fn();
const mockSetAudioModeAsync = jest.fn();
const mockCreateAsync = jest.fn();

jest.mock('expo-av', () => ({
  Audio: {
    Sound: { createAsync: (...args: unknown[]) => mockCreateAsync(...args) },
    setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
  },
  InterruptionModeIOS: { MixWithOthers: 0, DoNotMix: 1, DuckOthers: 2 },
}));

function makeSound() {
  return {
    playAsync: mockPlayAsync,
    stopAsync: mockStopAsync,
    unloadAsync: mockUnloadAsync,
    getStatusAsync: mockGetStatusAsync,
    setOnPlaybackStatusUpdate: mockSetOnPlaybackStatusUpdate,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateAsync.mockResolvedValue({ sound: makeSound() });
  mockGetStatusAsync.mockResolvedValue({ isLoaded: true, isPlaying: true });
  mockPlayAsync.mockResolvedValue(undefined);
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

  it('start() で mixWithOthers モードを設定し他アプリの音声を止めない', async () => {
    const svc = new SilentAudioService();
    await svc.start();
    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ interruptionModeIOS: 0 })
    );
  });

  it('playBeep() でビープ音を単発再生する', async () => {
    const svc = new SilentAudioService();
    await svc.start();
    await svc.playBeep();
    expect(mockCreateAsync).toHaveBeenCalledTimes(2);
    expect(mockCreateAsync).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ isLooping: false })
    );
    expect(mockPlayAsync).toHaveBeenCalledTimes(2);
  });

  it('playTick() でティック音を単発再生する', async () => {
    const svc = new SilentAudioService();
    await svc.start();
    await svc.playTick();
    expect(mockCreateAsync).toHaveBeenCalledTimes(2);
    expect(mockCreateAsync).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ isLooping: false })
    );
    expect(mockPlayAsync).toHaveBeenCalledTimes(2);
  });

  it('start() の再生開始に失敗してもリトライして復帰を試みる', async () => {
    mockCreateAsync
      .mockRejectedValueOnce(new Error('session busy'))
      .mockResolvedValueOnce({ sound: makeSound() });

    const svc = new SilentAudioService();
    await svc.start();

    expect(mockCreateAsync).toHaveBeenCalledTimes(2);
    expect(mockPlayAsync).toHaveBeenCalledTimes(1);
  });

  it('割り込み等で再生が予期せず止まったら自動的に再開する', async () => {
    const svc = new SilentAudioService();
    await svc.start();

    const onStatusUpdate = mockSetOnPlaybackStatusUpdate.mock.calls[0][0];
    mockPlayAsync.mockClear();

    onStatusUpdate({ isLoaded: true, isPlaying: false });

    expect(mockPlayAsync).toHaveBeenCalledTimes(1);
  });

  it('stop()後は再生停止イベントが来ても再開しない', async () => {
    const svc = new SilentAudioService();
    await svc.start();
    const onStatusUpdate = mockSetOnPlaybackStatusUpdate.mock.calls[0][0];

    await svc.stop();
    mockPlayAsync.mockClear();

    onStatusUpdate({ isLoaded: true, isPlaying: false });

    expect(mockPlayAsync).not.toHaveBeenCalled();
  });

  it('ensurePlaying() は再生中であれば何もしない', async () => {
    const svc = new SilentAudioService();
    await svc.start();
    mockGetStatusAsync.mockResolvedValue({ isLoaded: true, isPlaying: true });
    mockCreateAsync.mockClear();

    await svc.ensurePlaying();

    expect(mockCreateAsync).not.toHaveBeenCalled();
  });

  it('ensurePlaying() は再生が止まっていれば再生し直す', async () => {
    const svc = new SilentAudioService();
    await svc.start();
    mockGetStatusAsync.mockResolvedValue({ isLoaded: true, isPlaying: false });
    mockCreateAsync.mockClear();

    await svc.ensurePlaying();

    expect(mockCreateAsync).toHaveBeenCalledTimes(1);
  });

  it('start()していない状態でensurePlaying()を呼んでも何もしない', async () => {
    const svc = new SilentAudioService();
    await expect(svc.ensurePlaying()).resolves.not.toThrow();
    expect(mockCreateAsync).not.toHaveBeenCalled();
  });
});
