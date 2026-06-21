// Achievement system for Neon Sokoban

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: string; // ASCII icon
  condition: (stats: AchievementStats) => boolean;
}

export type AchievementCategory = 'puzzle' | 'efficiency' | 'explorer' | 'dedication' | 'mastery';

export interface AchievementStats {
  totalLevelsCompleted: number;
  uniqueLevelsCompleted: number;
  totalMoves: number;
  totalPushes: number;
  totalUndos: number;
  perfectLevels: number; // at or under par
  threeStarLevels: number;
  twoStarLevels: number;
  tutorialComplete: boolean; // levels 1-6
  easyComplete: boolean; // levels 7-12
  mediumComplete: boolean; // levels 13-18
  hardComplete: boolean; // levels 19-24
  expertComplete: boolean; // levels 25-30
  masterComplete: boolean; // levels 31-40
  grandmasterComplete: boolean; // levels 41-50
  allComplete: boolean;
  longestStreak: number; // consecutive levels without undo
  noUndoLevels: number; // levels completed without any undo
  totalRestarts: number;
  totalTimePlayed: number; // seconds
  levelsUnder10Moves: number;
  levelsFirstTry: number; // completed without restart
  currentSession: number; // levels completed this session
  dailyChallengesCompleted: number;
  deadlocksTriggered: number;
  hintsUsed: number;
  fastestLevelTime: number; // seconds
  noHintLevels: number;
  // Round 5 additions
  replaysWatched: number;
  themesUsed: number;
  twoStarOrBetter: number;
  perfectPushLevels: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  // PUZZLE category (completing levels)
  { id: 'first_solve', name: 'First Solve', description: 'Complete your first level', category: 'puzzle', icon: '[*]', condition: (s) => s.totalLevelsCompleted >= 1 },
  { id: 'getting_started', name: 'Getting Started', description: 'Complete 5 levels', category: 'puzzle', icon: '[*]', condition: (s) => s.uniqueLevelsCompleted >= 5 },
  { id: 'apprentice', name: 'Apprentice', description: 'Complete all Tutorial levels', category: 'puzzle', icon: '[T]', condition: (s) => s.tutorialComplete },
  { id: 'journeyman', name: 'Journeyman', description: 'Complete all Easy levels', category: 'puzzle', icon: '[E]', condition: (s) => s.easyComplete },
  { id: 'adept', name: 'Adept', description: 'Complete all Medium levels', category: 'puzzle', icon: '[M]', condition: (s) => s.mediumComplete },
  { id: 'veteran', name: 'Veteran', description: 'Complete all Hard levels', category: 'puzzle', icon: '[H]', condition: (s) => s.hardComplete },
  { id: 'grandmaster', name: 'Grandmaster', description: 'Complete all Expert levels', category: 'puzzle', icon: '[X]', condition: (s) => s.expertComplete },
  { id: 'completionist', name: 'Completionist', description: 'Complete all 30 basic levels', category: 'puzzle', icon: '[!]', condition: (s) => s.uniqueLevelsCompleted >= 30 },
  { id: 'ten_solves', name: 'Double Digits', description: 'Complete 10 unique levels', category: 'puzzle', icon: '[*]', condition: (s) => s.uniqueLevelsCompleted >= 10 },
  { id: 'twenty_solves', name: 'Rolling', description: 'Complete 20 unique levels', category: 'puzzle', icon: '[*]', condition: (s) => s.uniqueLevelsCompleted >= 20 },
  { id: 'master_clear', name: 'Master Class', description: 'Complete all Master levels', category: 'puzzle', icon: '[M]', condition: (s) => s.masterComplete },
  { id: 'grandmaster_clear', name: 'Grandmaster', description: 'Complete all Grandmaster levels', category: 'puzzle', icon: '[G]', condition: (s) => s.grandmasterComplete },
  { id: 'total_completionist', name: 'Total Completionist', description: 'Complete all 50 levels', category: 'puzzle', icon: '[!]', condition: (s) => s.allComplete },
  { id: 'thirty_solves', name: 'Halfway There', description: 'Complete 30 unique levels', category: 'puzzle', icon: '[*]', condition: (s) => s.uniqueLevelsCompleted >= 30 },
  { id: 'forty_solves', name: 'Almost There', description: 'Complete 40 unique levels', category: 'puzzle', icon: '[*]', condition: (s) => s.uniqueLevelsCompleted >= 40 },

  // EFFICIENCY category (skill-based)
  { id: 'on_par', name: 'On Par', description: 'Complete a level at or under par', category: 'efficiency', icon: '(=)', condition: (s) => s.perfectLevels >= 1 },
  { id: 'five_perfect', name: 'Sharpshooter', description: 'Complete 5 levels at par', category: 'efficiency', icon: '(=)', condition: (s) => s.perfectLevels >= 5 },
  { id: 'ten_perfect', name: 'Precision Master', description: 'Complete 10 levels at par', category: 'efficiency', icon: '(=)', condition: (s) => s.perfectLevels >= 10 },
  { id: 'all_perfect', name: 'Absolute Perfection', description: 'Complete all 50 levels at par', category: 'efficiency', icon: '(=)', condition: (s) => s.perfectLevels >= 50 },
  { id: 'three_stars_5', name: 'Star Collector', description: 'Earn 3 stars on 5 levels', category: 'efficiency', icon: '(3)', condition: (s) => s.threeStarLevels >= 5 },
  { id: 'three_stars_15', name: 'Star Hoarder', description: 'Earn 3 stars on 15 levels', category: 'efficiency', icon: '(3)', condition: (s) => s.threeStarLevels >= 15 },
  { id: 'three_stars_all', name: 'All Stars', description: 'Earn 3 stars on all 50 levels', category: 'efficiency', icon: '(3)', condition: (s) => s.threeStarLevels >= 50 },
  { id: 'no_undo_1', name: 'No Regrets', description: 'Complete a level without undo', category: 'efficiency', icon: '(!)', condition: (s) => s.noUndoLevels >= 1 },
  { id: 'no_undo_5', name: 'Confident', description: 'Complete 5 levels without undo', category: 'efficiency', icon: '(!)', condition: (s) => s.noUndoLevels >= 5 },
  { id: 'no_undo_10', name: 'Unwavering', description: 'Complete 10 levels without undo', category: 'efficiency', icon: '(!)', condition: (s) => s.noUndoLevels >= 10 },
  { id: 'quick_solve', name: 'Quick Solve', description: 'Complete a level in under 10 moves', category: 'efficiency', icon: '(<)', condition: (s) => s.levelsUnder10Moves >= 1 },

  // EXPLORER category (trying things)
  { id: 'hundred_moves', name: 'Keep Moving', description: 'Make 100 total moves', category: 'explorer', icon: '{>}', condition: (s) => s.totalMoves >= 100 },
  { id: 'thousand_moves', name: 'Marathon', description: 'Make 1000 total moves', category: 'explorer', icon: '{>}', condition: (s) => s.totalMoves >= 1000 },
  { id: 'five_k_moves', name: 'Endurance', description: 'Make 5000 total moves', category: 'explorer', icon: '{>}', condition: (s) => s.totalMoves >= 5000 },
  { id: 'hundred_pushes', name: 'Pusher', description: 'Push boxes 100 times', category: 'explorer', icon: '{P}', condition: (s) => s.totalPushes >= 100 },
  { id: 'thousand_pushes', name: 'Box Mover', description: 'Push boxes 1000 times', category: 'explorer', icon: '{P}', condition: (s) => s.totalPushes >= 1000 },
  { id: 'undo_master', name: 'Undo Master', description: 'Use undo 50 times', category: 'explorer', icon: '{U}', condition: (s) => s.totalUndos >= 50 },
  { id: 'undo_addict', name: 'Time Traveler', description: 'Use undo 200 times', category: 'explorer', icon: '{U}', condition: (s) => s.totalUndos >= 200 },
  { id: 'retry_5', name: 'Try Again', description: 'Restart levels 5 times', category: 'explorer', icon: '{R}', condition: (s) => s.totalRestarts >= 5 },
  { id: 'retry_25', name: 'Persistent', description: 'Restart levels 25 times', category: 'explorer', icon: '{R}', condition: (s) => s.totalRestarts >= 25 },

  // DEDICATION category (time and session)
  { id: 'five_session', name: 'Warming Up', description: 'Complete 5 levels in one session', category: 'dedication', icon: '<5>', condition: (s) => s.currentSession >= 5 },
  { id: 'ten_session', name: 'On A Roll', description: 'Complete 10 levels in one session', category: 'dedication', icon: '<X>', condition: (s) => s.currentSession >= 10 },
  { id: 'fifteen_session', name: 'Unstoppable', description: 'Complete 15 levels in one session', category: 'dedication', icon: '<+>', condition: (s) => s.currentSession >= 15 },
  { id: 'play_10min', name: 'Taking a Break', description: 'Play for 10 minutes total', category: 'dedication', icon: '<T>', condition: (s) => s.totalTimePlayed >= 600 },
  { id: 'play_30min', name: 'Hooked', description: 'Play for 30 minutes total', category: 'dedication', icon: '<T>', condition: (s) => s.totalTimePlayed >= 1800 },
  { id: 'play_1hr', name: 'Dedicated', description: 'Play for 1 hour total', category: 'dedication', icon: '<T>', condition: (s) => s.totalTimePlayed >= 3600 },

  // MASTERY category (combined feats)
  { id: 'first_try_3', name: 'Natural', description: 'Complete 3 levels on first try (no restart)', category: 'mastery', icon: '|!|', condition: (s) => s.levelsFirstTry >= 3 },
  { id: 'first_try_10', name: 'Prodigy', description: 'Complete 10 levels on first try', category: 'mastery', icon: '|!|', condition: (s) => s.levelsFirstTry >= 10 },
  { id: 'streak_3', name: 'Hot Streak', description: '3 consecutive levels without undo', category: 'mastery', icon: '|S|', condition: (s) => s.longestStreak >= 3 },
  { id: 'streak_5', name: 'Blazing', description: '5 consecutive levels without undo', category: 'mastery', icon: '|S|', condition: (s) => s.longestStreak >= 5 },
  { id: 'half_three_star', name: 'Half Perfect', description: '3 stars on 15 levels + all tutorial done', category: 'mastery', icon: '|*|', condition: (s) => s.threeStarLevels >= 15 && s.tutorialComplete },
  { id: 'true_master', name: 'True Master', description: 'All 50 levels done, 30+ at par, 1000+ moves', category: 'mastery', icon: '|G|', condition: (s) => s.allComplete && s.perfectLevels >= 30 && s.totalMoves >= 1000 },
  { id: 'daily_first', name: 'Daily Player', description: 'Complete your first daily challenge', category: 'mastery', icon: '|D|', condition: (s) => s.dailyChallengesCompleted >= 1 },
  { id: 'deadlock_awareness', name: 'Deadlock Detective', description: 'Trigger 10 deadlock warnings', category: 'explorer', icon: '{!}', condition: (s) => s.deadlocksTriggered >= 10 },

  // New achievements
  { id: 'hint_curious', name: 'Curious Mind', description: 'Use a hint for the first time', category: 'explorer', icon: '{?}', condition: (s) => s.hintsUsed >= 1 },
  { id: 'hint_seeker', name: 'Guidance Seeker', description: 'Use hints 10 times', category: 'explorer', icon: '{?}', condition: (s) => s.hintsUsed >= 10 },
  { id: 'hint_master', name: 'Hint Master', description: 'Use hints 50 times', category: 'explorer', icon: '{?}', condition: (s) => s.hintsUsed >= 50 },
  { id: 'speed_demon_30', name: 'Speed Demon', description: 'Complete a level in under 30 seconds', category: 'mastery', icon: '|>|', condition: (s) => s.fastestLevelTime < 30 },
  { id: 'speed_demon_15', name: 'Lightning', description: 'Complete a level in under 15 seconds', category: 'mastery', icon: '|>|', condition: (s) => s.fastestLevelTime < 15 },
  { id: 'no_hint_clear_5', name: 'Self-Reliant', description: 'Complete 5 levels without using hints', category: 'efficiency', icon: '(!)', condition: (s) => s.noHintLevels >= 5 },
  { id: 'deadlock_30', name: 'Deadlock Veteran', description: 'Trigger 30 deadlock warnings', category: 'explorer', icon: '{!}', condition: (s) => s.deadlocksTriggered >= 30 },

  // Round 5 new achievements
  { id: 'replay_first', name: 'Instant Replay', description: 'Watch your first solution replay', category: 'explorer', icon: '{R}', condition: (s) => s.replaysWatched >= 1 },
  { id: 'replay_10', name: 'Film Buff', description: 'Watch 10 solution replays', category: 'explorer', icon: '{R}', condition: (s) => s.replaysWatched >= 10 },
  { id: 'speed_demon_10', name: 'Blitz', description: 'Complete a level in under 10 seconds', category: 'mastery', icon: '|>|', condition: (s) => s.fastestLevelTime < 10 },
  { id: 'all_themes', name: 'Fashionista', description: 'Try all 6 color themes', category: 'explorer', icon: '{C}', condition: (s) => s.themesUsed >= 6 },
  { id: 'two_star_15', name: 'Silver Standard', description: 'Earn at least 2 stars on 15 levels', category: 'efficiency', icon: '(2)', condition: (s) => s.twoStarOrBetter >= 15 },
  { id: 'push_efficiency', name: 'Minimalist', description: 'Complete 3 levels with no unnecessary pushes', category: 'mastery', icon: '|P|', condition: (s) => s.perfectPushLevels >= 3 },
  { id: 'marathon_session', name: 'Marathon Session', description: 'Complete 20 levels in one session', category: 'dedication', icon: '<M>', condition: (s) => s.currentSession >= 20 },
];

export class AchievementTracker {
  earned: Set<string> = new Set();
  private _onEarned: ((ach: Achievement) => void) | null = null;

  constructor() {
    this.load();
  }

  onEarned(cb: (ach: Achievement) => void): void {
    this._onEarned = cb;
  }

  check(stats: AchievementStats): Achievement[] {
    const newlyEarned: Achievement[] = [];
    for (const ach of ACHIEVEMENTS) {
      if (!this.earned.has(ach.id) && ach.condition(stats)) {
        this.earned.add(ach.id);
        newlyEarned.push(ach);
        this._onEarned?.(ach);
      }
    }
    if (newlyEarned.length > 0) this.save();
    return newlyEarned;
  }

  getEarnedList(): Achievement[] {
    return ACHIEVEMENTS.filter(a => this.earned.has(a.id));
  }

  getLockedList(): Achievement[] {
    return ACHIEVEMENTS.filter(a => !this.earned.has(a.id));
  }

  getByCategory(cat: AchievementCategory): { earned: Achievement[]; locked: Achievement[] } {
    const all = ACHIEVEMENTS.filter(a => a.category === cat);
    return {
      earned: all.filter(a => this.earned.has(a.id)),
      locked: all.filter(a => !this.earned.has(a.id)),
    };
  }

  get totalEarned(): number { return this.earned.size; }
  get totalAvailable(): number { return ACHIEVEMENTS.length; }

  reset(): void {
    this.earned.clear();
    try {
      localStorage.removeItem('neon-sokoban-achievements');
    } catch { /* ignore */ }
  }

  private save(): void {
    try {
      localStorage.setItem('neon-sokoban-achievements', JSON.stringify([...this.earned]));
    } catch { /* ignore */ }
  }

  private load(): void {
    try {
      const saved = localStorage.getItem('neon-sokoban-achievements');
      if (saved) {
        this.earned = new Set(JSON.parse(saved));
      }
    } catch { /* ignore */ }
  }
}
