// Procedural audio manager with ambient music

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private initialized = false;
  private musicPlaying = false;
  private musicOscillators: OscillatorNode[] = [];
  private musicGains: GainNode[] = [];
  sfxEnabled = true;
  musicEnabled = true;
  private ambientInterval: number | null = null;

  init(): void {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1.0;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.15;
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
    } catch { /* no audio */ }
  }

  private ensureResumed(): void {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggleSfx(): boolean {
    this.sfxEnabled = !this.sfxEnabled;
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.sfxEnabled ? 1.0 : 0;
    }
    return this.sfxEnabled;
  }

  toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicEnabled ? 0.15 : 0;
    }
    if (this.musicEnabled && !this.musicPlaying) {
      this.startAmbientMusic();
    } else if (!this.musicEnabled && this.musicPlaying) {
      this.stopAmbientMusic();
    }
    return this.musicEnabled;
  }

  startAmbientMusic(): void {
    this.init();
    if (!this.ctx || !this.musicGain || this.musicPlaying) return;
    this.ensureResumed();
    this.musicPlaying = true;

    // Ambient pad: slow evolving chords
    this.playAmbientChord();

    // Schedule evolving chords
    this.ambientInterval = window.setInterval(() => {
      if (this.musicPlaying && this.musicEnabled) {
        this.playAmbientChord();
      }
    }, 8000);
  }

  private playAmbientChord(): void {
    if (!this.ctx || !this.musicGain) return;
    this.ensureResumed();

    // Pentatonic ambient: pick random chord from progression
    const chords = [
      [65.41, 98.00, 130.81, 196.00],   // C2, G2, C3, G3
      [73.42, 110.00, 146.83, 220.00],   // D2, A2, D3, A3
      [55.00, 82.41, 110.00, 164.81],    // A1, E2, A2, E3
      [61.74, 92.50, 123.47, 185.00],    // B1, F#2, B2, F#3
      [49.00, 73.42, 98.00, 146.83],     // G1, D2, G2, D3
    ];

    const chord = chords[Math.floor(Math.random() * chords.length)];
    const now = this.ctx.currentTime;

    for (const freq of chord) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq + (Math.random() - 0.5) * 0.5; // slight detune

      // Slow attack and release
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 2);
      gain.gain.setValueAtTime(0.06, now + 5);
      gain.gain.linearRampToValueAtTime(0, now + 8);

      osc.connect(gain).connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 8.5);
    }

    // Optional subtle high shimmer
    if (Math.random() > 0.5) {
      const shimmer = this.ctx.createOscillator();
      const sGain = this.ctx.createGain();
      shimmer.type = 'triangle';
      shimmer.frequency.value = chord[2] * 4 + Math.random() * 20;
      sGain.gain.setValueAtTime(0, now + 1);
      sGain.gain.linearRampToValueAtTime(0.02, now + 3);
      sGain.gain.linearRampToValueAtTime(0, now + 7);
      shimmer.connect(sGain).connect(this.musicGain);
      shimmer.start(now + 1);
      shimmer.stop(now + 7.5);
    }
  }

  stopAmbientMusic(): void {
    this.musicPlaying = false;
    if (this.ambientInterval !== null) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
  }

  playMove(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    this.ensureResumed();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    osc.connect(gain).connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playPush(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    this.ensureResumed();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(330, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    osc.connect(gain).connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playBoxOnTarget(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    this.ensureResumed();
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, t + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);
      osc.connect(gain).connect(this.sfxGain!);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.3);
    });
  }

  playComplete(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    this.ensureResumed();
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
      osc.connect(gain).connect(this.sfxGain!);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.5);
    });
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq * 2;
      gain.gain.setValueAtTime(0, t + i * 0.12 + 0.02);
      gain.gain.linearRampToValueAtTime(0.08, t + i * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.4);
      osc.connect(gain).connect(this.sfxGain!);
      osc.start(t + i * 0.12 + 0.02);
      osc.stop(t + i * 0.12 + 0.4);
    });
  }

  playAchievement(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    this.ensureResumed();
    const t = this.ctx.currentTime;
    // Rising arpeggio with shimmer
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.12, t + i * 0.1 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.4);
      osc.connect(gain).connect(this.sfxGain!);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.4);
    });
    // Shimmer layer
    const shim = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    shim.type = 'triangle';
    shim.frequency.value = 1760;
    sGain.gain.setValueAtTime(0, t + 0.2);
    sGain.gain.linearRampToValueAtTime(0.05, t + 0.3);
    sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    shim.connect(sGain).connect(this.sfxGain);
    shim.start(t + 0.2);
    shim.stop(t + 0.8);
  }

  playUndo(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    this.ensureResumed();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(330, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain).connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playMenuClick(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    this.ensureResumed();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
    osc.connect(gain).connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  playInvalid(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.sfxEnabled) return;
    this.ensureResumed();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 150;
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc.connect(gain).connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }
}
