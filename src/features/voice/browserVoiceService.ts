import type { VoiceService } from './voiceService';

export class BrowserVoiceService implements VoiceService {
  speak(text: string): void {
    if (!text.trim() || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    window.speechSynthesis.speak(utterance);
  }
}
