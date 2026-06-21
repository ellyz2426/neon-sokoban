// Solution replay system for Neon Sokoban
// Records move sequences and plays them back after level completion

import { Direction } from './game-manager';

export interface ReplayFrame {
  direction: Direction;
  timestamp: number; // ms since level start
}

export class ReplayRecorder {
  private frames: ReplayFrame[] = [];
  private startTime = 0;
  private _recording = false;

  startRecording(): void {
    this.frames = [];
    this.startTime = performance.now();
    this._recording = true;
  }

  recordMove(dir: Direction): void {
    if (!this._recording) return;
    this.frames.push({
      direction: dir,
      timestamp: performance.now() - this.startTime,
    });
  }

  stopRecording(): ReplayFrame[] {
    this._recording = false;
    return [...this.frames];
  }

  get isRecording(): boolean {
    return this._recording;
  }

  get frameCount(): number {
    return this.frames.length;
  }

  getFrames(): ReplayFrame[] {
    return [...this.frames];
  }
}

export class ReplayPlayer {
  private frames: ReplayFrame[] = [];
  private currentFrame = 0;
  private elapsed = 0;
  private _playing = false;
  private _speed = 1.0;
  private _onMove: ((dir: Direction) => void) | null = null;
  private _onComplete: (() => void) | null = null;

  // Use fixed interval instead of original timestamps for consistent playback
  private readonly MOVE_INTERVAL = 0.25; // seconds between moves

  load(frames: ReplayFrame[]): void {
    this.frames = frames;
    this.currentFrame = 0;
    this.elapsed = 0;
    this._playing = false;
  }

  play(speed = 1.0): void {
    if (this.frames.length === 0) return;
    this._speed = speed;
    this.currentFrame = 0;
    this.elapsed = 0;
    this._playing = true;
  }

  stop(): void {
    this._playing = false;
  }

  onMove(cb: (dir: Direction) => void): void {
    this._onMove = cb;
  }

  onComplete(cb: () => void): void {
    this._onComplete = cb;
  }

  get isPlaying(): boolean {
    return this._playing;
  }

  get progress(): number {
    if (this.frames.length === 0) return 0;
    return this.currentFrame / this.frames.length;
  }

  get speed(): number {
    return this._speed;
  }

  set speed(v: number) {
    this._speed = Math.max(0.25, Math.min(4.0, v));
  }

  update(delta: number): void {
    if (!this._playing || this.currentFrame >= this.frames.length) return;

    this.elapsed += delta * this._speed;
    const targetTime = this.currentFrame * this.MOVE_INTERVAL;

    if (this.elapsed >= targetTime) {
      const frame = this.frames[this.currentFrame];
      this._onMove?.(frame.direction);
      this.currentFrame++;

      if (this.currentFrame >= this.frames.length) {
        this._playing = false;
        this._onComplete?.();
      }
    }
  }
}
