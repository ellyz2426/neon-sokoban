// UI System - handles PanelUI binding and updates

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

// Helper to safely set text on a panel element
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
}) {
  private game!: GameManager;
  private gameSystem!: GameSystem;
  private audio!: AudioManager;
  private menuDoc: UIKitDocument | null = null;
  private hudDoc: UIKitDocument | null = null;
  private levelsDoc: UIKitDocument | null = null;
  private completeDoc: UIKitDocument | null = null;
  private pauseDoc: UIKitDocument | null = null;

  // Panel entities for show/hide
  private menuEntity: import('@iwsdk/core').Entity | null = null;
  private hudEntity: import('@iwsdk/core').Entity | null = null;
  private levelsEntity: import('@iwsdk/core').Entity | null = null;
  private completeEntity: import('@iwsdk/core').Entity | null = null;
  private pauseEntity: import('@iwsdk/core').Entity | null = null;

  setRefs(refs: {
    game: GameManager;
    gameSystem: GameSystem;
    audio: AudioManager;
  }): void {
    this.game = refs.game;
    this.gameSystem = refs.gameSystem;
    this.audio = refs.audio;

    // Listen for screen changes
    this.gameSystem.onScreenChange((screen) => this.onScreenChange(screen));
  }

  init(): void {
    // Bind menu panel
    this.queries.menuPanel.subscribe('qualify', (entity) => {
      this.menuEntity = entity;
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.menuDoc = doc;

      const btnPlay = doc.getElementById('btn-play') as UIKit.Text | undefined;
      btnPlay?.addEventListener('click', () => {
        this.audio.playMenuClick();
        this.gameSystem.startGame(0);
      });

      const btnLevels = doc.getElementById('btn-levels') as UIKit.Text | undefined;
      btnLevels?.addEventListener('click', () => {
        this.audio.playMenuClick();
        this.gameSystem.setScreen('levelselect');
      });

      const btnContinue = doc.getElementById('btn-continue') as UIKit.Text | undefined;
      btnContinue?.addEventListener('click', () => {
        this.audio.playMenuClick();
        // Find first incomplete level
        let nextLevel = 0;
        for (let i = 0; i < LEVELS.length; i++) {
          if (!this.game.completedLevels.has(i)) { nextLevel = i; break; }
        }
        this.gameSystem.startGame(nextLevel);
      });
    });

    // Bind HUD panel
    this.queries.hudPanel.subscribe('qualify', (entity) => {
      this.hudEntity = entity;
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.hudDoc = doc;

      const btnUndo = doc.getElementById('btn-undo') as UIKit.Text | undefined;
      btnUndo?.addEventListener('click', () => this.gameSystem.undoMove());

      const btnRestart = doc.getElementById('btn-restart') as UIKit.Text | undefined;
      btnRestart?.addEventListener('click', () => {
        this.audio.playMenuClick();
        this.gameSystem.restartLevel();
      });

      const btnPause = doc.getElementById('btn-pause') as UIKit.Text | undefined;
      btnPause?.addEventListener('click', () => {
        this.audio.playMenuClick();
        this.gameSystem.setScreen('pause');
      });
    });

    // Bind levels panel
    this.queries.levelsPanel.subscribe('qualify', (entity) => {
      this.levelsEntity = entity;
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.levelsDoc = doc;

      // Wire level buttons
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

    // Bind complete panel
    this.queries.completePanel.subscribe('qualify', (entity) => {
      this.completeEntity = entity;
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.completeDoc = doc;

      const btnNext = doc.getElementById('btn-next') as UIKit.Text | undefined;
      btnNext?.addEventListener('click', () => {
        this.audio.playMenuClick();
        this.gameSystem.nextLevel();
      });

      const btnRetry = doc.getElementById('btn-retry') as UIKit.Text | undefined;
      btnRetry?.addEventListener('click', () => {
        this.audio.playMenuClick();
        this.gameSystem.restartLevel();
      });

      const btnMenu = doc.getElementById('btn-menu') as UIKit.Text | undefined;
      btnMenu?.addEventListener('click', () => {
        this.audio.playMenuClick();
        this.gameSystem.setScreen('menu');
      });
    });

    // Bind pause panel
    this.queries.pausePanel.subscribe('qualify', (entity) => {
      this.pauseEntity = entity;
      const doc = entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
      if (!doc) return;
      this.pauseDoc = doc;

      const btnResume = doc.getElementById('btn-resume') as UIKit.Text | undefined;
      btnResume?.addEventListener('click', () => {
        this.audio.playMenuClick();
        this.gameSystem.setScreen('playing');
      });

      const btnRestart = doc.getElementById('btn-prestart') as UIKit.Text | undefined;
      btnRestart?.addEventListener('click', () => {
        this.audio.playMenuClick();
        this.gameSystem.restartLevel();
      });

      const btnMenu = doc.getElementById('btn-pmenu') as UIKit.Text | undefined;
      btnMenu?.addEventListener('click', () => {
        this.audio.playMenuClick();
        this.gameSystem.setScreen('menu');
      });
    });
  }

  private onScreenChange(screen: GameScreen): void {
    // Show/hide panels
    this.setPanelVisible(this.menuEntity, screen === 'menu');
    this.setPanelVisible(this.hudEntity, screen === 'playing');
    this.setPanelVisible(this.levelsEntity, screen === 'levelselect');
    this.setPanelVisible(this.completeEntity, screen === 'complete');
    this.setPanelVisible(this.pauseEntity, screen === 'pause');

    // Update panel content
    if (screen === 'menu') this.updateMenuPanel();
    if (screen === 'levelselect') this.updateLevelsPanel();
    if (screen === 'complete') this.updateCompletePanel();
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

    // Hide next button if on last level
    const isLast = this.game.currentLevel >= LEVELS.length - 1;
    setVisible(this.completeDoc, 'btn-next', !isLast);
  }

  update(_delta: number, _time: number): void {
    // Update HUD during gameplay
    if (this.gameSystem.screen === 'playing' && this.hudDoc && this.game.state) {
      const state = this.game.state;
      const level = LEVELS[this.game.currentLevel];
      setText(this.hudDoc, 'level-text', `Level ${this.game.currentLevel + 1}: ${level?.name || ''}`);
      setText(this.hudDoc, 'moves-text', `Moves: ${state.moves}`);
      setText(this.hudDoc, 'pushes-text', `Pushes: ${state.pushes}`);
      setText(this.hudDoc, 'par-text', `Par: ${level?.par || 0}`);
    }
  }
}
