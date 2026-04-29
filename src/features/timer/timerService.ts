import type { Routine } from '../routines/routineTypes';
import type { VoiceService } from '../voice/voiceService';
import type { TimerState } from './timerTypes';

export function announceForTransition(previous: TimerState, next: TimerState, routine: Routine, voice: VoiceService): void {
  const current = routine.items[next.currentIndex];
  if (previous.status === 'idle' && next.status === 'countdown') {
    voice.speak(String(next.remainingSec));
    return;
  }
  if (previous.status === 'countdown' && next.status === 'countdown') {
    voice.speak(String(next.remainingSec));
    return;
  }
  if (previous.status === 'countdown' && next.status === 'running' && current) {
    voice.speak(formatCurrentAnnouncement(current.title, current.durationSec));
    return;
  }
  if (next.status === 'running' && current && next.currentIndex !== previous.currentIndex) {
    voice.speak(formatCurrentAnnouncement(current.title, current.durationSec));
    return;
  }
  if (next.status === 'finished' && previous.status !== 'finished') {
    voice.speak('終了です');
    return;
  }
  if (next.status === 'running' && previous.remainingSec !== next.remainingSec) {
    const upcoming = routine.items[next.currentIndex + 1];
    if (next.remainingSec === 10 && upcoming) {
      voice.speak(formatNextAnnouncement(upcoming.title, upcoming.durationSec));
      return;
    }
    if (upcoming && [3, 2, 1].includes(next.remainingSec)) {
      voice.speak(String(next.remainingSec));
    }
  }
}

function formatNextAnnouncement(title: string, durationSec: number): string {
  return `次、${title}、${durationSec}秒`;
}

function formatCurrentAnnouncement(title: string, durationSec: number): string {
  return `${title}、${durationSec}秒`;
}
