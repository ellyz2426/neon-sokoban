// Hint system for Sokoban - Greedy heuristic-based
// Identifies the best box to push and suggests direction

import { CellType, GameState, Direction } from './game-manager';

interface HintResult {
  boxRow: number;
  boxCol: number;
  direction: Direction; // direction the PLAYER should move to push the box
  targetRow: number;
  targetCol: number;
}

function posKey(r: number, c: number): string {
  return `${r},${c}`;
}

function manhattan(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

/**
 * Generate a hint for the current game state.
 * Uses greedy heuristic: find the box closest to a target, suggest push direction.
 * Returns null if no hint is available.
 */
export function generateHint(state: GameState): HintResult | null {
  const { grid, boxes, playerRow, playerCol, width, height } = state;

  // Find all targets
  const targets: [number, number][] = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (grid[r][c] === CellType.Target) {
        targets.push([r, c]);
      }
    }
  }

  // Find unoccupied targets (targets without boxes on them)
  const freeTargets = targets.filter(([r, c]) => !boxes.has(posKey(r, c)));
  if (freeTargets.length === 0) return null; // All targets occupied = puzzle solved

  // Find boxes not on targets
  const freeBoxes: [number, number][] = [];
  for (const key of boxes) {
    const [r, c] = key.split(',').map(Number);
    if (grid[r][c] !== CellType.Target) {
      freeBoxes.push([r, c]);
    }
  }

  if (freeBoxes.length === 0) return null;

  // For each free box, find nearest free target and best push direction
  let bestHint: HintResult | null = null;
  let bestScore = Infinity;

  for (const [br, bc] of freeBoxes) {
    for (const [tr, tc] of freeTargets) {
      const dist = manhattan(br, bc, tr, tc);

      // For each possible push direction, check if player can reach the push position
      const pushDirs: { dir: Direction; dr: number; dc: number }[] = [
        { dir: 'up', dr: -1, dc: 0 },
        { dir: 'down', dr: 1, dc: 0 },
        { dir: 'left', dr: 0, dc: -1 },
        { dir: 'right', dr: 0, dc: 1 },
      ];

      for (const { dir, dr, dc } of pushDirs) {
        // Where does the box go if pushed in this direction?
        const newBR = br + dr;
        const newBC = bc + dc;

        // Where must the player be to push the box this direction?
        const pushR = br - dr;
        const pushC = bc - dc;

        // Check if push destination is valid
        if (newBR < 0 || newBR >= height || newBC < 0 || newBC >= width) continue;
        if (grid[newBR][newBC] === CellType.Wall || grid[newBR][newBC] === CellType.Empty) continue;
        if (boxes.has(posKey(newBR, newBC))) continue;

        // Check if push position is reachable by player
        if (pushR < 0 || pushR >= height || pushC < 0 || pushC >= width) continue;
        if (grid[pushR][pushC] === CellType.Wall || grid[pushR][pushC] === CellType.Empty) continue;
        if (boxes.has(posKey(pushR, pushC))) continue;

        // Check if pushing in this direction brings box closer to target
        const newDist = manhattan(newBR, newBC, tr, tc);
        if (newDist >= dist) continue; // Only suggest moves that bring box closer

        // Score: closer to target = better, player distance to push position
        const playerDist = manhattan(playerRow, playerCol, pushR, pushC);
        const score = newDist * 10 + playerDist;

        if (score < bestScore) {
          bestScore = score;
          bestHint = {
            boxRow: br,
            boxCol: bc,
            direction: dir,
            targetRow: tr,
            targetCol: tc,
          };
        }
      }
    }
  }

  return bestHint;
}

/**
 * Check if the player can reach a position via BFS (without pushing boxes).
 * Used for more accurate hint validation.
 */
export function canPlayerReach(
  state: GameState,
  targetR: number,
  targetC: number,
): boolean {
  const { grid, boxes, playerRow, playerCol, width, height } = state;

  if (playerRow === targetR && playerCol === targetC) return true;

  const visited = new Set<string>();
  const queue: [number, number][] = [[playerRow, playerCol]];
  visited.add(posKey(playerRow, playerCol));

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;

    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = r + dr;
      const nc = c + dc;
      const key = posKey(nr, nc);

      if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue;
      if (visited.has(key)) continue;
      if (grid[nr][nc] === CellType.Wall || grid[nr][nc] === CellType.Empty) continue;
      if (boxes.has(key)) continue;

      if (nr === targetR && nc === targetC) return true;

      visited.add(key);
      queue.push([nr, nc]);
    }
  }

  return false;
}
