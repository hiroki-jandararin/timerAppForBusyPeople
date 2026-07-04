import { Audio } from 'expo-av';

export class SilentAudioService {
  private sound: Audio.Sound | null = null;

  async start(): Promise<void> {
    await Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
    });
    const { sound } = await Audio.Sound.createAsync(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../assets/silent.wav'),
      { isLooping: true, volume: 0.01 }
    );
    this.sound = sound;
    await sound.playAsync();
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
