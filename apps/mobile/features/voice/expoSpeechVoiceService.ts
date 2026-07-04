import * as Speech from 'expo-speech';
import type { VoiceService } from '@timeapp/core';

export class ExpoSpeechVoiceService implements VoiceService {
  speak(text: string): void {
    Speech.speak(text, { language: 'ja-JP' });
  }

  stop(): void {
    Speech.stop();
  }
}
