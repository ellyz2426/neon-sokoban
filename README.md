# Neon Sokoban VR

A classic Sokoban puzzle game reimagined with neon aesthetics for VR and browser. Push boxes onto target positions across 30 handcrafted levels of increasing difficulty.

Built with [IWSDK](https://iwsdk.dev) (Immersive Web SDK).

## Play

**[Play Neon Sokoban VR](https://ellyz2426.github.io/neon-sokoban/)**

## Features

- **30 Levels** across 5 difficulty tiers (Tutorial, Easy, Medium, Hard, Expert)
- **Dual Runtime** - play in VR headset or browser
- **Neon Aesthetic** - glowing walls, pulsing targets, animated pieces
- **Full Controls**:
  - **Keyboard**: Arrow keys/WASD to move, Z to undo, R to restart, Esc for menu
  - **VR Controllers**: Thumbstick to move, A to undo, B for menu, X to restart
- **Undo System** - unlimited undo per level
- **Star Rating** - earn 1-3 stars based on move efficiency vs par
- **Progress Tracking** - completion and best moves saved locally
- **Spatial UI** - PanelUI menus and HUD in 3D space
- **Procedural Audio** - synthesized sound effects for moves, pushes, completion

## Controls

| Action | Keyboard | VR Controller |
|--------|----------|---------------|
| Move | Arrow keys / WASD | Thumbstick (either hand) |
| Undo | Z | A button (right) |
| Restart | R | X button (left) |
| Pause/Menu | Escape | B button (right) |

## Development

```bash
npm install
npm run dev
```

## Tech

- IWSDK 0.4.x (Three.js + ECS)
- PanelUI with uikitml templates
- Procedural audio (Web Audio API)
- No physics engine (grid-based movement)
