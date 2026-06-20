// Neon Sokoban VR - Entry Point

import {
  World,
  PanelUI,
  Follower,
} from '@iwsdk/core';
import { GameManager } from './game-manager';
import { BoardRenderer } from './board-renderer';
import { AudioManager } from './audio-manager';
import { ThemeManager } from './themes';
import { GameSystem } from './systems/game-system';
import { UISystem } from './systems/ui-system';

async function main(): Promise<void> {
  const container = document.getElementById('app') as HTMLDivElement;

  const world = await World.create(container, {
    xr: { offer: 'once' },
    render: {
      near: 0.01,
      far: 50,
    },
    features: {
      locomotion: false,
      grabbing: false,
      physics: false,
    },
  });

  world.camera.position.set(0, 2.0, 1.0);
  world.camera.lookAt(0, 0.5, -1.0);

  // Core systems
  const game = new GameManager();
  const audio = new AudioManager();
  const themeManager = new ThemeManager();
  const boardRenderer = new BoardRenderer(world, game, themeManager);

  // Register ECS systems
  world.registerSystem(GameSystem);
  world.registerSystem(UISystem);

  const gameSystem = world.getSystem(GameSystem)!;
  gameSystem.setRefs({ game, boardRenderer, audio });

  const uiSystem = world.getSystem(UISystem)!;
  uiSystem.setRefs({
    game,
    gameSystem,
    audio,
    themeManager,
    onThemeChange: () => boardRenderer.applyTheme(),
  });

  // Create panels
  createPanels(world);

  // Init audio on first interaction
  const initAudio = () => audio.init();
  document.addEventListener('click', initAudio, { once: true });
  document.addEventListener('touchstart', initAudio, { once: true });
}

function createPanels(world: World): void {
  // Menu
  const menuEntity = world.createTransformEntity();
  menuEntity.object3D!.position.set(0, 1.1, -1.5);
  menuEntity.addComponent(PanelUI, { config: './ui/menu.json' });

  // HUD
  const hudEntity = world.createTransformEntity();
  hudEntity.object3D!.position.set(0, 1.7, -1.5);
  hudEntity.addComponent(PanelUI, { config: './ui/hud.json' });
  hudEntity.object3D!.visible = false;

  // Level select
  const levelsEntity = world.createTransformEntity();
  levelsEntity.object3D!.position.set(0, 1.0, -1.5);
  levelsEntity.addComponent(PanelUI, { config: './ui/levels.json' });
  levelsEntity.object3D!.visible = false;

  // Complete
  const completeEntity = world.createTransformEntity();
  completeEntity.object3D!.position.set(0, 1.1, -1.5);
  completeEntity.addComponent(PanelUI, { config: './ui/done.json' });
  completeEntity.object3D!.visible = false;

  // Pause
  const pauseEntity = world.createTransformEntity();
  pauseEntity.object3D!.position.set(0, 1.1, -1.5);
  pauseEntity.addComponent(PanelUI, { config: './ui/pause.json' });
  pauseEntity.object3D!.visible = false;

  // Achievements
  const achEntity = world.createTransformEntity();
  achEntity.object3D!.position.set(0, 1.0, -1.5);
  achEntity.addComponent(PanelUI, { config: './ui/achvmnts.json' });
  achEntity.object3D!.visible = false;

  // Stats
  const statsEntity = world.createTransformEntity();
  statsEntity.object3D!.position.set(0, 1.1, -1.5);
  statsEntity.addComponent(PanelUI, { config: './ui/stats.json' });
  statsEntity.object3D!.visible = false;

  // Settings
  const settingsEntity = world.createTransformEntity();
  settingsEntity.object3D!.position.set(0, 1.1, -1.5);
  settingsEntity.addComponent(PanelUI, { config: './ui/settings.json' });
  settingsEntity.object3D!.visible = false;

  // Achievement toast (above HUD area)
  const toastEntity = world.createTransformEntity();
  toastEntity.object3D!.position.set(0, 2.0, -1.5);
  toastEntity.addComponent(PanelUI, { config: './ui/toast.json' });
  toastEntity.object3D!.visible = false;

  // Help/Controls
  const helpEntity = world.createTransformEntity();
  helpEntity.object3D!.position.set(0, 1.0, -1.5);
  helpEntity.addComponent(PanelUI, { config: './ui/help.json' });
  helpEntity.object3D!.visible = false;
}

main().catch(console.error);
