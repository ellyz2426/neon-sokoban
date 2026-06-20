// Procedural audio manager for Neon Sokoban

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch { /* no audio */ }
  }

  private ensureResumed(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playMove(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.connect(gain).connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playPush(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(330, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain).connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playBoxOnTarget(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    this.ensureResumed();
    // Pleasant chime
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, t + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);
      osc.connect(gain).connect(this.masterGain!);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.3);
    });
  }

  playComplete(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    this.ensureResumed();
    // Victory fanfare
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.15, t + i * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.5);
      osc.connect(gain).connect(this.masterGain!);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.5);
    });
    // Second layer with triangle wave
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq * 2;
      gain.gain.setValueAtTime(0, t + i * 0.12 + 0.02);
      gain.gain.linearRampToValueAtTime(0.08, t + i * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.4);
      osc.connect(gain).connect(this.masterGain!);
      osc.start(t + i * 0.12 + 0.02);
      osc.stop(t + i * 0.12 + 0.4);
    });
  }

  playUndo(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(330, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain).connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playMenuClick(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
    osc.connect(gain).connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  playInvalid(): void {
    this.init();
    if (!this.ctx || !this.masterGain) return;
    this.ensureResumed();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 150;
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc.connect(gain).connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }
}
