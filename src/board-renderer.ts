// Board renderer - creates and updates 3D meshes for the Sokoban board

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
} from '@iwsdk/core';
import { GameManager, CellType } from './game-manager';

const CELL_SIZE = 0.15;
const WALL_HEIGHT = 0.18;
const BOX_SIZE = 0.12;
const PLAYER_RADIUS = 0.05;
const FLOOR_Y = 0;

// Neon color palette
const COLORS = {
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
};

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
  private floorMeshes: Mesh[] = [];
  private boxMeshes: BoxMesh[] = [];
  private targetMeshes: TargetMesh[] = [];
  private playerGroup: Group;
  private playerMesh: Mesh;
  private playerTargetPos = new Vector3();
  private playerCurrentPos = new Vector3();
  private world: World;
  private game: GameManager;
  private boardCenterOffset = new Vector3();
  private time = 0;

  // Materials (reusable)
  private wallMat: MeshStandardMaterial;
  private floorMat: MeshStandardMaterial;
  private boxMat: MeshStandardMaterial;
  private boxOnTargetMat: MeshStandardMaterial;
  private targetMat: MeshStandardMaterial;
  private playerMat: MeshStandardMaterial;

  constructor(world: World, game: GameManager) {
    this.world = world;
    this.game = game;

    // Create board group
    this.boardGroup = new Group();
    this.boardGroup.position.set(0, 0.7, -1.3);
    this.boardGroup.rotation.x = -Math.PI * 0.35;
    world.scene.add(this.boardGroup);

    // Materials
    this.wallMat = new MeshStandardMaterial({
      color: COLORS.wall,
      emissive: COLORS.wall,
      emissiveIntensity: 0.4,
      metalness: 0.8,
      roughness: 0.2,
    });
    this.floorMat = new MeshStandardMaterial({
      color: COLORS.floor,
      emissive: COLORS.floorLine,
      emissiveIntensity: 0.1,
      metalness: 0.5,
      roughness: 0.8,
    });
    this.boxMat = new MeshStandardMaterial({
      color: COLORS.box,
      emissive: COLORS.box,
      emissiveIntensity: 0.5,
      metalness: 0.6,
      roughness: 0.3,
    });
    this.boxOnTargetMat = new MeshStandardMaterial({
      color: COLORS.boxOnTarget,
      emissive: COLORS.boxOnTarget,
      emissiveIntensity: 0.6,
      metalness: 0.6,
      roughness: 0.3,
    });
    this.targetMat = new MeshStandardMaterial({
      color: COLORS.target,
      emissive: COLORS.target,
      emissiveIntensity: 0.7,
      side: DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    this.playerMat = new MeshStandardMaterial({
      color: COLORS.player,
      emissive: COLORS.playerGlow,
      emissiveIntensity: 0.8,
      metalness: 0.7,
      roughness: 0.2,
    });

    // Player mesh
    this.playerGroup = new Group();
    const playerGeo = new SphereGeometry(PLAYER_RADIUS, 16, 12);
    this.playerMesh = new Mesh(playerGeo, this.playerMat);
    this.playerMesh.position.y = PLAYER_RADIUS + 0.01;
    this.playerGroup.add(this.playerMesh);

    // Player glow ring
    const glowRingGeo = new RingGeometry(PLAYER_RADIUS * 0.8, PLAYER_RADIUS * 1.2, 16);
    const glowRingMat = new MeshBasicMaterial({
      color: COLORS.playerGlow,
      transparent: true,
      opacity: 0.4,
      side: DoubleSide,
    });
    const glowRing = new Mesh(glowRingGeo, glowRingMat);
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = 0.005;
    this.playerGroup.add(glowRing);

    // Setup scene lighting and environment
    this.setupEnvironment();
  }

  private setupEnvironment(): void {
    const scene = this.world.scene;

    // Dark fog
    scene.fog = new Fog(0x050510, 3, 15);
    scene.background = new Color(0x050510);

    // Ambient light
    const ambient = new AmbientLight(COLORS.ambient, 0.3);
    scene.add(ambient);

    // Main directional light
    const dirLight = new DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(2, 5, 3);
    scene.add(dirLight);

    // Board spotlight
    const boardLight = new PointLight(0x4488ff, 1.5, 5);
    boardLight.position.set(0, 2, 0);
    this.boardGroup.add(boardLight);

    // Ground plane (dark grid floor)
    const groundGeo = new PlaneGeometry(20, 20);
    const groundMat = new MeshStandardMaterial({
      color: 0x050510,
      metalness: 0.9,
      roughness: 0.5,
    });
    const ground = new Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    scene.add(ground);
  }

  buildBoard(): void {
    const state = this.game.state;
    if (!state) return;

    // Clear previous
    this.clearBoard();

    const { width, height, grid } = state;
    const offsetX = -(width * CELL_SIZE) / 2 + CELL_SIZE / 2;
    const offsetZ = -(height * CELL_SIZE) / 2 + CELL_SIZE / 2;
    this.boardCenterOffset.set(offsetX, 0, offsetZ);

    // Build static grid
    const wallGeo = new BoxGeometry(CELL_SIZE * 0.95, WALL_HEIGHT, CELL_SIZE * 0.95);
    const floorGeo = new BoxGeometry(CELL_SIZE * 0.98, 0.01, CELL_SIZE * 0.98);
    const boxGeo = new BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE);
    const targetGeo = new RingGeometry(CELL_SIZE * 0.15, CELL_SIZE * 0.3, 6);

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const cell = grid[r][c];
        const x = offsetX + c * CELL_SIZE;
        const z = offsetZ + r * CELL_SIZE;

        if (cell === CellType.Wall) {
          const wall = new Mesh(wallGeo, this.wallMat);
          wall.position.set(x, WALL_HEIGHT / 2, z);
          this.boardGroup.add(wall);
          this.wallMeshes.push(wall);

          // Wall edges
          const edgesGeo = new EdgesGeometry(wallGeo);
          const edgeMat = new LineBasicMaterial({
            color: COLORS.wallEdge,
            transparent: true,
            opacity: 0.6,
          });
          const edges = new LineSegments(edgesGeo, edgeMat);
          edges.position.copy(wall.position);
          this.boardGroup.add(edges);
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
            this.targetMeshes.push({ ring: target, row: r, col: c });
          }
        }
      }
    }

    // Build boxes
    for (const [r, c] of this.game.getBoxPositions()) {
      const x = offsetX + c * CELL_SIZE;
      const z = offsetZ + r * CELL_SIZE;
      const group = new Group();
      group.position.set(x, BOX_SIZE / 2 + 0.01, z);

      const onTarget = this.game.isBoxOnTarget(r, c);
      const mat = onTarget ? this.boxOnTargetMat : this.boxMat;
      const mesh = new Mesh(boxGeo, mat);
      group.add(mesh);

      const edgesGeo = new EdgesGeometry(boxGeo);
      const edgeColor = onTarget ? COLORS.boxOnTargetEdge : COLORS.boxEdge;
      const edgeMat = new LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.8 });
      const edges = new LineSegments(edgesGeo, edgeMat);
      group.add(edges);

      this.boardGroup.add(group);
      this.boxMeshes.push({
        group, mesh, edges,
        row: r, col: c,
        targetRow: r, targetCol: c,
        animProgress: 1,
      });
    }

    // Place player
    const px = offsetX + state.playerCol * CELL_SIZE;
    const pz = offsetZ + state.playerRow * CELL_SIZE;
    this.playerGroup.position.set(px, 0, pz);
    this.playerTargetPos.set(px, 0, pz);
    this.playerCurrentPos.set(px, 0, pz);
    this.boardGroup.add(this.playerGroup);
  }

  updatePositions(): void {
    const state = this.game.state;
    if (!state) return;

    const { playerRow, playerCol } = state;
    const offsetX = this.boardCenterOffset.x;
    const offsetZ = this.boardCenterOffset.z;

    // Update player target
    this.playerTargetPos.set(
      offsetX + playerCol * CELL_SIZE,
      0,
      offsetZ + playerRow * CELL_SIZE,
    );

    // Update box positions and materials
    const boxPositions = this.game.getBoxPositions();
    for (let i = 0; i < this.boxMeshes.length; i++) {
      const bm = this.boxMeshes[i];
      if (i < boxPositions.length) {
        const [r, c] = boxPositions[i];
        bm.targetRow = r;
        bm.targetCol = c;
        bm.animProgress = 0;

        // Update material based on target status
        const onTarget = this.game.isBoxOnTarget(r, c);
        bm.mesh.material = onTarget ? this.boxOnTargetMat : this.boxMat;
        const edgeColor = onTarget ? COLORS.boxOnTargetEdge : COLORS.boxEdge;
        (bm.edges.material as LineBasicMaterial).color.copy(edgeColor);
      }
    }
  }

  update(delta: number): void {
    this.time += delta;
    const offsetX = this.boardCenterOffset.x;
    const offsetZ = this.boardCenterOffset.z;

    // Animate player
    this.playerCurrentPos.lerp(this.playerTargetPos, Math.min(1, delta * 15));
    this.playerGroup.position.copy(this.playerCurrentPos);

    // Animate player bob
    this.playerMesh.position.y = PLAYER_RADIUS + 0.01 + Math.sin(this.time * 3) * 0.005;

    // Animate boxes
    for (const bm of this.boxMeshes) {
      if (bm.animProgress < 1) {
        bm.animProgress = Math.min(1, bm.animProgress + delta * 12);
        const t = bm.animProgress;
        const smooth = t * t * (3 - 2 * t); // smoothstep
        const tx = offsetX + bm.targetCol * CELL_SIZE;
        const tz = offsetZ + bm.targetRow * CELL_SIZE;
        bm.group.position.x += (tx - bm.group.position.x) * smooth;
        bm.group.position.z += (tz - bm.group.position.z) * smooth;
        // Slight hop
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

    // Pulse player glow
    this.playerMat.emissiveIntensity = 0.6 + 0.3 * Math.sin(this.time * 2.5);
  }

  private clearBoard(): void {
    // Remove all children from board group except lights
    const toRemove: Object3D[] = [];
    this.boardGroup.traverse((child) => {
      if (child !== this.boardGroup && !(child instanceof PointLight) && !(child instanceof AmbientLight)) {
        toRemove.push(child);
      }
    });
    // Just clear and re-add light
    const lights: Object3D[] = [];
    this.boardGroup.children.forEach(c => {
      if (c instanceof PointLight) lights.push(c);
    });
    while (this.boardGroup.children.length > 0) {
      this.boardGroup.remove(this.boardGroup.children[0]);
    }
    lights.forEach(l => this.boardGroup.add(l));

    this.wallMeshes = [];
    this.floorMeshes = [];
    this.boxMeshes = [];
    this.targetMeshes = [];
  }

  // Celebration effect when level is complete
  playCelebration(): void {
    // Flash all boxes green
    for (const bm of this.boxMeshes) {
      bm.mesh.material = this.boxOnTargetMat;
      (bm.edges.material as LineBasicMaterial).color.copy(COLORS.boxOnTargetEdge);
    }
    // Flash player
    this.playerMat.emissiveIntensity = 2.0;
  }

  getBoardGroup(): Group {
    return this.boardGroup;
  }
}
