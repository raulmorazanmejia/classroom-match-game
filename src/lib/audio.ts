const SOUND_PROFILE = {
  correct: { frequency: 1320, duration: 0.24, gain: 0.34, wave: 'triangle' as OscillatorType },
  wrong: { frequency: 180, duration: 0.38, gain: 0.32, wave: 'square' as OscillatorType },
  place: { frequency: 880, duration: 0.3, gain: 0.36, wave: 'triangle' as OscillatorType },
  test: { frequency: 1040, duration: 0.6, gain: 0.5, wave: 'square' as OscillatorType }
} as const;

type SoundKind = keyof typeof SOUND_PROFILE;

type AudioDiagnostics = {
  contextState: AudioContextState | 'unavailable' | 'not-created';
  soundEnabled: boolean;
  lastSoundPlayed: SoundKind | 'none';
  lastEvent: string;
  lastError: string;
  lastGain: number;
  lastDuration: number;
  lastFrequency: number;
  lastFallbackUsed: 'none' | 'speech';
};

class SharedAudioEngine {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private lastSoundPlayed: SoundKind | 'none' = 'none';
  private lastEvent = 'idle';
  private lastError = 'none';
  private lastGain = 0;
  private lastDuration = 0;
  private lastFrequency = 0;
  private lastFallbackUsed: 'none' | 'speech' = 'none';
  private listeners = new Set<(snapshot: AudioDiagnostics) => void>();

  private emit() {
    const snapshot = this.getDiagnostics();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  subscribe(listener: (snapshot: AudioDiagnostics) => void): () => void {
    this.listeners.add(listener);
    listener(this.getDiagnostics());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getDiagnostics(): AudioDiagnostics {
    return {
      contextState: this.ctx ? this.ctx.state : 'not-created',
      soundEnabled: this.unlocked,
      lastSoundPlayed: this.lastSoundPlayed,
      lastEvent: this.lastEvent,
      lastError: this.lastError,
      lastGain: this.lastGain,
      lastDuration: this.lastDuration,
      lastFrequency: this.lastFrequency,
      lastFallbackUsed: this.lastFallbackUsed
    };
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      this.lastError = 'AudioContext unavailable on this device/browser.';
      this.lastEvent = 'AudioContext unavailable on this device/browser.';
      this.emit();
      return null;
    }
    this.ctx = new AudioContextClass();
    this.lastEvent = 'AudioContext created.';
    this.emit();
    return this.ctx;
  }

  async resumeForGesture(source: string): Promise<boolean> {
    const ctx = this.ensure();
    if (!ctx) return false;
    try {
      await ctx.resume();
      this.unlocked = ctx.state === 'running';
      this.lastError = this.unlocked ? 'none' : `AudioContext resume did not reach running state (state=${ctx.state}).`;
      this.lastEvent = `${source}: resume ${this.unlocked ? 'succeeded' : `ended in ${ctx.state}`}`;
    } catch (error) {
      this.unlocked = false;
      const message = (error as Error).message || 'unknown error';
      this.lastError = `${source}: resume failed (${message})`;
      this.lastEvent = `${source}: resume failed (${message})`;
    }
    this.emit();
    return this.unlocked;
  }

  async unlock(): Promise<boolean> {
    return this.resumeForGesture('unlock');
  }

  private runSpeechFallback(kind: SoundKind, reason: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.lastError = `${reason} + fallback unavailable (speechSynthesis not supported).`;
      this.lastEvent = `play:${kind} fallback unavailable`;
      this.lastFallbackUsed = 'none';
      this.emit();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(kind === 'test' ? 'Audio test. If you hear this, sound fallback is working.' : 'beep');
      utterance.volume = 1;
      utterance.rate = 1;
      utterance.pitch = kind === 'wrong' ? 0.6 : 1.5;
      window.speechSynthesis.speak(utterance);
      this.lastFallbackUsed = 'speech';
      this.lastEvent = `play:${kind} fallback speech emitted (${reason})`;
      this.lastError = reason;
      this.emit();
    } catch (error) {
      const message = (error as Error).message || 'unknown error';
      this.lastFallbackUsed = 'none';
      this.lastError = `${reason} + speech fallback failed (${message})`;
      this.lastEvent = `play:${kind} fallback failed (${message})`;
      this.emit();
    }
  }

  async play(kind: SoundKind): Promise<void> {
    const ctx = this.ensure();
    const profile = SOUND_PROFILE[kind] ?? SOUND_PROFILE.place;
    this.lastFrequency = profile.frequency;
    this.lastDuration = profile.duration;
    this.lastGain = profile.gain;
    this.lastFallbackUsed = 'none';

    if (!ctx) {
      this.runSpeechFallback(kind, 'AudioContext unavailable');
      return;
    }

    if (ctx.state !== 'running') {
      await this.resumeForGesture(`play:${kind}`);
    }
    if (ctx.state !== 'running') {
      this.runSpeechFallback(kind, `play:${kind} blocked because AudioContext state is ${ctx.state}. iPhone/Safari requires a direct tap gesture.`);
      return;
    }

    try {
      const { frequency, duration, gain: targetGain, wave } = profile;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(targetGain, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);

      this.unlocked = true;
      this.lastError = 'none';
      this.lastSoundPlayed = kind;
      this.lastEvent = `play:${kind} emitted (${frequency}Hz/${duration}s/gain=${targetGain}).`;
      this.emit();

      if (kind === 'test') {
        window.setTimeout(() => {
          this.runSpeechFallback(kind, 'WebAudio played; speech fallback fired for audibility check');
        }, 650);
      }
    } catch (error) {
      const message = (error as Error).message || 'unknown error';
      this.runSpeechFallback(kind, `play:${kind} failed (${message})`);
    }
  }
}

export const sharedAudio = new SharedAudioEngine();
export type { SoundKind, AudioDiagnostics };
