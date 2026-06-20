// Core Sokoban game logic

import { LEVELS, LevelDef } from './levels';

export const enum CellType {
  Empty = 0,
  Wall = 1,
  Floor = 2,
  Target = 3,
}

export interface GameState {
  width: number;
  height: number;
  grid: CellType[][];     // static grid (walls, floor, targets)
  boxes: Set<string>;     // "row,col" keys for box positions
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
  bestMoves: number[] = []; // best moves per level
  completedLevels: Set<number> = new Set();
  gameMode: 'classic' | 'timed' | 'challenge' = 'classic';
  timerStart = 0;
  timerElapsed = 0;

  // Achievement tracking
  totalMoves = 0;
  totalPushes = 0;
  totalLevelsCompleted = 0;
  totalUndos = 0;
  perfectLevels = 0; // completed at or under par

  constructor() {
    // Load saved progress from localStorage
    try {
      const saved = localStorage.getItem('neon-sokoban-progress');
      if (saved) {
        const data = JSON.parse(saved);
        this.completedLevels = new Set(data.completedLevels || []);
        this.bestMoves = data.bestMoves || [];
        this.totalLevelsCompleted = data.totalLevelsCompleted || 0;
        this.perfectLevels = data.perfectLevels || 0;
      }
    } catch { /* ignore */ }
  }

  saveProgress(): void {
    try {
      localStorage.setItem('neon-sokoban-progress', JSON.stringify({
        completedLevels: [...this.completedLevels],
        bestMoves: this.bestMoves,
        totalLevelsCompleted: this.totalLevelsCompleted,
        perfectLevels: this.perfectLevels,
      }));
    } catch { /* ignore */ }
  }

  onMove(cb: () => void): void { this._onMove = cb; }
  onComplete(cb: () => void): void { this._onComplete = cb; }

  getLevelDef(idx: number): LevelDef | undefined {
    return LEVELS[idx];
  }

  get levelCount(): number { return LEVELS.length; }

  loadLevel(idx: number): void {
    if (idx < 0 || idx >= LEVELS.length) return;
    this.currentLevel = idx;
    const def = LEVELS[idx];
    this.undoStack = [];

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
          case '+': // player on target
            grid[r][c] = CellType.Target;
            playerRow = r;
            playerCol = c;
            break;
          case '*': // box on target
            grid[r][c] = CellType.Target;
            boxes.add(posKey(r, c));
            break;
          case ' ':
          default:
            // Determine if this is inside the level (floor) or outside (empty)
            grid[r][c] = CellType.Empty;
            break;
        }
      }
    }

    // Flood fill from player to mark reachable empty cells as floor
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

    // Out of bounds or wall
    if (nr < 0 || nr >= height || nc < 0 || nc >= width) return false;
    if (grid[nr][nc] === CellType.Wall || grid[nr][nc] === CellType.Empty) return false;

    const nKey = posKey(nr, nc);

    if (boxes.has(nKey)) {
      // Try to push the box
      const br = nr + dr, bc = nc + dc;
      if (br < 0 || br >= height || bc < 0 || bc >= width) return false;
      if (grid[br][bc] === CellType.Wall || grid[br][bc] === CellType.Empty) return false;
      const bKey = posKey(br, bc);
      if (boxes.has(bKey)) return false; // Can't push into another box

      // Push the box
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

    // Check completion
    if (this.checkComplete()) {
      this.state.completed = true;
      this.timerElapsed = performance.now() - this.timerStart;
      this.completedLevels.add(this.currentLevel);
      this.totalLevelsCompleted++;

      const prevBest = this.bestMoves[this.currentLevel] || Infinity;
      if (this.state.moves < prevBest) {
        this.bestMoves[this.currentLevel] = this.state.moves;
      }

      const par = LEVELS[this.currentLevel]?.par || Infinity;
      if (this.state.moves <= par) {
        this.perfectLevels++;
      }

      this.saveProgress();
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
    // All targets must have a box
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
    this.loadLevel(this.currentLevel);
  }

  nextLevel(): boolean {
    if (this.currentLevel + 1 < LEVELS.length) {
      this.loadLevel(this.currentLevel + 1);
      return true;
    }
    return false;
  }

  // Get all box positions as [row, col] pairs
  getBoxPositions(): [number, number][] {
    if (!this.state) return [];
    return [...this.state.boxes].map(k => {
      const [r, c] = k.split(',').map(Number);
      return [r, c] as [number, number];
    });
  }

  // Get all target positions
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
}
