const SOUND_PROFILE = {
  correct: { frequency: 900, duration: 0.12 },
  wrong: { frequency: 220, duration: 0.2 },
  place: { frequency: 560, duration: 0.1 }
} as const;

type SoundKind = keyof typeof SOUND_PROFILE;

type AudioDiagnostics = {
  contextState: AudioContextState | 'unavailable' | 'not-created';
  soundEnabled: boolean;
  lastSoundPlayed: SoundKind | 'none';
  lastEvent: string;
  lastError: string;
};

class SharedAudioEngine {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private lastSoundPlayed: SoundKind | 'none' = 'none';
  private lastEvent = 'idle';
  private lastError = 'none';
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
      lastError: this.lastError
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

  async play(kind: SoundKind): Promise<void> {
    const ctx = this.ensure();
    if (!ctx) return;

    if (ctx.state !== 'running') {
      await this.resumeForGesture(`play:${kind}`);
    }
    if (ctx.state !== 'running') {
      this.lastError = `play:${kind} blocked because AudioContext state is ${ctx.state}. iPhone/Safari requires a direct tap gesture.`;
      this.lastEvent = `play:${kind} skipped because context is ${ctx.state}.`;
      this.emit();
      return;
    }

    try {
      const { frequency, duration } = SOUND_PROFILE[kind] ?? SOUND_PROFILE.place;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);

      this.unlocked = true;
      this.lastError = 'none';
      this.lastSoundPlayed = kind;
      this.lastEvent = `play:${kind} emitted (${frequency}Hz/${duration}s).`;
      this.emit();
    } catch (error) {
      const message = (error as Error).message || 'unknown error';
      this.lastError = `play:${kind} failed (${message})`;
      this.lastEvent = `play:${kind} failed (${message})`;
      this.emit();
    }
  }
}

export const sharedAudio = new SharedAudioEngine();
export type { SoundKind, AudioDiagnostics };
