// Theme system for Neon Sokoban

import { Color } from '@iwsdk/core';

export interface ThemeColors {
  wall: Color;
  wallEdge: Color;
  floor: Color;
  floorLine: Color;
  box: Color;
  boxEdge: Color;
  boxOnTarget: Color;
  boxOnTargetEdge: Color;
  target: Color;
  targetPulse: Color;
  player: Color;
  playerGlow: Color;
  ambient: Color;
  background: Color;
  fog: Color;
  uiAccent: string; // hex for UI panels
  uiText: string;
  uiBorder: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
}

export const THEMES: Theme[] = [
  {
    id: 'neon_blue',
    name: 'Neon Blue',
    colors: {
      wall: new Color(0x00ccff),
      wallEdge: new Color(0x00eeff),
      floor: new Color(0x0a0a1a),
      floorLine: new Color(0x1a1a3a),
      box: new Color(0xff8800),
      boxEdge: new Color(0xffaa33),
      boxOnTarget: new Color(0x00ff66),
      boxOnTargetEdge: new Color(0x33ff88),
      target: new Color(0xff00aa),
      targetPulse: new Color(0xff44cc),
      player: new Color(0x4488ff),
      playerGlow: new Color(0x66aaff),
      ambient: new Color(0x111122),
      background: new Color(0x050510),
      fog: new Color(0x050510),
      uiAccent: '#00ccff',
      uiText: '#00eeff',
      uiBorder: '#00ccff',
    },
  },
  {
    id: 'neon_green',
    name: 'Matrix',
    colors: {
      wall: new Color(0x00ff66),
      wallEdge: new Color(0x33ff88),
      floor: new Color(0x0a1a0a),
      floorLine: new Color(0x1a3a1a),
      box: new Color(0xffcc00),
      boxEdge: new Color(0xffdd33),
      boxOnTarget: new Color(0x00ffcc),
      boxOnTargetEdge: new Color(0x33ffdd),
      target: new Color(0xff6600),
      targetPulse: new Color(0xff8833),
      player: new Color(0x44ff88),
      playerGlow: new Color(0x66ffaa),
      ambient: new Color(0x112211),
      background: new Color(0x051005),
      fog: new Color(0x051005),
      uiAccent: '#00ff66',
      uiText: '#33ff88',
      uiBorder: '#00ff66',
    },
  },
  {
    id: 'neon_pink',
    name: 'Synthwave',
    colors: {
      wall: new Color(0xff00aa),
      wallEdge: new Color(0xff44cc),
      floor: new Color(0x1a0a1a),
      floorLine: new Color(0x3a1a3a),
      box: new Color(0x00ccff),
      boxEdge: new Color(0x33ddff),
      boxOnTarget: new Color(0xffcc00),
      boxOnTargetEdge: new Color(0xffdd33),
      target: new Color(0x00ff66),
      targetPulse: new Color(0x33ff88),
      player: new Color(0xff44aa),
      playerGlow: new Color(0xff66cc),
      ambient: new Color(0x221122),
      background: new Color(0x100510),
      fog: new Color(0x100510),
      uiAccent: '#ff00aa',
      uiText: '#ff44cc',
      uiBorder: '#ff00aa',
    },
  },
  {
    id: 'neon_gold',
    name: 'Solar',
    colors: {
      wall: new Color(0xffcc00),
      wallEdge: new Color(0xffdd33),
      floor: new Color(0x1a1a0a),
      floorLine: new Color(0x3a3a1a),
      box: new Color(0xff6600),
      boxEdge: new Color(0xff8833),
      boxOnTarget: new Color(0x00ff66),
      boxOnTargetEdge: new Color(0x33ff88),
      target: new Color(0xff0044),
      targetPulse: new Color(0xff3366),
      player: new Color(0xffaa44),
      playerGlow: new Color(0xffcc66),
      ambient: new Color(0x222211),
      background: new Color(0x100f05),
      fog: new Color(0x100f05),
      uiAccent: '#ffcc00',
      uiText: '#ffdd33',
      uiBorder: '#ffcc00',
    },
  },
  {
    id: 'neon_red',
    name: 'Inferno',
    colors: {
      wall: new Color(0xff3300),
      wallEdge: new Color(0xff5533),
      floor: new Color(0x1a0a0a),
      floorLine: new Color(0x3a1a1a),
      box: new Color(0xff8800),
      boxEdge: new Color(0xffaa33),
      boxOnTarget: new Color(0x00ccff),
      boxOnTargetEdge: new Color(0x33ddff),
      target: new Color(0xffcc00),
      targetPulse: new Color(0xffdd33),
      player: new Color(0xff4444),
      playerGlow: new Color(0xff6666),
      ambient: new Color(0x221111),
      background: new Color(0x100505),
      fog: new Color(0x100505),
      uiAccent: '#ff3300',
      uiText: '#ff5533',
      uiBorder: '#ff3300',
    },
  },
  {
    id: 'monochrome',
    name: 'Ghost',
    colors: {
      wall: new Color(0xaaaaaa),
      wallEdge: new Color(0xcccccc),
      floor: new Color(0x111111),
      floorLine: new Color(0x222222),
      box: new Color(0xdddddd),
      boxEdge: new Color(0xeeeeee),
      boxOnTarget: new Color(0xffffff),
      boxOnTargetEdge: new Color(0xffffff),
      target: new Color(0x888888),
      targetPulse: new Color(0xaaaaaa),
      player: new Color(0xcccccc),
      playerGlow: new Color(0xeeeeee),
      ambient: new Color(0x1a1a1a),
      background: new Color(0x080808),
      fog: new Color(0x080808),
      uiAccent: '#aaaaaa',
      uiText: '#cccccc',
      uiBorder: '#aaaaaa',
    },
  },
];

export class ThemeManager {
  private _currentIdx = 0;

  constructor() {
    try {
      const saved = localStorage.getItem('neon-sokoban-theme');
      if (saved !== null) {
        const idx = parseInt(saved, 10);
        if (idx >= 0 && idx < THEMES.length) this._currentIdx = idx;
      }
    } catch { /* ignore */ }
  }

  get current(): Theme { return THEMES[this._currentIdx]; }
  get currentIndex(): number { return this._currentIdx; }
  get themeCount(): number { return THEMES.length; }

  setTheme(idx: number): Theme {
    if (idx >= 0 && idx < THEMES.length) {
      this._currentIdx = idx;
      try { localStorage.setItem('neon-sokoban-theme', String(idx)); } catch { /* */ }
    }
    return this.current;
  }

  nextTheme(): Theme {
    return this.setTheme((this._currentIdx + 1) % THEMES.length);
  }

  prevTheme(): Theme {
    return this.setTheme((this._currentIdx - 1 + THEMES.length) % THEMES.length);
  }
}
