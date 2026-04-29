import type { VoiceService } from './voiceService';

export class MockVoiceService implements VoiceService {
  readonly spoken: string[] = [];

  speak(text: string): void {
    this.spoken.push(text);
  }
}
