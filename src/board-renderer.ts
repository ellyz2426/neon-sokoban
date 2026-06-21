// Board renderer with theme support and particle effects

import {
  Group,
  Mesh,
  BoxGeometry,
  SphereGeometry,
  PlaneGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Color,
  Vector3,
  AmbientLight,
  PointLight,
  DirectionalLight,
  Fog,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
  AdditiveBlending,
  World,
  DoubleSide,
  RingGeometry,
  Object3D,
  BufferGeometry,
  Float32BufferAttribute,
} from '@iwsdk/core';
import { GameManager, CellType } from './game-manager';
import { ThemeManager, ThemeColors } from './themes';
import { ParticleSystem } from './particles';

const CELL_SIZE = 0.15;
const WALL_HEIGHT = 0.18;
const BOX_SIZE = 0.12;
const PLAYER_RADIUS = 0.05;
const FLOOR_Y = 0;

interface BoxMesh {
  group: Group;
  mesh: Mesh;
  edges: LineSegments;
  row: number;
  col: number;
  targetRow: number;
  targetCol: number;
  animProgress: number;
}

interface TargetMesh {
  ring: Mesh;
  row: number;
  col: number;
}

export class BoardRenderer {
  private boardGroup: Group;
  private wallMeshes: Mesh[] = [];
  private wallEdges: LineSegments[] = [];
  private floorMeshes: Mesh[] = [];
  private boxMeshes: BoxMesh[] = [];
  private targetMeshes: TargetMesh[] = [];
  private playerGroup: Group;
  private playerMesh: Mesh;
  private playerGlowRing: Mesh;
  private playerTargetPos = new Vector3();
  private playerCurrentPos = new Vector3();
  private world: World;
  private game: GameManager;
  private boardCenterOffset = new Vector3();
  private time = 0;
  private themeManager: ThemeManager;
  particles: ParticleSystem;

  // Materials
  private wallMat!: MeshStandardMaterial;
  private floorMat!: MeshStandardMaterial;
  private boxMat!: MeshStandardMaterial;
  private boxOnTargetMat!: MeshStandardMaterial;
  private boxDeadlockMat!: MeshStandardMaterial;
  private targetMat!: MeshStandardMaterial;
  private playerMat!: MeshStandardMaterial;
  private glowRingMat!: MeshBasicMaterial;
  private groundMesh!: Mesh;
  private boardLight!: PointLight;
  private ambientLight!: AmbientLight;

  // Grid lines
  private gridLines: LineSegments | null = null;

  // Deadlock state
  private deadlockedBoxes = new Set<string>();
  private deadlockFlashTime = 0;

  // Hint state
  private hintedBox: string | null = null;
  private hintTimer = 0;
  private hintArrow: Mesh | null = null;

  // Level entrance animation
  private entranceProgress = 0;
  private isEntering = false;

  // Trail
  private trailTimer = 0;
  private lastPlayerPos = new Vector3();

  constructor(world: World, game: GameManager, themeManager: ThemeManager) {
    this.world = world;
    this.game = game;
    this.themeManager = themeManager;

    this.boardGroup = new Group();
    this.boardGroup.position.set(0, 0.7, -1.3);
    this.boardGroup.rotation.x = -Math.PI * 0.35;
    world.scene.add(this.boardGroup);

    this.particles = new ParticleSystem(this.boardGroup);

    // Create materials
    this.createMaterials();

    // Player
    this.playerGroup = new Group();
    const playerGeo = new SphereGeometry(PLAYER_RADIUS, 16, 12);
    this.playerMesh = new Mesh(playerGeo, this.playerMat);
    this.playerMesh.position.y = PLAYER_RADIUS + 0.01;
    this.playerGroup.add(this.playerMesh);

    const glowRingGeo = new RingGeometry(PLAYER_RADIUS * 0.8, PLAYER_RADIUS * 1.2, 16);
    this.glowRingMat = new MeshBasicMaterial({
      color: this.getColors().playerGlow,
      transparent: true,
      opacity: 0.4,
      side: DoubleSide,
    });
    this.playerGlowRing = new Mesh(glowRingGeo, this.glowRingMat);
    this.playerGlowRing.rotation.x = -Math.PI / 2;
    this.playerGlowRing.position.y = 0.005;
    this.playerGroup.add(this.playerGlowRing);

    this.setupEnvironment();
  }

  private getColors(): ThemeColors {
    return this.themeManager.current.colors;
  }

  private createMaterials(): void {
    const c = this.getColors();
    this.wallMat = new MeshStandardMaterial({
      color: c.wall,
      emissive: c.wall,
      emissiveIntensity: 0.4,
      metalness: 0.8,
      roughness: 0.2,
    });
    this.floorMat = new MeshStandardMaterial({
      color: c.floor,
      emissive: c.floorLine,
      emissiveIntensity: 0.1,
      metalness: 0.5,
      roughness: 0.8,
    });
    this.boxMat = new MeshStandardMaterial({
      color: c.box,
      emissive: c.box,
      emissiveIntensity: 0.5,
      metalness: 0.6,
      roughness: 0.3,
    });
    this.boxOnTargetMat = new MeshStandardMaterial({
      color: c.boxOnTarget,
      emissive: c.boxOnTarget,
      emissiveIntensity: 0.6,
      metalness: 0.6,
      roughness: 0.3,
    });
    this.boxDeadlockMat = new MeshStandardMaterial({
      color: new Color(0xff2200),
      emissive: new Color(0xff0000),
      emissiveIntensity: 0.8,
      metalness: 0.6,
      roughness: 0.3,
    });
    this.targetMat = new MeshStandardMaterial({
      color: c.target,
      emissive: c.target,
      emissiveIntensity: 0.7,
      side: DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    this.playerMat = new MeshStandardMaterial({
      color: c.player,
      emissive: c.playerGlow,
      emissiveIntensity: 0.8,
      metalness: 0.7,
      roughness: 0.2,
    });
  }

  applyTheme(): void {
    const c = this.getColors();

    // Update materials
    this.wallMat.color.copy(c.wall);
    this.wallMat.emissive.copy(c.wall);
    this.floorMat.color.copy(c.floor);
    this.floorMat.emissive.copy(c.floorLine);
    this.boxMat.color.copy(c.box);
    this.boxMat.emissive.copy(c.box);
    this.boxOnTargetMat.color.copy(c.boxOnTarget);
    this.boxOnTargetMat.emissive.copy(c.boxOnTarget);
    this.targetMat.color.copy(c.target);
    this.targetMat.emissive.copy(c.target);
    this.playerMat.color.copy(c.player);
    this.playerMat.emissive.copy(c.playerGlow);
    this.glowRingMat.color.copy(c.playerGlow);

    // Update wall edges
    for (const edge of this.wallEdges) {
      (edge.material as LineBasicMaterial).color.copy(c.wallEdge);
    }

    // Update box edges
    for (const bm of this.boxMeshes) {
      const onTarget = this.game.isBoxOnTarget(bm.targetRow, bm.targetCol);
      bm.mesh.material = onTarget ? this.boxOnTargetMat : this.boxMat;
      const edgeColor = onTarget ? c.boxOnTargetEdge : c.boxEdge;
      (bm.edges.material as LineBasicMaterial).color.copy(edgeColor);
    }

    // Update environment
    const scene = this.world.scene;
    scene.background = c.background;
    scene.fog = new Fog(c.fog.getHex(), 3, 15);
    this.ambientLight.color.copy(c.ambient);
    this.boardLight.color.copy(c.player);
    if (this.groundMesh) {
      (this.groundMesh.material as MeshStandardMaterial).color.copy(c.background);
    }
  }

  private setupEnvironment(): void {
    const scene = this.world.scene;
    const c = this.getColors();

    scene.fog = new Fog(c.fog.getHex(), 3, 15);
    scene.background = c.background;

    this.ambientLight = new AmbientLight(c.ambient, 0.3);
    scene.add(this.ambientLight);

    const dirLight = new DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(2, 5, 3);
    scene.add(dirLight);

    this.boardLight = new PointLight(c.player.getHex(), 1.5, 5);
    this.boardLight.position.set(0, 2, 0);
    this.boardGroup.add(this.boardLight);

    const groundGeo = new PlaneGeometry(20, 20);
    const groundMat = new MeshStandardMaterial({
      color: c.background,
      metalness: 0.9,
      roughness: 0.5,
    });
    this.groundMesh = new Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = -0.5;
    scene.add(this.groundMesh);
  }

  buildBoard(): void {
    const state = this.game.state;
    if (!state) return;

    this.clearBoard();
    this.particles.clear();

    const { width, height, grid } = state;
    const offsetX = -(width * CELL_SIZE) / 2 + CELL_SIZE / 2;
    const offsetZ = -(height * CELL_SIZE) / 2 + CELL_SIZE / 2;
    this.boardCenterOffset.set(offsetX, 0, offsetZ);

    const c = this.getColors();
    const wallGeo = new BoxGeometry(CELL_SIZE * 0.95, WALL_HEIGHT, CELL_SIZE * 0.95);
    const floorGeo = new BoxGeometry(CELL_SIZE * 0.98, 0.01, CELL_SIZE * 0.98);
    const boxGeo = new BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
    const targetGeo = new RingGeometry(CELL_SIZE * 0.15, CELL_SIZE * 0.3, 6);

    for (let r = 0; r < height; r++) {
      for (let c2 = 0; c2 < width; c2++) {
        const cell = grid[r][c2];
        const x = offsetX + c2 * CELL_SIZE;
        const z = offsetZ + r * CELL_SIZE;

        if (cell === CellType.Wall) {
          const wall = new Mesh(wallGeo, this.wallMat);
          wall.position.set(x, WALL_HEIGHT / 2, z);
          this.boardGroup.add(wall);
          this.wallMeshes.push(wall);

          const edgesGeo = new EdgesGeometry(wallGeo);
          const edgeMat = new LineBasicMaterial({
            color: c.wallEdge,
            transparent: true,
            opacity: 0.6,
          });
          const edges = new LineSegments(edgesGeo, edgeMat);
          edges.position.copy(wall.position);
          this.boardGroup.add(edges);
          this.wallEdges.push(edges);
        } else if (cell === CellType.Floor || cell === CellType.Target) {
          const floor = new Mesh(floorGeo, this.floorMat);
          floor.position.set(x, FLOOR_Y, z);
          this.boardGroup.add(floor);
          this.floorMeshes.push(floor);

          if (cell === CellType.Target) {
            const target = new Mesh(targetGeo, this.targetMat.clone());
            target.rotation.x = -Math.PI / 2;
            target.position.set(x, FLOOR_Y + 0.006, z);
            this.boardGroup.add(target);
            this.targetMeshes.push({ ring: target, row: r, col: c2 });
          }
        }
      }
    }

    // Build boxes
    for (const [r, col] of this.game.getBoxPositions()) {
      const x = offsetX + col * CELL_SIZE;
      const z = offsetZ + r * CELL_SIZE;
      const group = new Group();
      group.position.set(x, BOX_SIZE / 2 + 0.01, z);

      const onTarget = this.game.isBoxOnTarget(r, col);
      const mat = onTarget ? this.boxOnTargetMat : this.boxMat;
      const mesh = new Mesh(boxGeo, mat);
      group.add(mesh);

      const edgesGeo = new EdgesGeometry(boxGeo);
      const edgeColor = onTarget ? c.boxOnTargetEdge : c.boxEdge;
      const edgeMat = new LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.8 });
      const edges = new LineSegments(edgesGeo, edgeMat);
      group.add(edges);

      this.boardGroup.add(group);
      this.boxMeshes.push({
        group, mesh, edges,
        row: r, col,
        targetRow: r, targetCol: col,
        animProgress: 1,
      });
    }

    // Place player
    const px = offsetX + state.playerCol * CELL_SIZE;
    const pz = offsetZ + state.playerRow * CELL_SIZE;
    this.playerGroup.position.set(px, 0, pz);
    this.playerTargetPos.set(px, 0, pz);
    this.playerCurrentPos.set(px, 0, pz);
    this.lastPlayerPos.set(px, 0, pz);
    this.boardGroup.add(this.playerGroup);

    // Build grid lines
    this.buildGridLines(width, height, offsetX, offsetZ);

    // Reset deadlock state
    this.deadlockedBoxes.clear();
    this.deadlockFlashTime = 0;

    // Clear hint
    this.hintedBox = null;
    this.hintTimer = 0;

    // Auto-frame camera based on board dimensions
    this.autoFrameBoard(width, height);

    // Start entrance animation
    this.entranceProgress = 0;
    this.isEntering = true;
    this.boardGroup.scale.setScalar(0.01);
  }

  /** Adjust board scale and position to fit the level nicely in view */
  private autoFrameBoard(boardWidth: number, boardHeight: number): void {
    const maxDim = Math.max(boardWidth, boardHeight);
    // Reference: a 7x7 board looks good at default scale
    const refDim = 7;
    if (maxDim > refDim) {
      const scaleFactor = refDim / maxDim;
      // We don't directly scale here since entrance animation handles it,
      // but we adjust the board Y position to keep it centered
      this.boardGroup.position.y = 0.7 - (maxDim - refDim) * 0.02;
      this.boardGroup.position.z = -1.3 - (maxDim - refDim) * 0.05;
      // Adjust CELL_SIZE-equivalent via board group scale target
      this._targetScale = scaleFactor;
    } else {
      this.boardGroup.position.y = 0.7;
      this.boardGroup.position.z = -1.3;
      this._targetScale = 1.0;
    }
  }

  private _targetScale = 1.0;

  private buildGridLines(boardWidth: number, boardHeight: number, offsetX: number, offsetZ: number): void {
    if (this.gridLines) {
      this.boardGroup.remove(this.gridLines);
    }

    const positions: number[] = [];
    const c = this.getColors();
    const halfCell = CELL_SIZE / 2;
    const startX = offsetX - halfCell;
    const startZ = offsetZ - halfCell;
    const endX = offsetX + (boardWidth - 1) * CELL_SIZE + halfCell;
    const endZ = offsetZ + (boardHeight - 1) * CELL_SIZE + halfCell;

    // Horizontal lines
    for (let r = 0; r <= boardHeight; r++) {
      const z = startZ + r * CELL_SIZE;
      positions.push(startX, FLOOR_Y + 0.003, z, endX, FLOOR_Y + 0.003, z);
    }

    // Vertical lines
    for (let col = 0; col <= boardWidth; col++) {
      const x = startX + col * CELL_SIZE;
      positions.push(x, FLOOR_Y + 0.003, startZ, x, FLOOR_Y + 0.003, endZ);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

    const lineMat = new LineBasicMaterial({
      color: c.floorLine,
      transparent: true,
      opacity: 0.25,
    });

    this.gridLines = new LineSegments(geometry, lineMat);
    this.boardGroup.add(this.gridLines);
  }

  /** Mark boxes as deadlocked (flash red) */
  setDeadlockedBoxes(keys: Set<string>): void {
    this.deadlockedBoxes = keys;
    if (keys.size > 0) {
      this.deadlockFlashTime = 1.5; // Flash for 1.5 seconds
    }
  }

  /** Highlight a hinted box with golden glow */
  setHintBox(boxKey: string | null): void {
    this.hintedBox = boxKey;
    if (boxKey) {
      this.hintTimer = 3.0; // Show hint for 3 seconds
    }
  }

  /** Clear hint highlight */
  clearHint(): void {
    this.hintedBox = null;
    this.hintTimer = 0;
    // Restore box materials
    const c = this.getColors();
    for (const bm of this.boxMeshes) {
      const onTarget = this.game.isBoxOnTarget(bm.targetRow, bm.targetCol);
      bm.mesh.material = onTarget ? this.boxOnTargetMat : this.boxMat;
      const edgeColor = onTarget ? c.boxOnTargetEdge : c.boxEdge;
      (bm.edges.material as LineBasicMaterial).color.copy(edgeColor);
    }
  }

  updatePositions(): void {
    const state = this.game.state;
    if (!state) return;

    const { playerRow, playerCol } = state;
    const offsetX = this.boardCenterOffset.x;
    const offsetZ = this.boardCenterOffset.z;

    this.playerTargetPos.set(
      offsetX + playerCol * CELL_SIZE,
      0,
      offsetZ + playerRow * CELL_SIZE,
    );

    const c = this.getColors();
    const boxPositions = this.game.getBoxPositions();
    for (let i = 0; i < this.boxMeshes.length; i++) {
      const bm = this.boxMeshes[i];
      if (i < boxPositions.length) {
        const [r, col] = boxPositions[i];
        const prevOnTarget = this.game.isBoxOnTarget(bm.targetRow, bm.targetCol);
        bm.targetRow = r;
        bm.targetCol = col;
        bm.animProgress = 0;

        const onTarget = this.game.isBoxOnTarget(r, col);
        bm.mesh.material = onTarget ? this.boxOnTargetMat : this.boxMat;
        const edgeColor = onTarget ? c.boxOnTargetEdge : c.boxEdge;
        (bm.edges.material as LineBasicMaterial).color.copy(edgeColor);

        // Particle burst on target
        if (onTarget && !prevOnTarget) {
          const bx = offsetX + col * CELL_SIZE;
          const bz = offsetZ + r * CELL_SIZE;
          this.particles.emitBoxOnTarget(bx, BOX_SIZE / 2 + 0.01, bz, c.boxOnTarget);
        }
      }
    }
  }

  update(delta: number): void {
    this.time += delta;
    const offsetX = this.boardCenterOffset.x;
    const offsetZ = this.boardCenterOffset.z;
    const c = this.getColors();

    // Entrance animation
    if (this.isEntering) {
      this.entranceProgress = Math.min(1, this.entranceProgress + delta * 3);
      // Elastic ease-out
      const t = this.entranceProgress;
      const p = 0.4;
      const s = t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
      this.boardGroup.scale.setScalar(s * this._targetScale);
      if (this.entranceProgress >= 1) {
        this.isEntering = false;
        this.boardGroup.scale.setScalar(this._targetScale);
      }
    }

    // Animate player
    this.playerCurrentPos.lerp(this.playerTargetPos, Math.min(1, delta * 15));
    this.playerGroup.position.copy(this.playerCurrentPos);

    // Player bob
    this.playerMesh.position.y = PLAYER_RADIUS + 0.01 + Math.sin(this.time * 3) * 0.005;

    // Player trail
    this.trailTimer += delta;
    if (this.trailTimer > 0.05) {
      const dist = this.playerCurrentPos.distanceTo(this.lastPlayerPos);
      if (dist > 0.002) {
        this.particles.emitTrail(
          this.playerCurrentPos.x,
          this.playerCurrentPos.y,
          this.playerCurrentPos.z,
          c.playerGlow,
        );
        this.lastPlayerPos.copy(this.playerCurrentPos);
      }
      this.trailTimer = 0;
    }

    // Animate boxes
    for (const bm of this.boxMeshes) {
      if (bm.animProgress < 1) {
        bm.animProgress = Math.min(1, bm.animProgress + delta * 12);
        const t = bm.animProgress;
        const smooth = t * t * (3 - 2 * t);
        const tx = offsetX + bm.targetCol * CELL_SIZE;
        const tz = offsetZ + bm.targetRow * CELL_SIZE;
        bm.group.position.x += (tx - bm.group.position.x) * smooth;
        bm.group.position.z += (tz - bm.group.position.z) * smooth;
        bm.group.position.y = BOX_SIZE / 2 + 0.01 + Math.sin(smooth * Math.PI) * 0.02;
      }
    }

    // Pulse targets
    for (const tm of this.targetMeshes) {
      const mat = tm.ring.material as MeshStandardMaterial;
      const pulse = 0.5 + 0.3 * Math.sin(this.time * 4 + tm.row * 0.7 + tm.col * 1.1);
      mat.emissiveIntensity = pulse;
      mat.opacity = 0.5 + pulse * 0.4;
      const scale = 0.9 + 0.1 * Math.sin(this.time * 3 + tm.row + tm.col);
      tm.ring.scale.setScalar(scale);
    }

    // Pulse player
    this.playerMat.emissiveIntensity = 0.6 + 0.3 * Math.sin(this.time * 2.5);

    // Hint highlight on boxes
    if (this.hintTimer > 0 && this.hintedBox) {
      this.hintTimer -= delta;
      const pulse = 0.6 + 0.4 * Math.sin(this.time * 6);

      for (const bm of this.boxMeshes) {
        const key = `${bm.targetRow},${bm.targetCol}`;
        if (key === this.hintedBox) {
          // Golden glow for hinted box
          const hintMat = bm.mesh.material as MeshStandardMaterial;
          if (hintMat !== this.boxOnTargetMat && hintMat !== this.boxDeadlockMat) {
            hintMat.emissive.setHex(0xffcc00);
            hintMat.emissiveIntensity = pulse;
            hintMat.color.setHex(0xffaa00);
          }
          (bm.edges.material as LineBasicMaterial).color.setHex(0xffdd33);
          // Scale pulse
          const scalePulse = 1.0 + 0.08 * Math.sin(this.time * 4);
          bm.group.scale.setScalar(scalePulse);
        } else {
          bm.group.scale.setScalar(1.0);
        }
      }

      if (this.hintTimer <= 0) {
        this.clearHint();
      }
    }

    // Deadlock flash on boxes
    if (this.deadlockFlashTime > 0) {
      this.deadlockFlashTime -= delta;
      const flashIntensity = Math.sin(this.time * 12) * 0.5 + 0.5;
      this.boxDeadlockMat.emissiveIntensity = 0.5 + flashIntensity * 0.8;

      for (const bm of this.boxMeshes) {
        const key = `${bm.targetRow},${bm.targetCol}`;
        if (this.deadlockedBoxes.has(key)) {
          bm.mesh.material = this.boxDeadlockMat;
          (bm.edges.material as LineBasicMaterial).color.set(0xff4444);
        }
      }

      if (this.deadlockFlashTime <= 0) {
        // Restore original materials
        for (const bm of this.boxMeshes) {
          const onTarget = this.game.isBoxOnTarget(bm.targetRow, bm.targetCol);
          bm.mesh.material = onTarget ? this.boxOnTargetMat : this.boxMat;
          const edgeColor = onTarget ? c.boxOnTargetEdge : c.boxEdge;
          (bm.edges.material as LineBasicMaterial).color.copy(edgeColor);
        }
        this.deadlockedBoxes.clear();
      }
    }

    // Update particles
    this.particles.update(delta);
  }

  private clearBoard(): void {
    const lights: Object3D[] = [];
    this.boardGroup.children.forEach(c => {
      if (c instanceof PointLight) lights.push(c);
    });
    while (this.boardGroup.children.length > 0) {
      this.boardGroup.remove(this.boardGroup.children[0]);
    }
    lights.forEach(l => this.boardGroup.add(l));

    this.wallMeshes = [];
    this.wallEdges = [];
    this.floorMeshes = [];
    this.boxMeshes = [];
    this.targetMeshes = [];
  }

  playCelebration(): void {
    const c = this.getColors();
    for (const bm of this.boxMeshes) {
      bm.mesh.material = this.boxOnTargetMat;
      (bm.edges.material as LineBasicMaterial).color.copy(c.boxOnTargetEdge);
    }
    this.playerMat.emissiveIntensity = 2.0;

    // Emit celebration particles
    const cx = 0;
    const cy = 0.15;
    const cz = 0;
    this.particles.emitCelebration(cx, cy, cz, [
      c.boxOnTarget, c.player, c.target, c.wall,
    ]);
  }

  getBoardGroup(): Group {
    return this.boardGroup;
  }
}
