const SOUND_PROFILE = {
  correct: { frequency: 1320, duration: 0.24, gain: 0.34, wave: 'triangle' },
  wrong: { frequency: 180, duration: 0.38, gain: 0.32, wave: 'square' },
  place: { frequency: 880, duration: 0.3, gain: 0.36, wave: 'triangle' },
  test: { frequency: 1040, duration: 0.6, gain: 0.5, wave: 'square' }
};

class SharedAudioEngine {
  ctx = null;
  unlocked = false;
  lastFallbackUsed = 'none';

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

  runSpeechFallback(kind) {
    if (!window.speechSynthesis) {
      this.lastFallbackUsed = 'none';
      return;
    }
    const utterance = new SpeechSynthesisUtterance(kind === 'test' ? 'Audio test. If you hear this, sound fallback is working.' : 'beep');
    utterance.volume = 1;
    utterance.rate = 1;
    utterance.pitch = kind === 'wrong' ? 0.6 : 1.5;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    this.lastFallbackUsed = 'speech';
  }

  async play(kind) {
    const ctx = this.ensure();
    const { frequency, duration, gain: targetGain, wave } = SOUND_PROFILE[kind] ?? SOUND_PROFILE.place;
    this.lastFallbackUsed = 'none';
    if (!ctx) {
      this.runSpeechFallback(kind);
      return;
    }
    if (!this.unlocked) await this.unlock();
    if (!this.unlocked) {
      this.runSpeechFallback(kind);
      return;
    }

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
    if (kind === 'test') {
      window.setTimeout(() => this.runSpeechFallback(kind), 650);
    }
  }
}

export const sharedAudio = new SharedAudioEngine();
