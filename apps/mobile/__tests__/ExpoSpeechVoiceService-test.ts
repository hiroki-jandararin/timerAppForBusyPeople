import { ExpoSpeechVoiceService } from '../features/voice/expoSpeechVoiceService';
import * as Speech from 'expo-speech';

jest.mock('expo-speech');

describe('ExpoSpeechVoiceService', () => {
  beforeEach(() => { jest.clearAllMocks(); });
  it('speak() が expo-speech の Speech.speak() を呼ぶ', () => {
    const service = new ExpoSpeechVoiceService();
    service.speak('スクワット 30秒');
    expect(Speech.speak).toHaveBeenCalledWith('スクワット 30秒', expect.objectContaining({ language: 'ja-JP' }));
  });

  it('speak() を複数回呼ぶと都度 Speech.speak() が呼ばれる', () => {
    const service = new ExpoSpeechVoiceService();
    service.speak('準備してください');
    service.speak('休憩、30秒');
    expect(Speech.speak).toHaveBeenCalledTimes(2);
  });
});
