// Core Sokoban game logic - Enhanced with full stats tracking

import { LEVELS, LevelDef } from './levels';
import { AchievementTracker, AchievementStats, Achievement } from './achievements';
import { findDeadlockedBoxes } from './deadlock';

export const enum CellType {
  Empty = 0,
  Wall = 1,
  Floor = 2,
  Target = 3,
}

export interface GameState {
  width: number;
  height: number;
  grid: CellType[][];
  boxes: Set<string>;
  playerRow: number;
  playerCol: number;
  moves: number;
  pushes: number;
  completed: boolean;
}

interface MoveRecord {
  playerRow: number;
  playerCol: number;
  boxFrom?: string;
  boxTo?: string;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

const DIR_DELTA: Record<Direction, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

function posKey(r: number, c: number): string {
  return `${r},${c}`;
}

export class GameManager {
  state: GameState | null = null;
  currentLevel = 0;
  private undoStack: MoveRecord[] = [];
  private _onMove: (() => void) | null = null;
  private _onComplete: (() => void) | null = null;
  private _onAchievement: ((ach: Achievement) => void) | null = null;
  private _onDeadlock: ((positions: Set<string>) => void) | null = null;
  bestMoves: number[] = [];
  completedLevels: Set<number> = new Set();
  gameMode: 'classic' | 'timed' | 'challenge' = 'classic';
  timerStart = 0;
  timerElapsed = 0;

  // Stats tracking
  totalMoves = 0;
  totalPushes = 0;
  totalLevelsCompleted = 0;
  totalUndos = 0;
  perfectLevels = 0;
  totalRestarts = 0;
  totalTimePlayed = 0; // seconds
  sessionLevels = 0; // levels completed this session
  currentLevelUndos = 0;
  currentLevelRestarted = false;
  noUndoLevels = 0;
  levelsFirstTry = 0;
  levelsUnder10Moves = 0;
  noUndoStreak = 0;
  longestNoUndoStreak = 0;
  threeStarCount = 0;
  sessionStartTime = 0;
  deadlocksTriggered = 0;
  totalHintsUsed = 0;

  // Best times (seconds) per level
  bestTimes: number[] = [];

  // Daily challenge
  dailyChallengeCompleted = false;
  dailyChallengeLevel = -1;
  dailyChallengeBestMoves = Infinity;

  // Achievement system
  achievements: AchievementTracker;

  constructor() {
    this.achievements = new AchievementTracker();
    this.sessionStartTime = performance.now();
    this.load();
  }

  private load(): void {
    try {
      const saved = localStorage.getItem('neon-sokoban-progress-v2');
      if (saved) {
        const d = JSON.parse(saved);
        this.completedLevels = new Set(d.completedLevels || []);
        this.bestMoves = d.bestMoves || [];
        this.totalLevelsCompleted = d.totalLevelsCompleted || 0;
        this.perfectLevels = d.perfectLevels || 0;
        this.totalMoves = d.totalMoves || 0;
        this.totalPushes = d.totalPushes || 0;
        this.totalUndos = d.totalUndos || 0;
        this.totalRestarts = d.totalRestarts || 0;
        this.totalTimePlayed = d.totalTimePlayed || 0;
        this.noUndoLevels = d.noUndoLevels || 0;
        this.levelsFirstTry = d.levelsFirstTry || 0;
        this.levelsUnder10Moves = d.levelsUnder10Moves || 0;
        this.longestNoUndoStreak = d.longestNoUndoStreak || 0;
        this.threeStarCount = d.threeStarCount || 0;
        this.totalHintsUsed = d.totalHintsUsed || 0;
        this.bestTimes = d.bestTimes || [];
      } else {
        // Migrate from v1
        const v1 = localStorage.getItem('neon-sokoban-progress');
        if (v1) {
          const d = JSON.parse(v1);
          this.completedLevels = new Set(d.completedLevels || []);
          this.bestMoves = d.bestMoves || [];
          this.totalLevelsCompleted = d.totalLevelsCompleted || 0;
          this.perfectLevels = d.perfectLevels || 0;
        }
      }
    } catch { /* ignore */ }
  }

  saveProgress(): void {
    try {
      // Update total time
      this.totalTimePlayed += (performance.now() - this.sessionStartTime) / 1000;
      this.sessionStartTime = performance.now();

      localStorage.setItem('neon-sokoban-progress-v2', JSON.stringify({
        completedLevels: [...this.completedLevels],
        bestMoves: this.bestMoves,
        totalLevelsCompleted: this.totalLevelsCompleted,
        perfectLevels: this.perfectLevels,
        totalMoves: this.totalMoves,
        totalPushes: this.totalPushes,
        totalUndos: this.totalUndos,
        totalRestarts: this.totalRestarts,
        totalTimePlayed: this.totalTimePlayed,
        noUndoLevels: this.noUndoLevels,
        levelsFirstTry: this.levelsFirstTry,
        levelsUnder10Moves: this.levelsUnder10Moves,
        longestNoUndoStreak: this.longestNoUndoStreak,
        threeStarCount: this.threeStarCount,
        totalHintsUsed: this.totalHintsUsed,
        bestTimes: this.bestTimes,
      }));
    } catch { /* ignore */ }
  }

  onMove(cb: () => void): void { this._onMove = cb; }
  onComplete(cb: () => void): void { this._onComplete = cb; }
  onDeadlock(cb: (positions: Set<string>) => void): void { this._onDeadlock = cb; }
  onAchievement(cb: (ach: Achievement) => void): void {
    this._onAchievement = cb;
    this.achievements.onEarned((ach) => this._onAchievement?.(ach));
  }

  getLevelDef(idx: number): LevelDef | undefined {
    return LEVELS[idx];
  }

  get levelCount(): number { return LEVELS.length; }

  loadLevel(idx: number): void {
    if (idx < 0 || idx >= LEVELS.length) return;
    this.currentLevel = idx;
    const def = LEVELS[idx];
    this.undoStack = [];
    this.currentLevelUndos = 0;
    this.currentLevelRestarted = false;

    const height = def.rows.length;
    const width = Math.max(...def.rows.map(r => r.length));

    const grid: CellType[][] = [];
    const boxes = new Set<string>();
    let playerRow = 0, playerCol = 0;

    for (let r = 0; r < height; r++) {
      grid[r] = [];
      for (let c = 0; c < width; c++) {
        const ch = def.rows[r][c] || ' ';
        switch (ch) {
          case '#':
            grid[r][c] = CellType.Wall;
            break;
          case '.':
            grid[r][c] = CellType.Target;
            break;
          case '$':
            grid[r][c] = CellType.Floor;
            boxes.add(posKey(r, c));
            break;
          case '@':
            grid[r][c] = CellType.Floor;
            playerRow = r;
            playerCol = c;
            break;
          case '+':
            grid[r][c] = CellType.Target;
            playerRow = r;
            playerCol = c;
            break;
          case '*':
            grid[r][c] = CellType.Target;
            boxes.add(posKey(r, c));
            break;
          case ' ':
          default:
            grid[r][c] = CellType.Empty;
            break;
        }
      }
    }

    this.floodFillFloor(grid, playerRow, playerCol, height, width);

    this.state = {
      width, height, grid, boxes,
      playerRow, playerCol,
      moves: 0, pushes: 0, completed: false,
    };
    this.timerStart = performance.now();
    this.timerElapsed = 0;
  }

  private floodFillFloor(grid: CellType[][], startR: number, startC: number, h: number, w: number): void {
    const visited = new Set<string>();
    const queue: [number, number][] = [[startR, startC]];
    visited.add(posKey(startR, startC));

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      if (grid[r][c] === CellType.Empty) {
        grid[r][c] = CellType.Floor;
      }
      for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < h && nc >= 0 && nc < w && !visited.has(posKey(nr, nc))) {
          visited.add(posKey(nr, nc));
          if (grid[nr][nc] !== CellType.Wall) {
            queue.push([nr, nc]);
          }
        }
      }
    }
  }

  tryMove(dir: Direction): boolean {
    if (!this.state || this.state.completed) return false;

    const [dr, dc] = DIR_DELTA[dir];
    const { playerRow: pr, playerCol: pc, grid, boxes, width, height } = this.state;
    const nr = pr + dr, nc = pc + dc;

    if (nr < 0 || nr >= height || nc < 0 || nc >= width) return false;
    if (grid[nr][nc] === CellType.Wall || grid[nr][nc] === CellType.Empty) return false;

    const nKey = posKey(nr, nc);

    if (boxes.has(nKey)) {
      const br = nr + dr, bc = nc + dc;
      if (br < 0 || br >= height || bc < 0 || bc >= width) return false;
      if (grid[br][bc] === CellType.Wall || grid[br][bc] === CellType.Empty) return false;
      const bKey = posKey(br, bc);
      if (boxes.has(bKey)) return false;

      boxes.delete(nKey);
      boxes.add(bKey);
      this.state.pushes++;
      this.totalPushes++;

      this.undoStack.push({
        playerRow: pr, playerCol: pc,
        boxFrom: nKey, boxTo: bKey,
      });
    } else {
      this.undoStack.push({ playerRow: pr, playerCol: pc });
    }

    this.state.playerRow = nr;
    this.state.playerCol = nc;
    this.state.moves++;
    this.totalMoves++;

    this._onMove?.();

    // Check for deadlock
    const deadlocked = findDeadlockedBoxes(this.state);
    if (deadlocked.size > 0) {
      this.deadlocksTriggered++;
      this._onDeadlock?.(deadlocked);
    }

    if (this.checkComplete()) {
      this.state.completed = true;
      this.timerElapsed = performance.now() - this.timerStart;
      this.completedLevels.add(this.currentLevel);
      this.totalLevelsCompleted++;
      this.sessionLevels++;

      const prevBest = this.bestMoves[this.currentLevel] || Infinity;
      if (this.state.moves < prevBest) {
        this.bestMoves[this.currentLevel] = this.state.moves;
      }

      const par = LEVELS[this.currentLevel]?.par || Infinity;
      if (this.state.moves <= par) {
        this.perfectLevels++;
      }

      const stars = this.getStarRating();
      if (stars === 3) this.threeStarCount++;

      // Track no-undo completion
      if (this.currentLevelUndos === 0) {
        this.noUndoLevels++;
        this.noUndoStreak++;
        if (this.noUndoStreak > this.longestNoUndoStreak) {
          this.longestNoUndoStreak = this.noUndoStreak;
        }
      } else {
        this.noUndoStreak = 0;
      }

      // Track first-try (no restart)
      if (!this.currentLevelRestarted) {
        this.levelsFirstTry++;
      }

      // Track under-10 moves
      if (this.state.moves < 10) {
        this.levelsUnder10Moves++;
      }

      this.saveProgress();

      // Check achievements
      this.checkAchievements();

      this._onComplete?.();
    }

    return true;
  }

  undo(): boolean {
    if (!this.state || this.undoStack.length === 0 || this.state.completed) return false;

    const record = this.undoStack.pop()!;
    this.state.playerRow = record.playerRow;
    this.state.playerCol = record.playerCol;
    this.state.moves--;
    this.totalUndos++;
    this.currentLevelUndos++;

    if (record.boxFrom && record.boxTo) {
      this.state.boxes.delete(record.boxTo);
      this.state.boxes.add(record.boxFrom);
      this.state.pushes--;
    }

    this._onMove?.();
    return true;
  }

  private checkComplete(): boolean {
    if (!this.state) return false;
    const { grid, boxes } = this.state;
    for (let r = 0; r < this.state.height; r++) {
      for (let c = 0; c < this.state.width; c++) {
        if (grid[r][c] === CellType.Target && !boxes.has(posKey(r, c))) {
          return false;
        }
      }
    }
    return true;
  }

  isBoxOnTarget(r: number, c: number): boolean {
    if (!this.state) return false;
    return this.state.grid[r][c] === CellType.Target && this.state.boxes.has(posKey(r, c));
  }

  getStarRating(): number {
    if (!this.state) return 0;
    const par = LEVELS[this.currentLevel]?.par || Infinity;
    const moves = this.state.moves;
    if (moves <= par) return 3;
    if (moves <= par * 1.5) return 2;
    return 1;
  }

  restartLevel(): void {
    this.totalRestarts++;
    this.currentLevelRestarted = true;
    this.loadLevel(this.currentLevel);
  }

  nextLevel(): boolean {
    if (this.currentLevel + 1 < LEVELS.length) {
      this.loadLevel(this.currentLevel + 1);
      return true;
    }
    return false;
  }

  getBoxPositions(): [number, number][] {
    if (!this.state) return [];
    return [...this.state.boxes].map(k => {
      const [r, c] = k.split(',').map(Number);
      return [r, c] as [number, number];
    });
  }

  getTargetPositions(): [number, number][] {
    if (!this.state) return [];
    const targets: [number, number][] = [];
    for (let r = 0; r < this.state.height; r++) {
      for (let c = 0; c < this.state.width; c++) {
        if (this.state.grid[r][c] === CellType.Target) {
          targets.push([r, c]);
        }
      }
    }
    return targets;
  }

  private checkAchievements(): void {
    const tiers = this.getTierCompletion();
    const stats: AchievementStats = {
      totalLevelsCompleted: this.totalLevelsCompleted,
      uniqueLevelsCompleted: this.completedLevels.size,
      totalMoves: this.totalMoves,
      totalPushes: this.totalPushes,
      totalUndos: this.totalUndos,
      perfectLevels: this.perfectLevels,
      threeStarLevels: this.threeStarCount,
      twoStarLevels: 0, // not tracked separately
      tutorialComplete: tiers.tutorial,
      easyComplete: tiers.easy,
      mediumComplete: tiers.medium,
      hardComplete: tiers.hard,
      expertComplete: tiers.expert,
      masterComplete: tiers.master,
      grandmasterComplete: tiers.grandmaster,
      allComplete: this.completedLevels.size >= LEVELS.length,
      longestStreak: this.longestNoUndoStreak,
      noUndoLevels: this.noUndoLevels,
      totalRestarts: this.totalRestarts,
      totalTimePlayed: this.totalTimePlayed + (performance.now() - this.sessionStartTime) / 1000,
      levelsUnder10Moves: this.levelsUnder10Moves,
      levelsFirstTry: this.levelsFirstTry,
      currentSession: this.sessionLevels,
      dailyChallengesCompleted: this.dailyChallengeCompleted ? 1 : 0,
      deadlocksTriggered: this.deadlocksTriggered,
      hintsUsed: this.totalHintsUsed,
      fastestLevelTime: this.timerElapsed / 1000,
      noHintLevels: this.levelsFirstTry, // reuse first-try as proxy for now
    };
    this.achievements.check(stats);
  }

  getTierCompletion(): { tutorial: boolean; easy: boolean; medium: boolean; hard: boolean; expert: boolean; master: boolean; grandmaster: boolean } {
    const check = (start: number, end: number) => {
      for (let i = start; i <= end; i++) {
        if (!this.completedLevels.has(i)) return false;
      }
      return true;
    };
    return {
      tutorial: check(0, 5),
      easy: check(6, 11),
      medium: check(12, 17),
      hard: check(18, 23),
      expert: check(24, 29),
      master: check(30, 39),
      grandmaster: check(40, 49),
    };
  }

  getFormattedTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  /** Get today's daily challenge level index based on date hash */
  getDailyLevelIndex(): number {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % LEVELS.length;
  }

  /** Check if daily challenge was completed today */
  isDailyChallengeCompleted(): boolean {
    try {
      const saved = localStorage.getItem('neon-sokoban-daily');
      if (saved) {
        const d = JSON.parse(saved);
        const today = new Date().toDateString();
        return d.date === today && d.completed;
      }
    } catch { /* ignore */ }
    return false;
  }

  /** Save daily challenge completion */
  saveDailyChallenge(moves: number): void {
    try {
      const today = new Date().toDateString();
      localStorage.setItem('neon-sokoban-daily', JSON.stringify({
        date: today,
        completed: true,
        moves,
        level: this.getDailyLevelIndex(),
      }));
    } catch { /* ignore */ }
  }
}
