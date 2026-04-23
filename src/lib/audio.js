const SOUND_PROFILE = {
  correct: { frequency: 900, duration: 0.12 },
  wrong: { frequency: 220, duration: 0.2 },
  place: { frequency: 560, duration: 0.1 }
};

class SharedAudioEngine {
  ctx = null;
  unlocked = false;

  ensure() {
    if (this.ctx) return this.ctx;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    this.ctx = new AudioContextClass();
    return this.ctx;
  }

  async unlock() {
    const ctx = this.ensure();
    if (!ctx) return false;
    await ctx.resume();
    this.unlocked = ctx.state === 'running';
    return this.unlocked;
  }

  async play(kind) {
    const ctx = this.ensure();
    if (!ctx) return;
    if (!this.unlocked) await this.unlock();
    if (!this.unlocked) return;

    const { frequency, duration } = SOUND_PROFILE[kind] ?? SOUND_PROFILE.place;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
}

export const sharedAudio = new SharedAudioEngine();
