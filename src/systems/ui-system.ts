// UI System - handles all PanelUI binding and updates

import {
  createSystem,
  PanelUI,
  PanelDocument,
  UIKitDocument,
  UIKit,
  World,
  eq,
} from '@iwsdk/core';
import { GameManager } from '../game-manager';
import { GameSystem, GameScreen } from './game-system';
import { AudioManager } from '../audio-manager';
import { LEVELS } from '../levels';
import { ACHIEVEMENTS, AchievementCategory } from '../achievements';
import { ThemeManager, THEMES } from '../themes';

function setText(doc: UIKitDocument | undefined, id: string, text: string): void {
  if (!doc) return;
  const el = doc.getElementById(id) as UIKit.Text | undefined;
  el?.setProperties({ text });
}

function setVisible(doc: UIKitDocument | undefined, id: string, visible: boolean): void {
  if (!doc) return;
  const el = doc.getElementById(id) as UIKit.Text | undefined;
  el?.setProperties({ display: visible ? 'flex' : 'none' });
}

export class UISystem extends createSystem({
  menuPanel: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, 'config', './ui/menu.json')],
  },
  hudPanel: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, 'config', './ui/hud.json')],
  },
  levelsPanel: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, 'config', './ui/levels.json')],
  },
  completePanel: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, 'config', './ui/done.json')],
  },
  pausePanel: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, 'config', './ui/pause.json')],
  },
  achievementsPanel: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, 'config', './ui/achvmnts.json')],
  },
  statsPanel: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, 'config', './ui/stats.json')],
  },
  settingsPanel: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, 'config', './ui/settings.json')],
  },
  toastPanel: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, 'config', './ui/toast.json')],
  },
}) {
  private game!: GameManager;
  private gameSystem!: GameSystem;
  private audio!: AudioManager;
  private themeManager!: ThemeManager;
  private _onThemeChange: (() => void) | null = null;

  // Docs
  private menuDoc: UIKitDocument | null = null;
  private hudDoc: UIKitDocument | null = null;
  private levelsDoc: UIKitDocument | null = null;
  private completeDoc: UIKitDocument | null = null;
  private pauseDoc: UIKitDocument | null = null;
  private achievementsDoc: UIKitDocument | null = null;
  private statsDoc: UIKitDocument | null = null;
  private settingsDoc: UIKitDocument | null = null;
  private toastDoc: UIKitDocument | null = null;

  // Entities
  private menuEntity: import('@iwsdk/core').Entity | null = null;
  private hudEntity: import('@iwsdk/core').Entity | null = null;
  private levelsEntity: import('@iwsdk/core').Entity | null = null;
  private completeEntity: import('@iwsdk/core').Entity | null = null;
  private pauseEntity: import('@iwsdk/core').Entity | null = null;
  private achievementsEntity: import('@iwsdk/core').Entity | null = null;
  private statsEntity: import('@iwsdk/core').Entity | null = null;
  private settingsEntity: import('@iwsdk/core').Entity | null = null;
  private toastEntity: import('@iwsdk/core').Entity | null = null;

  // Achievement page state
  private achPage = 0;
  private achCategories: AchievementCategory[] = ['puzzle', 'efficiency', 'explorer', 'dedication', 'mastery'];

  // Toast timing
  private toastTimer = 0;
  private toastQueue: { icon: string; name: string; desc: string }[] = [];

  setRefs(refs: {
    game: GameManager;
    gameSystem: GameSystem;
    audio: AudioManager;
    themeManager: ThemeManager;
    onThemeChange: () => void;
  }): void {
    this.game = refs.game;
    this.gameSystem = refs.gameSystem;
    this.audio = refs.audio;
    this.themeManager = refs.themeManager;
    this._onThemeChange = refs.onThemeChange;

    this.gameSystem.onScreenChange((screen) => this.onScreenChange(screen));

    // Wire achievement notifications
    this.game.onAchievement((ach) => {
      this.toastQueue.push({ icon: ach.icon, name: ach.name, desc: ach.description });
      this.audio.playAchievement();
    });
  }

  init(): void {
    this.bindMenuPanel();
    this.bindHudPanel();
    this.bindLevelsPanel();
    this.bindCompletePanel();
    this.bindPausePanel();
    this.bindAchievementsPanel();
    this.bindStatsPanel();
    this.bindSettingsPanel();
    this.bindToastPanel();
  }

  private bindMenuPanel(): void {
    this.queries.menuPanel.subscribe('qualify', (entity) => {
      this.menuEntity = entity;
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.menuDoc = doc;

      const wire = (id: string, cb: () => void) => {
        const el = doc.getElementById(id) as UIKit.Text | undefined;
        el?.addEventListener('click', cb);
      };

      wire('btn-play', () => {
        this.audio.playMenuClick();
        this.gameSystem.startGame(0);
      });
      wire('btn-levels', () => {
        this.audio.playMenuClick();
        this.gameSystem.setScreen('levelselect');
      });
      wire('btn-continue', () => {
        this.audio.playMenuClick();
        let nextLevel = 0;
        for (let i = 0; i < LEVELS.length; i++) {
          if (!this.game.completedLevels.has(i)) { nextLevel = i; break; }
        }
        this.gameSystem.startGame(nextLevel);
      });
      wire('btn-achievements', () => {
        this.audio.playMenuClick();
        this.achPage = 0;
        this.gameSystem.setScreen('achievements');
      });
      wire('btn-stats', () => {
        this.audio.playMenuClick();
        this.gameSystem.setScreen('stats');
      });
      wire('btn-settings', () => {
        this.audio.playMenuClick();
        this.gameSystem.setScreen('settings');
      });
    });
  }

  private bindHudPanel(): void {
    this.queries.hudPanel.subscribe('qualify', (entity) => {
      this.hudEntity = entity;
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.hudDoc = doc;

      const wire = (id: string, cb: () => void) => {
        const el = doc.getElementById(id) as UIKit.Text | undefined;
        el?.addEventListener('click', cb);
      };

      wire('btn-undo', () => this.gameSystem.undoMove());
      wire('btn-restart', () => {
        this.audio.playMenuClick();
        this.gameSystem.restartLevel();
      });
      wire('btn-pause', () => {
        this.audio.playMenuClick();
        this.gameSystem.setScreen('pause');
      });
    });
  }

  private bindLevelsPanel(): void {
    this.queries.levelsPanel.subscribe('qualify', (entity) => {
      this.levelsEntity = entity;
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.levelsDoc = doc;

      for (let i = 0; i < LEVELS.length; i++) {
        const btn = doc.getElementById(`lvl-${i}`) as UIKit.Text | undefined;
        if (btn) {
          const idx = i;
          btn.addEventListener('click', () => {
            this.audio.playMenuClick();
            this.gameSystem.startGame(idx);
          });
        }
      }

      const btnBack = doc.getElementById('btn-back') as UIKit.Text | undefined;
      btnBack?.addEventListener('click', () => {
        this.audio.playMenuClick();
        this.gameSystem.setScreen('menu');
      });
    });
  }

  private bindCompletePanel(): void {
    this.queries.completePanel.subscribe('qualify', (entity) => {
      this.completeEntity = entity;
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.completeDoc = doc;

      const wire = (id: string, cb: () => void) => {
        const el = doc.getElementById(id) as UIKit.Text | undefined;
        el?.addEventListener('click', cb);
      };

      wire('btn-next', () => {
        this.audio.playMenuClick();
        this.gameSystem.nextLevel();
      });
      wire('btn-retry', () => {
        this.audio.playMenuClick();
        this.gameSystem.restartLevel();
      });
      wire('btn-menu', () => {
        this.audio.playMenuClick();
        this.gameSystem.setScreen('menu');
      });
    });
  }

  private bindPausePanel(): void {
    this.queries.pausePanel.subscribe('qualify', (entity) => {
      this.pauseEntity = entity;
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.pauseDoc = doc;

      const wire = (id: string, cb: () => void) => {
        const el = doc.getElementById(id) as UIKit.Text | undefined;
        el?.addEventListener('click', cb);
      };

      wire('btn-resume', () => {
        this.audio.playMenuClick();
        this.gameSystem.setScreen('playing');
      });
      wire('btn-prestart', () => {
        this.audio.playMenuClick();
        this.gameSystem.restartLevel();
      });
      wire('btn-pmenu', () => {
        this.audio.playMenuClick();
        this.gameSystem.setScreen('menu');
      });
    });
  }

  private bindAchievementsPanel(): void {
    this.queries.achievementsPanel.subscribe('qualify', (entity) => {
      this.achievementsEntity = entity;
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.achievementsDoc = doc;

      const wire = (id: string, cb: () => void) => {
        const el = doc.getElementById(id) as UIKit.Text | undefined;
        el?.addEventListener('click', cb);
      };

      wire('ach-prev', () => {
        this.audio.playMenuClick();
        this.achPage = (this.achPage - 1 + this.achCategories.length) % this.achCategories.length;
        this.updateAchievementsPanel();
      });
      wire('ach-next', () => {
        this.audio.playMenuClick();
        this.achPage = (this.achPage + 1) % this.achCategories.length;
        this.updateAchievementsPanel();
      });
      wire('ach-back', () => {
        this.audio.playMenuClick();
        this.gameSystem.setScreen('menu');
      });
    });
  }

  private bindStatsPanel(): void {
    this.queries.statsPanel.subscribe('qualify', (entity) => {
      this.statsEntity = entity;
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.statsDoc = doc;

      const btnBack = doc.getElementById('stats-back') as UIKit.Text | undefined;
      btnBack?.addEventListener('click', () => {
        this.audio.playMenuClick();
        this.gameSystem.setScreen('menu');
      });
    });
  }

  private bindSettingsPanel(): void {
    this.queries.settingsPanel.subscribe('qualify', (entity) => {
      this.settingsEntity = entity;
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.settingsDoc = doc;

      const wire = (id: string, cb: () => void) => {
        const el = doc.getElementById(id) as UIKit.Text | undefined;
        el?.addEventListener('click', cb);
      };

      wire('theme-prev', () => {
        this.audio.playMenuClick();
        this.themeManager.prevTheme();
        this._onThemeChange?.();
        this.updateSettingsPanel();
      });
      wire('theme-next', () => {
        this.audio.playMenuClick();
        this.themeManager.nextTheme();
        this._onThemeChange?.();
        this.updateSettingsPanel();
      });
      wire('sfx-toggle', () => {
        const on = this.audio.toggleSfx();
        this.audio.playMenuClick();
        this.updateSettingsPanel();
      });
      wire('music-toggle', () => {
        this.audio.toggleMusic();
        this.audio.playMenuClick();
        this.updateSettingsPanel();
      });
      wire('settings-back', () => {
        this.audio.playMenuClick();
        this.gameSystem.setScreen('menu');
      });
    });
  }

  private bindToastPanel(): void {
    this.queries.toastPanel.subscribe('qualify', (entity) => {
      this.toastEntity = entity;
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.toastDoc = doc;
    });
  }

  private onScreenChange(screen: GameScreen): void {
    this.setPanelVisible(this.menuEntity, screen === 'menu');
    this.setPanelVisible(this.hudEntity, screen === 'playing');
    this.setPanelVisible(this.levelsEntity, screen === 'levelselect');
    this.setPanelVisible(this.completeEntity, screen === 'complete');
    this.setPanelVisible(this.pauseEntity, screen === 'pause');
    this.setPanelVisible(this.achievementsEntity, screen === 'achievements');
    this.setPanelVisible(this.statsEntity, screen === 'stats');
    this.setPanelVisible(this.settingsEntity, screen === 'settings');

    if (screen === 'menu') this.updateMenuPanel();
    if (screen === 'levelselect') this.updateLevelsPanel();
    if (screen === 'complete') this.updateCompletePanel();
    if (screen === 'achievements') this.updateAchievementsPanel();
    if (screen === 'stats') this.updateStatsPanel();
    if (screen === 'settings') this.updateSettingsPanel();
  }

  private setPanelVisible(entity: import('@iwsdk/core').Entity | null, visible: boolean): void {
    if (!entity || !entity.object3D) return;
    entity.object3D.visible = visible;
  }

  private updateMenuPanel(): void {
    if (!this.menuDoc) return;
    const completed = this.game.completedLevels.size;
    const total = LEVELS.length;
    setText(this.menuDoc, 'progress-text', `${completed}/${total} Levels`);
  }

  private updateLevelsPanel(): void {
    if (!this.levelsDoc) return;
    for (let i = 0; i < LEVELS.length; i++) {
      const btn = this.levelsDoc.getElementById(`lvl-${i}`) as UIKit.Text | undefined;
      if (btn) {
        const completed = this.game.completedLevels.has(i);
        const best = this.game.bestMoves[i];
        const par = LEVELS[i].par;
        let label = `${i + 1}`;
        if (completed && best !== undefined) {
          const stars = best <= par ? '***' : best <= par * 1.5 ? '**' : '*';
          label = `${i + 1} ${stars}`;
        }
        btn.setProperties({ text: label });
        if (completed) {
          btn.setProperties({ backgroundColor: '#004422' });
        }
      }
    }
  }

  private updateCompletePanel(): void {
    if (!this.completeDoc || !this.game.state) return;
    const state = this.game.state;
    const par = LEVELS[this.game.currentLevel]?.par || 0;
    const stars = this.game.getStarRating();
    const starStr = '*'.repeat(stars) + '-'.repeat(3 - stars);

    setText(this.completeDoc, 'level-name', LEVELS[this.game.currentLevel]?.name || '');
    setText(this.completeDoc, 'moves-text', `Moves: ${state.moves}`);
    setText(this.completeDoc, 'pushes-text', `Pushes: ${state.pushes}`);
    setText(this.completeDoc, 'par-text', `Par: ${par}`);
    setText(this.completeDoc, 'stars-text', starStr);

    const isLast = this.game.currentLevel >= LEVELS.length - 1;
    setVisible(this.completeDoc, 'btn-next', !isLast);
  }

  private updateAchievementsPanel(): void {
    if (!this.achievementsDoc) return;
    const cat = this.achCategories[this.achPage];
    const catNames: Record<AchievementCategory, string> = {
      puzzle: 'PUZZLE',
      efficiency: 'EFFICIENCY',
      explorer: 'EXPLORER',
      dedication: 'DEDICATION',
      mastery: 'MASTERY',
    };

    setText(this.achievementsDoc, 'ach-counter',
      `${this.game.achievements.totalEarned} / ${this.game.achievements.totalAvailable} Earned`);
    setText(this.achievementsDoc, 'cat-title', catNames[cat]);
    setText(this.achievementsDoc, 'ach-page',
      `${this.achPage + 1} / ${this.achCategories.length}`);

    const { earned, locked } = this.game.achievements.getByCategory(cat);
    const all = [...earned, ...locked];

    for (let i = 0; i < 10; i++) {
      if (i < all.length) {
        const ach = all[i];
        const isEarned = this.game.achievements.earned.has(ach.id);
        setText(this.achievementsDoc, `ach-${i}-icon`, ach.icon);
        setText(this.achievementsDoc, `ach-${i}-name`, ach.name);
        setText(this.achievementsDoc, `ach-${i}-desc`, ach.description);

        const iconEl = this.achievementsDoc.getElementById(`ach-${i}-icon`) as UIKit.Text | undefined;
        const nameEl = this.achievementsDoc.getElementById(`ach-${i}-name`) as UIKit.Text | undefined;
        const descEl = this.achievementsDoc.getElementById(`ach-${i}-desc`) as UIKit.Text | undefined;
        if (isEarned) {
          iconEl?.setProperties({ color: '#ffcc00' });
          nameEl?.setProperties({ color: '#00eeff' });
          descEl?.setProperties({ color: '#668899' });
        } else {
          iconEl?.setProperties({ color: '#334455' });
          nameEl?.setProperties({ color: '#445566' });
          descEl?.setProperties({ color: '#334455' });
        }

        setVisible(this.achievementsDoc, `ach-${i}`, true);
      } else {
        setVisible(this.achievementsDoc, `ach-${i}`, false);
      }
    }
  }

  private updateStatsPanel(): void {
    if (!this.statsDoc) return;
    setText(this.statsDoc, 'stat-levels', `${this.game.completedLevels.size} / ${LEVELS.length}`);
    setText(this.statsDoc, 'stat-3star', String(this.game.threeStarCount));
    setText(this.statsDoc, 'stat-perfect', String(this.game.perfectLevels));
    setText(this.statsDoc, 'stat-ach',
      `${this.game.achievements.totalEarned} / ${this.game.achievements.totalAvailable}`);
    setText(this.statsDoc, 'stat-moves', String(this.game.totalMoves));
    setText(this.statsDoc, 'stat-pushes', String(this.game.totalPushes));
    setText(this.statsDoc, 'stat-undos', String(this.game.totalUndos));
    setText(this.statsDoc, 'stat-restarts', String(this.game.totalRestarts));
    setText(this.statsDoc, 'stat-noundo', String(this.game.noUndoLevels));
    setText(this.statsDoc, 'stat-firsttry', String(this.game.levelsFirstTry));
    setText(this.statsDoc, 'stat-streak', String(this.game.longestNoUndoStreak));
    setText(this.statsDoc, 'stat-quick', String(this.game.levelsUnder10Moves));
  }

  private updateSettingsPanel(): void {
    if (!this.settingsDoc) return;
    setText(this.settingsDoc, 'theme-name', this.themeManager.current.name);
    setText(this.settingsDoc, 'sfx-value', this.audio.sfxEnabled ? 'ON' : 'OFF');
    setText(this.settingsDoc, 'music-value', this.audio.musicEnabled ? 'ON' : 'OFF');
  }

  private showToast(icon: string, name: string, desc: string): void {
    if (!this.toastDoc) return;
    setText(this.toastDoc, 'toast-icon', icon);
    setText(this.toastDoc, 'toast-name', name);
    setText(this.toastDoc, 'toast-desc', desc);
    this.setPanelVisible(this.toastEntity, true);
    this.toastTimer = 3.5;
  }

  update(_delta: number, _time: number): void {
    // Update HUD
    if (this.gameSystem.screen === 'playing' && this.hudDoc && this.game.state) {
      const state = this.game.state;
      const level = LEVELS[this.game.currentLevel];
      setText(this.hudDoc, 'level-text', `Level ${this.game.currentLevel + 1}: ${level?.name || ''}`);
      setText(this.hudDoc, 'moves-text', `Moves: ${state.moves}`);
      setText(this.hudDoc, 'pushes-text', `Pushes: ${state.pushes}`);
      setText(this.hudDoc, 'par-text', `Par: ${level?.par || 0}`);
    }

    // Toast timer
    if (this.toastTimer > 0) {
      this.toastTimer -= _delta;
      if (this.toastTimer <= 0) {
        this.setPanelVisible(this.toastEntity, false);
        // Show next in queue
        if (this.toastQueue.length > 0) {
          const next = this.toastQueue.shift()!;
          this.showToast(next.icon, next.name, next.desc);
        }
      }
    } else if (this.toastQueue.length > 0) {
      const next = this.toastQueue.shift()!;
      this.showToast(next.icon, next.name, next.desc);
    }
  }
}
