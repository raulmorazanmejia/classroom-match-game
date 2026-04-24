const SOUND_FILES = {
  start: '/sounds/start.mp3',
  place: '/sounds/place.mp3',
  correct: '/sounds/correct.mp3',
  wrong: '/sounds/wrong.mp3',
  complete: '/sounds/complete.mp3',
  test: '/sounds/start.mp3'
} as const;

type SoundKind = keyof typeof SOUND_FILES;

type AudioDiagnostics = {
  soundEnabled: boolean;
  armed: boolean;
  needsRearm: boolean;
  lastSoundPlayed: SoundKind | 'none';
  lastEvent: string;
  lastError: string;
  lastFallbackUsed: 'none' | 'oscillator';
};

class SharedAudioEngine {
  private unlocked = false;
  private needsRearm = false;
  private lastSoundPlayed: SoundKind | 'none' = 'none';
  private lastEvent = 'idle';
  private lastError = 'none';
  private lastFallbackUsed: 'none' | 'oscillator' = 'none';
  private listeners = new Set<(snapshot: AudioDiagnostics) => void>();
  private preloaded = new Map<SoundKind, HTMLAudioElement>();

  constructor() {
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('pageshow', this.handlePageShow);
      window.addEventListener('focus', this.handleWindowFocus);
    }
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      this.needsRearm = true;
      this.lastEvent = 'page hidden; audio will re-arm on next tap';
      this.emit();
    }
  };

  private handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      this.needsRearm = true;
      this.lastEvent = 'page restored from cache; audio re-arm required';
      this.emit();
    }
  };

  private handleWindowFocus = () => {
    if (document.visibilityState === 'visible') {
      this.needsRearm = true;
      this.lastEvent = 'window focus restored; audio may need re-arm';
      this.emit();
    }
  };

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
      soundEnabled: this.unlocked,
      armed: this.unlocked && !this.needsRearm,
      needsRearm: this.needsRearm,
      lastSoundPlayed: this.lastSoundPlayed,
      lastEvent: this.lastEvent,
      lastError: this.lastError,
      lastFallbackUsed: this.lastFallbackUsed
    };
  }

  private ensurePreloaded(kind: SoundKind): HTMLAudioElement {
    const existing = this.preloaded.get(kind);
    if (existing) return existing;

    const audio = new Audio(SOUND_FILES[kind]);
    audio.preload = 'auto';
    audio.load();
    this.preloaded.set(kind, audio);
    return audio;
  }

  private preloadAll(): void {
    (Object.keys(SOUND_FILES) as SoundKind[]).forEach((kind) => {
      this.ensurePreloaded(kind);
    });
    this.lastEvent = 'sound files preloaded';
    this.emit();
  }

  async resumeForGesture(source: string): Promise<boolean> {
    this.unlocked = true;
    this.needsRearm = false;
    this.lastError = 'none';
    this.lastEvent = `${source}: audio armed via user gesture`;
    this.preloadAll();
    this.emit();
    return true;
  }

  async unlock(): Promise<boolean> {
    return this.resumeForGesture('unlock');
  }

  async armAndPrime(source: string): Promise<boolean> {
    return this.resumeForGesture(source);
  }

  private runOscillatorFallback(reason: string): void {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      this.lastFallbackUsed = 'none';
      this.lastError = `${reason} + no AudioContext fallback`;
      this.lastEvent = 'audio failed; no fallback available';
      this.emit();
      return;
    }

    try {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
      this.lastFallbackUsed = 'oscillator';
      this.lastError = reason;
      this.lastEvent = 'audio fallback beep emitted';
      window.setTimeout(() => void ctx.close(), 300);
      this.emit();
    } catch (error) {
      this.lastFallbackUsed = 'none';
      this.lastError = `${reason}; fallback failed: ${(error as Error).message || 'unknown'}`;
      this.lastEvent = 'audio + fallback failed';
      this.emit();
    }
  }

  async play(kind: SoundKind): Promise<void> {
    if (!this.unlocked || this.needsRearm) {
      this.lastEvent = `play:${kind} blocked until next user gesture`;
      this.lastError = 'audio not armed';
      this.emit();
      return;
    }

    try {
      const base = this.ensurePreloaded(kind);
      const clip = base.cloneNode(true) as HTMLAudioElement;
      clip.currentTime = 0;
      await clip.play();
      this.lastFallbackUsed = 'none';
      this.lastSoundPlayed = kind;
      this.lastError = 'none';
      this.lastEvent = `play:${kind} file played`;
      this.emit();
    } catch (error) {
      const message = (error as Error).message || 'unknown error';
      this.lastError = `play:${kind} failed (${message})`;
      this.lastEvent = `play:${kind} failed; using placeholder`;
      this.runOscillatorFallback(`Missing or blocked audio file for ${kind}`);
    }
  }
}

export const sharedAudio = new SharedAudioEngine();
export type { SoundKind, AudioDiagnostics };
