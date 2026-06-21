// Main game system - handles input and game loop

import {
  createSystem,
  InputComponent,
} from '@iwsdk/core';
import { GameManager, Direction } from '../game-manager';
import { BoardRenderer } from '../board-renderer';
import { AudioManager } from '../audio-manager';
import { generateHint, canPlayerReach } from '../hints';
import { ReplayPlayer } from '../replay';

export type GameScreen = 'menu' | 'playing' | 'levelselect' | 'complete' | 'pause'
  | 'achievements' | 'stats' | 'settings' | 'help' | 'replay';

export class GameSystem extends createSystem({}) {
  private game!: GameManager;
  private boardRenderer!: BoardRenderer;
  private audio!: AudioManager;
  private _screen: GameScreen = 'menu';
  private inputCooldown = 0;
  private stickDeadzone = 0.5;
  private stickCooldown = 0;
  private _onScreenChange: ((screen: GameScreen) => void) | null = null;
  private prevPushCount = 0;
  isDailyChallenge = false;
  elapsedTime = 0; // seconds since level start
  private hintCooldown = 0;
  hintsUsed = 0;

  // Replay playback
  replayPlayer: ReplayPlayer | null = null;
  private _replayLevel = 0;

  private ensureReplayPlayer(): ReplayPlayer {
    if (!this.replayPlayer) {
      this.replayPlayer = new ReplayPlayer();
      this.replayPlayer.onMove((dir) => {
        if (this.game.state && !this.game.state.completed) {
          this.game.tryMove(dir);
        }
      });
      this.replayPlayer.onComplete(() => {
        setTimeout(() => {
          this._screen = 'complete';
          this._onScreenChange?.('complete');
        }, 800);
      });
    }
    return this.replayPlayer;
  }

  setRefs(refs: {
    game: GameManager;
    boardRenderer: BoardRenderer;
    audio: AudioManager;
  }): void {
    this.game = refs.game;
    this.boardRenderer = refs.boardRenderer;
    this.audio = refs.audio;

    this.game.onMove(() => {
      const state = this.game.state;
      if (!state) return;

      if (state.pushes > this.prevPushCount) {
        this.audio.playPush();
        for (const [r, c] of this.game.getBoxPositions()) {
          if (this.game.isBoxOnTarget(r, c)) {
            setTimeout(() => this.audio.playBoxOnTarget(), 100);
            break;
          }
        }
      } else {
        this.audio.playMove();
      }
      this.prevPushCount = state.pushes;
      this.boardRenderer.updatePositions();
    });

    this.game.onComplete(() => {
      this.audio.playComplete();
      this.boardRenderer.playCelebration();

      // Save daily challenge if applicable
      if (this.isDailyChallenge) {
        this.game.saveDailyChallenge(this.game.state?.moves || 0);
        this.isDailyChallenge = false;
      }

      setTimeout(() => {
        this._screen = 'complete';
        this._onScreenChange?.('complete');
      }, 1200);
    });

    this.game.onDeadlock((positions) => {
      this.boardRenderer.setDeadlockedBoxes(positions);
      this.audio.playDeadlock();
    });
  }

  onScreenChange(cb: (screen: GameScreen) => void): void {
    this._onScreenChange = cb;
  }

  get screen(): GameScreen { return this._screen; }

  setScreen(screen: GameScreen): void {
    this._screen = screen;
    this._onScreenChange?.(screen);

    // Start ambient music when entering gameplay
    if (screen === 'playing') {
      this.audio.startAmbientMusic();
    }
  }

  startGame(levelIdx: number): void {
    this.game.loadLevel(levelIdx);
    this.boardRenderer.buildBoard();
    this.prevPushCount = 0;
    this.isDailyChallenge = false;
    this.elapsedTime = 0;
    this.hintsUsed = 0;
    this._screen = 'playing';
    this._onScreenChange?.('playing');
    this.audio.startAmbientMusic();
  }

  startDailyChallenge(): void {
    const idx = this.game.getDailyLevelIndex();
    this.game.loadLevel(idx);
    this.boardRenderer.buildBoard();
    this.prevPushCount = 0;
    this.isDailyChallenge = true;
    this.elapsedTime = 0;
    this.hintsUsed = 0;
    this._screen = 'playing';
    this._onScreenChange?.('playing');
    this.audio.startAmbientMusic();
  }

  restartLevel(): void {
    this.game.restartLevel();
    this.boardRenderer.buildBoard();
    this.prevPushCount = 0;
    this.elapsedTime = 0;
    this._screen = 'playing';
    this._onScreenChange?.('playing');
  }

  nextLevel(): void {
    if (this.game.nextLevel()) {
      this.boardRenderer.buildBoard();
      this.prevPushCount = 0;
      this._screen = 'playing';
      this._onScreenChange?.('playing');
    } else {
      this._screen = 'menu';
      this._onScreenChange?.('menu');
    }
  }

  undoMove(): void {
    if (this.game.undo()) {
      this.audio.playUndo();
      this.boardRenderer.updatePositions();
      this.boardRenderer.clearHint();
      if (this.game.state) {
        this.prevPushCount = this.game.state.pushes;
      }
    }
  }

  redoMove(): void {
    if (this.game.redo()) {
      this.audio.playMove();
      this.boardRenderer.updatePositions();
      this.boardRenderer.clearHint();
      if (this.game.state) {
        this.prevPushCount = this.game.state.pushes;
      }
    }
  }

  startReplay(): void {
    const frames = this.game.lastReplayFrames;
    if (frames.length === 0) return;

    const rp = this.ensureReplayPlayer();

    // Reload the level to play from scratch
    this._replayLevel = this.game.currentLevel;
    this.game.loadLevel(this._replayLevel);
    this.boardRenderer.buildBoard();
    this.prevPushCount = 0;

    // Load and play
    rp.load(frames);
    rp.play(1.5);
    this.game.replaysWatched++;

    this._screen = 'replay';
    this._onScreenChange?.('replay');
  }

  stopReplay(): void {
    this.ensureReplayPlayer().stop();
    this._screen = 'complete';
    this._onScreenChange?.('complete');
  }

  showHint(): void {
    if (this.hintCooldown > 0) return;
    if (!this.game.state || this.game.state.completed) return;

    const hint = generateHint(this.game.state);
    if (hint) {
      // Validate player can reach the push position
      const pushR = hint.boxRow - (hint.direction === 'down' ? 1 : hint.direction === 'up' ? -1 : 0);
      const pushC = hint.boxCol - (hint.direction === 'right' ? 1 : hint.direction === 'left' ? -1 : 0);

      if (canPlayerReach(this.game.state, pushR, pushC)) {
        this.boardRenderer.setHintBox(`${hint.boxRow},${hint.boxCol}`);
        this.audio.playHint();
        this.hintsUsed++;
        this.game.totalHintsUsed++;
      } else {
        // Still show the box even if player can't reach directly
        this.boardRenderer.setHintBox(`${hint.boxRow},${hint.boxCol}`);
        this.audio.playHint();
        this.hintsUsed++;
        this.game.totalHintsUsed++;
      }
    } else {
      this.audio.playInvalid();
    }
    this.hintCooldown = 1.0; // 1 second cooldown
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  update(delta: number, _time: number): void {
    this.boardRenderer.update(delta);

    // Tick replay player when in replay mode
    if (this._screen === 'replay') {
      this.ensureReplayPlayer().update(delta);
      return;
    }

    if (this._screen !== 'playing') return;

    // Update elapsed time
    this.elapsedTime += delta;

    if (this.inputCooldown > 0) {
      this.inputCooldown -= delta;
    }
    if (this.stickCooldown > 0) {
      this.stickCooldown -= delta;
    }
    if (this.hintCooldown > 0) {
      this.hintCooldown -= delta;
    }

    const inputMgr = this.world.input as any;
    let dir: Direction | null = null;

    if (inputMgr.keyboard.getKeyDown('ArrowUp') || inputMgr.keyboard.getKeyDown('KeyW')) {
      dir = 'up';
    } else if (inputMgr.keyboard.getKeyDown('ArrowDown') || inputMgr.keyboard.getKeyDown('KeyS')) {
      dir = 'down';
    } else if (inputMgr.keyboard.getKeyDown('ArrowLeft') || inputMgr.keyboard.getKeyDown('KeyA')) {
      dir = 'left';
    } else if (inputMgr.keyboard.getKeyDown('ArrowRight') || inputMgr.keyboard.getKeyDown('KeyD')) {
      dir = 'right';
    }

    if (inputMgr.keyboard.getKeyDown('KeyZ')) {
      this.undoMove();
    }

    if (inputMgr.keyboard.getKeyDown('KeyY')) {
      this.redoMove();
    }

    if (inputMgr.keyboard.getKeyDown('KeyR')) {
      this.restartLevel();
    }

    if (inputMgr.keyboard.getKeyDown('KeyH')) {
      this.showHint();
    }

    if (inputMgr.keyboard.getKeyDown('Escape')) {
      this._screen = 'pause';
      this._onScreenChange?.('pause');
    }

    // XR controller input
    const rightPad = inputMgr.xr.gamepads.right;
    if (rightPad && this.stickCooldown <= 0) {
      const stick = rightPad.getAxesValues(InputComponent.Thumbstick);
      if (stick) {
        const { x, y } = stick;
        if (Math.abs(x) > this.stickDeadzone || Math.abs(y) > this.stickDeadzone) {
          if (Math.abs(x) > Math.abs(y)) {
            dir = x > 0 ? 'right' : 'left';
          } else {
            dir = y > 0 ? 'down' : 'up';
          }
          this.stickCooldown = 0.2;
        }
      }
    }

    const leftPad = inputMgr.xr.gamepads.left;
    if (leftPad && this.stickCooldown <= 0) {
      const stick = leftPad.getAxesValues(InputComponent.Thumbstick);
      if (stick) {
        const { x, y } = stick;
        if (Math.abs(x) > this.stickDeadzone || Math.abs(y) > this.stickDeadzone) {
          if (Math.abs(x) > Math.abs(y)) {
            dir = x > 0 ? 'right' : 'left';
          } else {
            dir = y > 0 ? 'down' : 'up';
          }
          this.stickCooldown = 0.2;
        }
      }
    }

    if (rightPad) {
      if (rightPad.getButtonDown(InputComponent.A_Button)) {
        this.undoMove();
      }
      if (rightPad.getButtonDown(InputComponent.B_Button)) {
        this._screen = 'pause';
        this._onScreenChange?.('pause');
      }
    }
    if (leftPad) {
      if (leftPad.getButtonDown(InputComponent.A_Button)) {
        this.restartLevel();
      }
      if (leftPad.getButtonDown(InputComponent.B_Button)) {
        this._screen = 'menu';
        this._onScreenChange?.('menu');
      }
    }

    if (dir && this.inputCooldown <= 0) {
      const moved = this.game.tryMove(dir);
      if (moved) {
        this.inputCooldown = 0.08;
      } else {
        this.audio.playInvalid();
        this.inputCooldown = 0.1;
      }
    }
  }
}
