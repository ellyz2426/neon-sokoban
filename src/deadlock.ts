// Deadlock detection for Sokoban
// Detects simple deadlocks: boxes pushed into corners or against walls with no targets

import { CellType, GameState } from './game-manager';

function posKey(r: number, c: number): string {
  return `${r},${c}`;
}

/**
 * Check if a specific box position is a simple corner deadlock.
 * A corner deadlock occurs when a box is NOT on a target and has walls
 * on two perpendicular sides (forming a corner it can never escape).
 */
function isCornerDeadlock(
  grid: CellType[][],
  row: number,
  col: number,
  height: number,
  width: number,
): boolean {
  // If the box is on a target, it's not a deadlock
  if (grid[row][col] === CellType.Target) return false;

  const isBlocked = (r: number, c: number): boolean => {
    if (r < 0 || r >= height || c < 0 || c >= width) return true;
    return grid[r][c] === CellType.Wall || grid[r][c] === CellType.Empty;
  };

  const up = isBlocked(row - 1, col);
  const down = isBlocked(row + 1, col);
  const left = isBlocked(row, col - 1);
  const right = isBlocked(row, col + 1);

  // Corner: walls on two perpendicular sides
  return (up && left) || (up && right) || (down && left) || (down && right);
}

/**
 * Check for wall-line deadlock: a box is against a wall (edge or wall row)
 * and there are no targets along that wall segment between other walls.
 */
function isWallLineDeadlock(
  grid: CellType[][],
  row: number,
  col: number,
  height: number,
  width: number,
): boolean {
  if (grid[row][col] === CellType.Target) return false;

  const isWallOrOOB = (r: number, c: number): boolean => {
    if (r < 0 || r >= height || c < 0 || c >= width) return true;
    return grid[r][c] === CellType.Wall || grid[r][c] === CellType.Empty;
  };

  // Check horizontal walls (top or bottom side blocked)
  for (const dr of [-1, 1]) {
    if (isWallOrOOB(row + dr, col)) {
      // Box is against a wall on the top or bottom
      // Scan left and right along this wall to see if there's a target
      let hasTarget = false;

      // Scan left
      for (let c = col; c >= 0; c--) {
        if (isWallOrOOB(row, c)) break;
        if (grid[row][c] === CellType.Target) { hasTarget = true; break; }
        // Check that the wall continues along this row
        if (!isWallOrOOB(row + dr, c)) { hasTarget = true; break; } // gap in wall = can escape
      }

      if (!hasTarget) {
        // Scan right
        let rightHasTarget = false;
        for (let c = col + 1; c < width; c++) {
          if (isWallOrOOB(row, c)) break;
          if (grid[row][c] === CellType.Target) { rightHasTarget = true; break; }
          if (!isWallOrOOB(row + dr, c)) { rightHasTarget = true; break; }
        }
        if (!rightHasTarget) return true;
      }
    }
  }

  // Check vertical walls (left or right side blocked)
  for (const dc of [-1, 1]) {
    if (isWallOrOOB(row, col + dc)) {
      let hasTarget = false;

      // Scan up
      for (let r = row; r >= 0; r--) {
        if (isWallOrOOB(r, col)) break;
        if (grid[r][col] === CellType.Target) { hasTarget = true; break; }
        if (!isWallOrOOB(r, col + dc)) { hasTarget = true; break; }
      }

      if (!hasTarget) {
        let downHasTarget = false;
        for (let r = row + 1; r < height; r++) {
          if (isWallOrOOB(r, col)) break;
          if (grid[r][col] === CellType.Target) { downHasTarget = true; break; }
          if (!isWallOrOOB(r, col + dc)) { downHasTarget = true; break; }
        }
        if (!downHasTarget) return true;
      }
    }
  }

  return false;
}

/**
 * Find all deadlocked box positions in the current state.
 * Returns set of position keys ("row,col") that are deadlocked.
 */
export function findDeadlockedBoxes(state: GameState): Set<string> {
  const deadlocked = new Set<string>();
  const { grid, boxes, height, width } = state;

  for (const key of boxes) {
    const [r, c] = key.split(',').map(Number);

    // Skip boxes already on targets
    if (grid[r][c] === CellType.Target) continue;

    if (isCornerDeadlock(grid, r, c, height, width)) {
      deadlocked.add(key);
    } else if (isWallLineDeadlock(grid, r, c, height, width)) {
      deadlocked.add(key);
    }
  }

  return deadlocked;
}

/**
 * Check if the current state has any deadlock (i.e., the puzzle is unsolvable).
 */
export function hasDeadlock(state: GameState): boolean {
  return findDeadlockedBoxes(state).size > 0;
}
