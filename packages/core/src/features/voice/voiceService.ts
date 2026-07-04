export type VoiceService = {
  speak: (text: string) => void;
  stop: () => void;
};
