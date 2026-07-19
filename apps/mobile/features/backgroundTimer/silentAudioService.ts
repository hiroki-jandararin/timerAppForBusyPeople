import { Audio, InterruptionModeIOS } from 'expo-av';

export class SilentAudioService {
  private sound: Audio.Sound | null = null;

  async start(): Promise<void> {
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
    await sound.playAsync();
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
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
    }
    await Audio.setAudioModeAsync({ staysActiveInBackground: false });
  }
}
