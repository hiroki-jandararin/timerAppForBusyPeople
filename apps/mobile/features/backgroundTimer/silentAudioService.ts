import { Audio, InterruptionModeIOS } from 'expo-av';
import type { AVPlaybackStatus } from 'expo-av';

const START_RETRY_COUNT = 2;

export class SilentAudioService {
  private sound: Audio.Sound | null = null;
  private desiredPlaying = false;

  async start(): Promise<void> {
    this.desiredPlaying = true;
    await this.startPlayback(START_RETRY_COUNT);
  }

  private async startPlayback(retriesLeft: number): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      });
      const { sound } = await Audio.Sound.createAsync(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../../assets/silent.wav'),
        { isLooping: true, volume: 0.01 }
      );
      this.sound = sound;
      sound.setOnPlaybackStatusUpdate((status) => this.handlePlaybackStatusUpdate(status));
      await sound.playAsync();
    } catch (e) {
      if (retriesLeft > 0) {
        await this.startPlayback(retriesLeft - 1);
        return;
      }
      console.error('バックグラウンド再生の開始に失敗しました', e);
    }
  }

  private handlePlaybackStatusUpdate(status: AVPlaybackStatus): void {
    if (!this.desiredPlaying || !status.isLoaded || status.isPlaying) return;
    // 電話の着信・Siri・Bluetooth接続変化などによる中断からの自動復帰
    void this.sound?.playAsync().catch(() => {
      void this.startPlayback(START_RETRY_COUNT);
    });
  }

  async ensurePlaying(): Promise<void> {
    if (!this.desiredPlaying) return;
    const status = await this.sound?.getStatusAsync().catch(() => null);
    if (!status || !status.isLoaded || !status.isPlaying) {
      await this.startPlayback(START_RETRY_COUNT);
    }
  }

  async playBeep(): Promise<void> {
    try {
      const { sound } = await Audio.Sound.createAsync(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../../assets/beep.wav'),
        { isLooping: false, volume: 1.0 }
      );
      await sound.playAsync();
      setTimeout(() => void sound.unloadAsync(), 1000);
    } catch {
      // バックグラウンドでの再生失敗は無視
    }
  }

  async playTick(): Promise<void> {
    try {
      const { sound } = await Audio.Sound.createAsync(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../../assets/tick.wav'),
        { isLooping: false, volume: 1.0 }
      );
      await sound.playAsync();
      setTimeout(() => void sound.unloadAsync(), 500);
    } catch {
      // バックグラウンドでの再生失敗は無視
    }
  }

  async stop(): Promise<void> {
    this.desiredPlaying = false;
    if (this.sound) {
      const sound = this.sound;
      this.sound = null;
      sound.setOnPlaybackStatusUpdate(null);
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    await Audio.setAudioModeAsync({ staysActiveInBackground: false });
  }
}
