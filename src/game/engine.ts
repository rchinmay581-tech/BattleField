import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from './audio';
import { buildArenaMap, type BuiltMap, type MapCollider } from './maps';
import { createViewModel, createVoxelCharacter, type BotRig, type ViewModelRig } from './models';
import { createProceduralTextures, type ProceduralTextureSet } from './textures';
import {
  MAP_METAS,
  WEAPON_SPECS,
  type DamagePopup,
  type GamePhase,
  type GameSettings,
  type HudSnapshot,
  type KillFeedItem,
  type MapId,
  type ScoreboardEntry,
  type WeaponId,
} from './types';

// Reusable pre-allocated math helpers (zero GC in render loop)
const _raycaster = new THREE.Raycaster();
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _proj = new THREE.Vector3();

const BOT_ROSTER: Array<{ name: string; color: number; weapon: WeaponId }> = [
  { name: 'Koda', color: 0xe11d48, weapon: 'triggerman' },
  { name: 'Vex', color: 0x2563eb, weapon: 'runngun' },
  { name: 'Raze', color: 0xd97706, weapon: 'hunter' },
  { name: 'Nyx', color: 0x7c3aed, weapon: 'vince' },
  { name: 'Talon', color: 0x059669, weapon: 'triggerman' },
  { name: 'Cipher', color: 0xdb2777, weapon: 'runngun' },
  { name: 'Blaze', color: 0x0284c7, weapon: 'vince' },
  { name: 'Jett', color: 0x65a30d, weapon: 'hunter' },
];

interface BotEntity {
  id: string;
  name: string;
  weaponId: WeaponId;
  rig: BotRig;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnTimer: number;
  fireCooldown: number;
  waypoint: THREE.Vector3;
  waypointTimer: number;
  strafeDir: number;
  strafeTimer: number;
  walkPhase: number;
  onGround: boolean;
  kills: number;
  deaths: number;
  score: number;
}

interface TracerFX {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

interface SparkFX {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

function getRampSurfaceY(c: MapCollider, x: number, z: number): number {
  if (!c.isRamp || !c.rampDir) return c.maxY;
  let t = 0;
  if (c.rampDir === '+x') {
    t = (x - c.minX) / (c.maxX - c.minX);
  } else if (c.rampDir === '-x') {
    t = (c.maxX - x) / (c.maxX - c.minX);
  } else if (c.rampDir === '+z') {
    t = (z - c.minZ) / (c.maxZ - c.minZ);
  } else {
    t = (c.maxZ - z) / (c.maxZ - c.minZ);
  }
  t = THREE.MathUtils.clamp(t, 0, 1);
  return c.minY + t * (c.maxY - c.minY);
}

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onDamagePopup: (popup: DamagePopup) => void;
  onPhaseChange: (phase: GamePhase) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: ProceduralTextureSet;
  private isSoftwareGl: boolean;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;

  private map: BuiltMap | null = null;
  private currentMapId: MapId;
  private settings: GameSettings;
  private phase: GamePhase = 'menu';

  // Player state
  private playerPos = new THREE.Vector3(0, 0.1, 20);
  private playerVel = new THREE.Vector3(0, 0, 0);
  private yaw = 0;
  private pitch = 0;
  private onGround = false;
  private isSliding = false;
  private slideCooldown = 0;
  private coyoteTimer = 0;
  private eyeHeight = 1.62;
  private playerHp = 100;
  private playerMaxHp = 100;
  private playerAlive = true;
  private respawnTimer = 0;
  private playerKills = 0;
  private playerDeaths = 0;
  private playerScore = 0;
  private playerStreak = 0;

  // Weapon & ViewModel state
  private viewModel: ViewModelRig;
  private currentWeaponId: WeaponId;
  private ammo = 30;
  private isReloading = false;
  private reloadElapsed = 0;
  private fireCooldown = 0;
  private recoilPitch = 0;
  private viewModelKick = 0;
  private adsLerp = 0;
  private muzzleFlashTimer = 0;
  private mouseDownLeft = false;
  private mouseDownRight = false;
  private swayX = 0;
  private swayY = 0;
  private bobPhase = 0;

  // Match & HUD state
  private timeRemaining = 150;
  private killFeed: KillFeedItem[] = [];
  private nextId = 1;
  private hitMarkerType: 'none' | 'body' | 'head' = 'none';
  private hitMarkerSeq = 0;
  private hitMarkerTimer = 0;
  private damageFlash = 0;
  private lastKillBanner: HudSnapshot['lastKillBanner'] = null;
  private killBannerSeq = 0;

  // Bots & FX
  private bots: BotEntity[] = [];
  private tracers: TracerFX[] = [];
  private sparks: SparkFX[] = [];
  private fxGeoTracer = new THREE.CylinderGeometry(0.018, 0.018, 1, 6);
  private fxGeoSpark = new THREE.BoxGeometry(0.11, 0.11, 0.11);

  // Input state
  private keys: Record<string, boolean> = {};
  private pointerLocked = false;
  private isDraggingLook = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Loop state
  private frameId = 0;
  private lastTime = performance.now();
  private hudEmitAccum = 0;
  private menuOrbitAngle = 0;
  private disposed = false;

  constructor(container: HTMLElement, initialSettings: GameSettings, callbacks: EngineCallbacks) {
    this.container = container;
    this.settings = { ...initialSettings };
    this.currentMapId = initialSettings.mapId;
    this.currentWeaponId = initialSettings.weaponId;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = this.renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    this.scene = new THREE.Scene();

    // Studio PMREM reflection environment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(this.settings.fov, w / h, 0.08, 280);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    // 3-Point outdoor lighting rig
    this.hemiLight = new THREE.HemisphereLight(0x9ec8ff, 0x9b7953, 0.78);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff0d4, 2.1);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 160;
    const d = 46;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0xb7d8ff, 0.55);
    this.rimLight.position.set(-30, 22, -35);
    this.scene.add(this.rimLight);

    this.textures = createProceduralTextures(this.renderer);

    // ViewModel attached to camera
    this.viewModel = createViewModel(this.currentWeaponId);
    this.viewModel.root.visible = false;
    this.camera.add(this.viewModel.root);

    this.loadMap(this.currentMapId);
    this.applyWeaponClass(this.currentWeaponId);
    this.spawnBots();
    this.resetMatch();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.lastTime = performance.now();
    this.scheduleNextTick();
  }

  private bindEvents() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('contextmenu', this.onContextMenu);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  private unbindEvents() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('contextmenu', this.onContextMenu);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);
  }

  private onContextLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
  };

  private onContextRestored = () => {
    this.lastTime = performance.now();
    this.scheduleNextTick();
  };

  private onContextMenu = (e: MouseEvent) => {
    if (this.phase === 'playing') {
      e.preventDefault();
    }
  };

  private onResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  };

  private onPointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    if (!this.pointerLocked && this.phase === 'playing') {
      // Allow pausing seamlessly when user hits ESC to unlock pointer
      this.mouseDownLeft = false;
      this.mouseDownRight = false;
      this.keys = {};
      this.setPhase('paused');
    }
    this.emitHud();
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    if (this.phase === 'playing') {
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        soundEngine.unlock();
        if (!e.repeat && this.playerAlive) {
          this.tryFirePlayer();
        }
      } else if (e.code === 'KeyR') {
        this.startReload();
      } else if (e.code === 'KeyP') {
        this.exitPointerLock();
        this.setPhase('paused');
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (this.phase !== 'playing') return;
    soundEngine.unlock();

    // Request pointer lock if clicking on the canvas while not locked
    if (!this.pointerLocked && e.target === this.renderer.domElement) {
      this.requestPointerLock();
      this.isDraggingLook = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }

    if (e.button === 0) {
      this.mouseDownLeft = true;
      if (this.playerAlive) {
        this.tryFirePlayer();
      }
    } else if (e.button === 2) {
      this.mouseDownRight = true;
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseDownLeft = false;
    } else if (e.button === 2) {
      this.mouseDownRight = false;
    }
    this.isDraggingLook = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.phase !== 'playing') return;

    let dx = 0;
    let dy = 0;
    if (this.pointerLocked) {
      dx = e.movementX;
      dy = e.movementY;
    } else if (this.isDraggingLook) {
      dx = e.clientX - this.lastPointerX;
      dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    } else {
      return;
    }

    const spec = WEAPON_SPECS[this.currentWeaponId];
    const adsSensMult = this.mouseDownRight ? (this.currentWeaponId === 'hunter' ? 0.42 : 0.72) : 1.0;
    const sens = 0.0021 * this.settings.sensitivity * adsSensMult;

    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.52, 1.52);

    // Weapon sway impulse
    this.swayX = THREE.MathUtils.clamp(this.swayX - dx * 0.00045 * spec.speedMult, -0.035, 0.035);
    this.swayY = THREE.MathUtils.clamp(this.swayY + dy * 0.00045 * spec.speedMult, -0.035, 0.035);
  };

  public requestPointerLock() {
    try {
      const el = this.renderer.domElement;
      if (el.requestPointerLock) {
        const res = el.requestPointerLock() as unknown as Promise<void> | undefined;
        if (res && typeof res.catch === 'function') {
          res.catch(() => {});
        }
      }
    } catch {
      // Fallback drag look remains active if sandbox restricts pointer lock
    }
  }

  public exitPointerLock() {
    try {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } catch {
      // Ignore
    }
  }

  public setPhase(next: GamePhase) {
    this.phase = next;
    if (next === 'playing') {
      soundEngine.unlock();
      this.viewModel.root.visible = this.playerAlive;
      this.requestPointerLock();
    } else {
      this.viewModel.root.visible = false;
      this.mouseDownLeft = false;
      this.mouseDownRight = false;
      this.keys = {};
      if (next !== 'paused') {
        this.exitPointerLock();
      }
    }
    this.callbacks.onPhaseChange(next);
    this.emitHud();
  }

  public startNewMatch() {
    this.resetMatch();
    this.setPhase('playing');
  }

  public updateSettings(next: GameSettings) {
    const mapChanged = next.mapId !== this.currentMapId;
    const weaponChanged = next.weaponId !== this.currentWeaponId;
    const botCountChanged = next.botCount !== this.settings.botCount;
    this.settings = { ...next };
    soundEngine.muted = next.muted;

    if (mapChanged) {
      this.loadMap(next.mapId);
      this.spawnBots();
      this.resetMatch();
    } else {
      if (weaponChanged) {
        this.applyWeaponClass(next.weaponId);
      }
      if (botCountChanged) {
        this.spawnBots();
      }
    }
    this.emitHud();
  }

  private loadMap(mapId: MapId) {
    if (this.map) {
      this.scene.remove(this.map.group);
      this.map.dispose();
    }
    this.currentMapId = mapId;
    this.map = buildArenaMap(mapId, this.textures);
    this.scene.add(this.map.group);

    this.scene.background = new THREE.Color(this.map.skyColor);
    this.scene.fog = new THREE.Fog(this.map.fogColor, this.map.fogNear, this.map.fogFar);

    this.sunLight.color.setHex(this.map.sunColor);
    this.sunLight.position.copy(this.map.sunPos);
    this.hemiLight.color.setHex(this.map.hemiSky);
    this.hemiLight.groundColor.setHex(this.map.hemiGround);
  }

  private applyWeaponClass(weaponId: WeaponId) {
    this.currentWeaponId = weaponId;
    const spec = WEAPON_SPECS[weaponId];

    // Swap 3D viewmodel
    this.camera.remove(this.viewModel.root);
    this.viewModel = createViewModel(weaponId);
    this.viewModel.root.visible = this.phase === 'playing' && this.playerAlive;
    this.camera.add(this.viewModel.root);

    this.playerMaxHp = spec.maxHp;
    this.playerHp = Math.min(this.playerHp, this.playerMaxHp);
    if (this.playerAlive) {
      this.playerHp = this.playerMaxHp;
    }
    this.ammo = spec.magSize;
    this.isReloading = false;
    this.reloadElapsed = 0;
    this.fireCooldown = 0;
  }

  private spawnBots() {
    for (const b of this.bots) {
      this.scene.remove(b.rig.root);
    }
    this.bots = [];

    const count = THREE.MathUtils.clamp(this.settings.botCount, 3, BOT_ROSTER.length);
    const spawns = this.map?.spawnPoints ?? [new THREE.Vector3(0, 0.1, 0)];
    const waypoints = this.map?.waypoints ?? [new THREE.Vector3(0, 0.1, 0)];

    for (let i = 0; i < count; i++) {
      const profile = BOT_ROSTER[i];
      const spec = WEAPON_SPECS[profile.weapon];
      const id = `bot-${i}`;
      const rig = createVoxelCharacter(id, profile.color, profile.weapon);
      const spawn = spawns[(i + 1) % spawns.length];
      rig.root.position.copy(spawn);
      this.scene.add(rig.root);

      this.bots.push({
        id,
        name: profile.name,
        weaponId: profile.weapon,
        rig,
        pos: spawn.clone(),
        vel: new THREE.Vector3(),
        yaw: Math.random() * Math.PI * 2,
        hp: spec.maxHp,
        maxHp: spec.maxHp,
        alive: true,
        respawnTimer: 0,
        fireCooldown: 0.8 + Math.random() * 1.2,
        waypoint: waypoints[Math.floor(Math.random() * waypoints.length)].clone(),
        waypointTimer: 2 + Math.random() * 3,
        strafeDir: Math.random() < 0.5 ? 1 : -1,
        strafeTimer: 1.5,
        walkPhase: Math.random() * 10,
        onGround: true,
        kills: 0,
        deaths: 0,
        score: 0,
      });
    }
  }

  private resetMatch() {
    this.timeRemaining = MAP_METAS[this.currentMapId].matchDurationSec;
    this.playerKills = 0;
    this.playerDeaths = 0;
    this.playerScore = 0;
    this.playerStreak = 0;
    this.killFeed = [];
    this.lastKillBanner = null;
    this.hitMarkerType = 'none';
    this.damageFlash = 0;

    this.respawnPlayer();

    const spawns = this.map?.spawnPoints ?? [new THREE.Vector3(0, 0.1, 0)];
    const waypoints = this.map?.waypoints ?? [new THREE.Vector3(0, 0.1, 0)];
    this.bots.forEach((b, idx) => {
      const sp = spawns[(idx + 1) % spawns.length];
      b.pos.copy(sp);
      b.vel.set(0, 0, 0);
      b.hp = b.maxHp;
      b.alive = true;
      b.respawnTimer = 0;
      b.kills = 0;
      b.deaths = 0;
      b.score = 0;
      b.rig.root.visible = true;
      b.rig.root.position.copy(b.pos);
      b.waypoint.copy(waypoints[Math.floor(Math.random() * waypoints.length)]);
    });

    this.emitHud();
  }

  private respawnPlayer() {
    const spawns = this.map?.spawnPoints ?? [new THREE.Vector3(0, 0.1, 20)];
    // Choose spawn farthest from living bots
    let bestSpawn = spawns[0];
    let bestMinDist = -1;
    for (const sp of spawns) {
      let minDist = Infinity;
      for (const b of this.bots) {
        if (!b.alive) continue;
        const d = sp.distanceTo(b.pos);
        if (d < minDist) minDist = d;
      }
      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        bestSpawn = sp;
      }
    }

    const spec = WEAPON_SPECS[this.currentWeaponId];
    this.playerPos.copy(bestSpawn);
    this.playerVel.set(0, 0, 0);
    // Face toward arena center (0, 0, 0)
    this.yaw = Math.atan2(-bestSpawn.x, -bestSpawn.z);
    this.pitch = 0;
    this.playerMaxHp = spec.maxHp;
    this.playerHp = spec.maxHp;
    this.ammo = spec.magSize;
    this.isReloading = false;
    this.reloadElapsed = 0;
    this.playerAlive = true;
    this.respawnTimer = 0;
    this.isSliding = false;
    this.viewModel.root.visible = this.phase === 'playing';
  }

  private startReload() {
    const spec = WEAPON_SPECS[this.currentWeaponId];
    if (this.isReloading || this.ammo >= spec.magSize || !this.playerAlive) return;
    this.isReloading = true;
    this.reloadElapsed = 0;
    soundEngine.playReload();
  }

  private tryFirePlayer() {
    if (!this.playerAlive || this.fireCooldown > 0 || this.isReloading) return;
    const spec = WEAPON_SPECS[this.currentWeaponId];
    if (this.ammo <= 0) {
      this.startReload();
      return;
    }

    this.ammo -= 1;
    this.fireCooldown = spec.fireRateMs / 1000;
    this.muzzleFlashTimer = 0.055;
    this.viewModel.muzzleFlash.visible = true;
    this.viewModel.muzzleFlash.rotation.z = Math.random() * Math.PI;
    this.viewModel.muzzleFlash.scale.setScalar(0.8 + Math.random() * 0.5);

    this.viewModelKick = Math.min(0.14, this.viewModelKick + 0.085);
    this.recoilPitch += spec.recoilKick * (this.adsLerp > 0.5 ? 0.65 : 1.0);
    this.pitch = THREE.MathUtils.clamp(this.pitch + spec.recoilKick * 0.45, -1.52, 1.52);

    soundEngine.playShoot(this.currentWeaponId, 1.0);

    // Vince Shotgun Impulse Jump!
    if (spec.impulseSelf > 0) {
      this.camera.getWorldDirection(_dir);
      this.playerVel.addScaledVector(_dir, -spec.impulseSelf);
      if (this.onGround && _dir.y < -0.35) {
        this.onGround = false;
        this.playerPos.y += 0.06;
      }
    }

    // Compute world muzzle start for tracer
    const muzzleWorld = new THREE.Vector3();
    this.viewModel.muzzleTip.getWorldPosition(muzzleWorld);

    // Fire pellets / hitscan ray
    const speedRatio = Math.min(1, Math.hypot(this.playerVel.x, this.playerVel.z) / 14);
    const baseSpread = THREE.MathUtils.lerp(spec.spreadHip, spec.spreadAds, this.adsLerp);
    const spread = baseSpread + (this.adsLerp < 0.5 ? speedRatio * 0.014 : 0);

    const aliveHitMeshes: THREE.Object3D[] = [];
    for (const b of this.bots) {
      if (b.alive) aliveHitMeshes.push(...b.rig.hitMeshes);
    }
    const mapMeshes = this.map?.raycastMeshes ?? [];
    const targets = [...mapMeshes, ...aliveHitMeshes];

    let bestHitZone: 'none' | 'body' | 'head' = 'none';
    const botDamageTotals = new Map<BotEntity, { dmg: number; headshot: boolean; point: THREE.Vector3 }>();

    this.camera.getWorldDirection(_dir);
    _right.crossVectors(_dir, _up).normalize();
    const camUp = _v1.crossVectors(_right, _dir).normalize();

    for (let p = 0; p < spec.pellets; p++) {
      const rx = (Math.random() - 0.5) * 2 * spread;
      const ry = (Math.random() - 0.5) * 2 * spread;
      const rayDir = _v2
        .copy(_dir)
        .addScaledVector(_right, rx)
        .addScaledVector(camUp, ry)
        .normalize();

      _raycaster.set(this.camera.position, rayDir);
      _raycaster.far = spec.range;
      const hits = _raycaster.intersectObjects(targets, false);

      let endPoint = _v3.copy(this.camera.position).addScaledVector(rayDir, Math.min(85, spec.range));
      if (hits.length > 0) {
        const hit = hits[0];
        endPoint.copy(hit.point);
        const botId = hit.object.userData.botId as string | undefined;
        if (botId) {
          const bot = this.bots.find((b) => b.id === botId);
          if (bot && bot.alive) {
            const isHead = hit.object.userData.hitZone === 'head';
            // Slight distance falloff for shotgun only
            let dmg = isHead ? spec.damageHead : spec.damageBody;
            if (spec.id === 'vince') {
              const distMult = THREE.MathUtils.clamp(1.15 - hit.distance / 32, 0.25, 1.0);
              dmg = Math.round(dmg * distMult);
            }
            const prev = botDamageTotals.get(bot);
            if (prev) {
              prev.dmg += dmg;
              prev.headshot = prev.headshot || isHead;
            } else {
              botDamageTotals.set(bot, { dmg, headshot: isHead, point: hit.point.clone() });
            }
            if (isHead) bestHitZone = 'head';
            else if (bestHitZone === 'none') bestHitZone = 'body';
            this.spawnSparks(hit.point, isHead ? 0xfacc15 : 0xef4444, isHead ? 6 : 3);
          }
        } else {
          // Wall/crate spark
          this.spawnSparks(hit.point, 0xfbbf24, 3);
        }
      }

      this.spawnTracer(muzzleWorld, endPoint, spec.id === 'hunter' ? 0x38bdf8 : 0xfde047);
    }

    if (bestHitZone !== 'none') {
      soundEngine.playHitmarker(bestHitZone === 'head');
      this.hitMarkerType = bestHitZone;
      this.hitMarkerSeq += 1;
      this.hitMarkerTimer = 0.18;
    }

    botDamageTotals.forEach((info, bot) => {
      this.emitDamagePopup(info.point, info.dmg, info.headshot);
      this.damageBot(bot, info.dmg, info.headshot, 'You', spec.weaponName, true);
    });

    if (this.ammo <= 0) {
      this.startReload();
    }
  }

  private emitDamagePopup(worldPoint: THREE.Vector3, amount: number, headshot: boolean) {
    _proj.copy(worldPoint).project(this.camera);
    if (_proj.z > 1) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const x = ((_proj.x + 1) / 2) * w;
    const y = ((-_proj.y + 1) / 2) * h;
    this.callbacks.onDamagePopup({
      id: this.nextId++,
      amount,
      headshot,
      x,
      y,
    });
  }

  private damageBot(
    bot: BotEntity,
    amount: number,
    headshot: boolean,
    killerName: string,
    weaponName: string,
    isPlayerKiller: boolean
  ) {
    if (!bot.alive) return;
    bot.hp -= amount;
    if (bot.hp <= 0) {
      bot.hp = 0;
      bot.alive = false;
      bot.respawnTimer = 2.6;
      bot.deaths += 1;
      bot.rig.root.visible = false;
      this.spawnSparks(bot.pos.clone().add(new THREE.Vector3(0, 1.1, 0)), 0xf97316, 12);

      if (isPlayerKiller) {
        this.playerKills += 1;
        this.playerStreak += 1;
        this.playerScore += headshot ? 150 : 100;
        soundEngine.playKill(this.playerStreak);
        this.lastKillBanner = {
          victim: bot.name,
          headshot,
          streak: this.playerStreak,
          seq: ++this.killBannerSeq,
        };
      } else {
        const killerBot = this.bots.find((b) => b.name === killerName);
        if (killerBot) {
          killerBot.kills += 1;
          killerBot.score += headshot ? 150 : 100;
        }
      }

      this.pushKillFeed({
        id: this.nextId++,
        killer: killerName,
        victim: bot.name,
        weapon: weaponName,
        headshot,
        isPlayerKiller,
        isPlayerVictim: false,
        timestamp: performance.now(),
      });
    }
  }

  private damagePlayer(amount: number, killerBot: BotEntity, headshot: boolean) {
    if (!this.playerAlive || this.phase !== 'playing') return;
    this.playerHp -= amount;
    this.damageFlash = 1.0;
    soundEngine.playDamage();

    if (this.playerHp <= 0) {
      this.playerHp = 0;
      this.playerAlive = false;
      this.respawnTimer = 2.4;
      this.playerDeaths += 1;
      this.playerStreak = 0;
      this.viewModel.root.visible = false;

      killerBot.kills += 1;
      killerBot.score += headshot ? 150 : 100;

      this.pushKillFeed({
        id: this.nextId++,
        killer: killerBot.name,
        victim: 'You',
        weapon: WEAPON_SPECS[killerBot.weaponId].weaponName,
        headshot,
        isPlayerKiller: false,
        isPlayerVictim: true,
        timestamp: performance.now(),
      });
    }
  }

  private pushKillFeed(item: KillFeedItem) {
    this.killFeed = [item, ...this.killFeed].slice(0, 5);
  }

  private spawnTracer(start: THREE.Vector3, end: THREE.Vector3, colorHex: number) {
    const dist = start.distanceTo(end);
    if (dist < 0.2) return;
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
    });
    const mesh = new THREE.Mesh(this.fxGeoTracer, mat);
    mesh.position.copy(start).lerp(end, 0.5);
    mesh.scale.set(1, dist, 1);
    mesh.quaternion.setFromUnitVectors(_up, _v1.subVectors(end, start).normalize());
    this.scene.add(mesh);
    this.tracers.push({ mesh, life: 0.09, maxLife: 0.09 });
  }

  private spawnSparks(pos: THREE.Vector3, colorHex: number, count: number) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(this.fxGeoSpark, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.sparks.push({
        mesh,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 9,
          2 + Math.random() * 6,
          (Math.random() - 0.5) * 9
        ),
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.55,
      });
    }
  }

  private updateEntityPhysics(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    radius: number,
    height: number,
    dt: number,
    allowStepUp = true
  ): boolean {
    const colliders = this.map?.colliders ?? [];

    // Gravity
    vel.y -= 25.5 * dt;

    // Move X & resolve walls
    pos.x += vel.x * dt;
    for (const c of colliders) {
      if (c.isRamp) continue;
      if (pos.y + 0.38 < c.maxY && pos.y + height > c.minY) {
        if (
          pos.x + radius > c.minX &&
          pos.x - radius < c.maxX &&
          pos.z + radius > c.minZ &&
          pos.z - radius < c.maxZ
        ) {
          // Step up low edges if close to top
          if (allowStepUp && c.maxY - pos.y <= 0.42 && vel.y <= 0.5) {
            pos.y = c.maxY;
          } else {
            const pushLeft = pos.x + radius - c.minX;
            const pushRight = c.maxX - (pos.x - radius);
            if (pushLeft < pushRight) pos.x = c.minX - radius;
            else pos.x = c.maxX + radius;
            vel.x = 0;
          }
        }
      }
    }

    // Move Z & resolve walls
    pos.z += vel.z * dt;
    for (const c of colliders) {
      if (c.isRamp) continue;
      if (pos.y + 0.38 < c.maxY && pos.y + height > c.minY) {
        if (
          pos.x + radius > c.minX &&
          pos.x - radius < c.maxX &&
          pos.z + radius > c.minZ &&
          pos.z - radius < c.maxZ
        ) {
          if (allowStepUp && c.maxY - pos.y <= 0.42 && vel.y <= 0.5) {
            pos.y = c.maxY;
          } else {
            const pushFront = pos.z + radius - c.minZ;
            const pushBack = c.maxZ - (pos.z - radius);
            if (pushFront < pushBack) pos.z = c.minZ - radius;
            else pos.z = c.maxZ + radius;
            vel.z = 0;
          }
        }
      }
    }

    // Move Y & resolve floor / ramps / ceilings
    const prevY = pos.y;
    pos.y += vel.y * dt;

    let highestFloor = 0;
    for (const c of colliders) {
      if (pos.x + radius > c.minX && pos.x - radius < c.maxX && pos.z + radius > c.minZ && pos.z - radius < c.maxZ) {
        if (c.isRamp) {
          const rampY = getRampSurfaceY(c, pos.x, pos.z);
          if (prevY >= rampY - 0.55 && pos.y <= rampY + 0.15) {
            if (rampY > highestFloor) highestFloor = rampY;
          }
        } else {
          // Top surface landing
          if (prevY >= c.maxY - 0.35 && pos.y <= c.maxY) {
            if (c.maxY > highestFloor) highestFloor = c.maxY;
          }
          // Ceiling bump
          if (vel.y > 0 && prevY + height <= c.minY + 0.2 && pos.y + height > c.minY) {
            pos.y = c.minY - height;
            vel.y = 0;
          }
        }
      }
    }

    let landed = false;
    if (pos.y <= highestFloor) {
      pos.y = highestFloor;
      if (vel.y < 0) vel.y = 0;
      landed = true;
    }

    // Clamp arena safety bounds
    pos.x = THREE.MathUtils.clamp(pos.x, -33.2, 33.2);
    pos.z = THREE.MathUtils.clamp(pos.z, -33.2, 33.2);

    return landed;
  }

  private updatePlayer(dt: number) {
    const spec = WEAPON_SPECS[this.currentWeaponId];

    if (!this.playerAlive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawnPlayer();
      }
      return;
    }

    // Reload progress
    if (this.isReloading) {
      this.reloadElapsed += dt * 1000;
      if (this.reloadElapsed >= spec.reloadMs) {
        this.ammo = spec.magSize;
        this.isReloading = false;
        this.reloadElapsed = 0;
      }
    }

    // Automatic firing
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    const fireHeld = this.mouseDownLeft || !!this.keys['Enter'] || !!this.keys['NumpadEnter'];
    if (fireHeld && spec.automatic && this.fireCooldown <= 0) {
      this.tryFirePlayer();
    }

    // Muzzle flash decay
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.viewModel.muzzleFlash.visible = false;
      }
    }

    // Input axes
    const forward = (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) - (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0);
    const strafe = (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) - (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0);
    const crouchHeld = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['KeyC']);
    const jumpHeld = !!this.keys['Space'];

    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    const wishX = -sinY * forward + cosY * strafe;
    const wishZ = -cosY * forward - sinY * strafe;
    const wishLen = Math.hypot(wishX, wishZ);
    const nx = wishLen > 0 ? wishX / wishLen : 0;
    const nz = wishLen > 0 ? wishZ / wishLen : 0;

    if (this.slideCooldown > 0) this.slideCooldown -= dt;

    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    const baseMaxSpeed = 11.6 * spec.speedMult * (this.adsLerp > 0.4 ? 0.65 : 1.0);

    // Trigger slide when crouching while moving fast
    if (crouchHeld && this.onGround && horizSpeed > 4.2 && !this.isSliding && this.slideCooldown <= 0) {
      this.isSliding = true;
      this.slideCooldown = 0.45;
      // Krunker-style momentum impulse on slide start
      const boostDirX = wishLen > 0 ? nx : this.playerVel.x / horizSpeed;
      const boostDirZ = wishLen > 0 ? nz : this.playerVel.z / horizSpeed;
      this.playerVel.x += boostDirX * 4.4;
      this.playerVel.z += boostDirZ * 4.4;
    } else if (!crouchHeld || horizSpeed < 2.2 || !this.onGround) {
      if (!crouchHeld) this.isSliding = false;
    }

    if (this.onGround) {
      this.coyoteTimer = 0.11;
      const friction = this.isSliding ? 1.55 : 10.5;
      const drop = Math.max(0, 1 - friction * dt);
      this.playerVel.x *= drop;
      this.playerVel.z *= drop;

      if (!this.isSliding && wishLen > 0) {
        const accel = 78 * spec.speedMult;
        this.playerVel.x += nx * accel * dt;
        this.playerVel.z += nz * accel * dt;
        const spd = Math.hypot(this.playerVel.x, this.playerVel.z);
        if (spd > baseMaxSpeed) {
          const scale = THREE.MathUtils.lerp(spd, baseMaxSpeed, Math.min(1, dt * 10)) / spd;
          this.playerVel.x *= scale;
          this.playerVel.z *= scale;
        }
      } else if (this.isSliding && wishLen > 0) {
        // Gentle steering while sliding
        this.playerVel.x += nx * 12 * dt;
        this.playerVel.z += nz * 12 * dt;
      }
    } else {
      this.coyoteTimer -= dt;
      // Air strafe control
      if (wishLen > 0) {
        const airAccel = 26 * spec.speedMult;
        this.playerVel.x += nx * airAccel * dt;
        this.playerVel.z += nz * airAccel * dt;
      }
    }

    // Cap absolute slide-hop top speed at 23.5 u/s
    const curSpd = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (curSpd > 23.5) {
      this.playerVel.x = (this.playerVel.x / curSpd) * 23.5;
      this.playerVel.z = (this.playerVel.z / curSpd) * 23.5;
    }

    // Jump / Slide-Hop!
    if (jumpHeld && (this.onGround || this.coyoteTimer > 0)) {
      const wasSliding = this.isSliding || crouchHeld;
      this.playerVel.y = 9.4;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.isSliding = false;
      if (wasSliding && wishLen > 0) {
        // Slide-hop chain boost
        this.playerVel.x += nx * 2.1;
        this.playerVel.z += nz * 2.1;
      }
      soundEngine.playJump(wasSliding);
    }

    const standingH = crouchHeld ? 1.25 : 1.85;
    this.onGround = this.updateEntityPhysics(this.playerPos, this.playerVel, 0.48, standingH, dt, true);

    // Smooth eye height + camera FOV & orientation
    const targetEye = crouchHeld ? 1.05 : 1.62;
    this.eyeHeight = THREE.MathUtils.damp(this.eyeHeight, targetEye, 16, dt);

    const targetAds = this.mouseDownRight && !this.isReloading ? 1 : 0;
    this.adsLerp = THREE.MathUtils.damp(this.adsLerp, targetAds, 15, dt);

    const speedFovBonus = Math.min(12, Math.max(0, (curSpd - 11.5) * 0.95));
    const targetFov = THREE.MathUtils.lerp(this.settings.fov + speedFovBonus, spec.adsFov, this.adsLerp);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 14, dt);
      this.camera.updateProjectionMatrix();
    }

    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, 14, dt);
    this.camera.position.set(this.playerPos.x, this.playerPos.y + this.eyeHeight, this.playerPos.z);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = THREE.MathUtils.clamp(this.pitch + this.recoilPitch * 0.35, -1.52, 1.52);
    this.camera.rotation.z = 0;

    // Sniper scope hides viewmodel at full ADS zoom
    this.viewModel.root.visible = !(spec.id === 'hunter' && this.adsLerp > 0.72);

    // Viewmodel recoil, sway, reload tilt & sprint bob
    this.viewModelKick = THREE.MathUtils.damp(this.viewModelKick, 0, 18, dt);
    this.swayX = THREE.MathUtils.damp(this.swayX, 0, 12, dt);
    this.swayY = THREE.MathUtils.damp(this.swayY, 0, 12, dt);

    if (this.onGround && curSpd > 2 && !this.isSliding) {
      this.bobPhase += dt * Math.min(16, curSpd * 1.05);
    }
    const bobAmp = this.onGround && curSpd > 2 && !this.isSliding ? THREE.MathUtils.lerp(0.012, 0.002, this.adsLerp) : 0;
    const bobX = Math.cos(this.bobPhase) * bobAmp;
    const bobY = Math.abs(Math.sin(this.bobPhase)) * bobAmp;

    const reloadDip = this.isReloading ? Math.sin((this.reloadElapsed / spec.reloadMs) * Math.PI) * 0.14 : 0;
    const reloadRoll = this.isReloading ? Math.sin((this.reloadElapsed / spec.reloadMs) * Math.PI) * 0.45 : 0;

    this.viewModel.root.position.set(
      THREE.MathUtils.lerp(this.viewModel.hipOffset.x, this.viewModel.adsOffset.x, this.adsLerp) + this.swayX + bobX,
      THREE.MathUtils.lerp(this.viewModel.hipOffset.y, this.viewModel.adsOffset.y, this.adsLerp) + this.swayY - bobY - reloadDip,
      THREE.MathUtils.lerp(this.viewModel.hipOffset.z, this.viewModel.adsOffset.z, this.adsLerp) + this.viewModelKick
    );
    this.viewModel.root.rotation.set(this.viewModelKick * 1.4, 0, reloadRoll + (this.isSliding ? 0.16 : 0));
  }

  private hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const mapMeshes = this.map?.raycastMeshes ?? [];
    _v1.subVectors(to, from);
    const dist = _v1.length();
    if (dist < 0.1) return true;
    _v1.divideScalar(dist);
    _raycaster.set(from, _v1);
    _raycaster.far = dist - 0.35;
    const hits = _raycaster.intersectObjects(mapMeshes, false);
    return hits.length === 0;
  }

  private updateBots(dt: number) {
    const waypoints = this.map?.waypoints ?? [new THREE.Vector3(0, 0.1, 0)];
    const spawns = this.map?.spawnPoints ?? [new THREE.Vector3(0, 0.1, 0)];

    const diffCfg =
      this.settings.difficulty === 'nightmare'
        ? { reactMult: 0.72, spread: 0.032, dmgScale: 0.9 }
        : this.settings.difficulty === 'competitive'
        ? { reactMult: 1.0, spread: 0.055, dmgScale: 0.65 }
        : { reactMult: 1.4, spread: 0.085, dmgScale: 0.42 };

    for (const bot of this.bots) {
      if (!bot.alive) {
        bot.respawnTimer -= dt;
        if (bot.respawnTimer <= 0) {
          const sp = spawns[Math.floor(Math.random() * spawns.length)];
          bot.pos.copy(sp);
          bot.vel.set(0, 0, 0);
          bot.hp = bot.maxHp;
          bot.alive = true;
          bot.rig.root.visible = true;
          bot.waypoint.copy(waypoints[Math.floor(Math.random() * waypoints.length)]);
        }
        continue;
      }

      const spec = WEAPON_SPECS[bot.weaponId];

      // Find nearest visible target (Player or another Bot)
      let targetPos: THREE.Vector3 | null = null;
      let targetIsPlayer = false;
      let targetBot: BotEntity | null = null;
      let bestDist = 42;

      const botEye = _v2.set(bot.pos.x, bot.pos.y + 1.55, bot.pos.z);

      if (this.playerAlive) {
        const playerEye = _v3.set(this.playerPos.x, this.playerPos.y + 1.45, this.playerPos.z);
        const d = botEye.distanceTo(playerEye);
        if (d < bestDist && this.hasLineOfSight(botEye, playerEye)) {
          bestDist = d;
          targetPos = playerEye.clone();
          targetIsPlayer = true;
        }
      }

      for (const other of this.bots) {
        if (other === bot || !other.alive) continue;
        const otherEye = _v3.set(other.pos.x, other.pos.y + 1.45, other.pos.z);
        const d = botEye.distanceTo(otherEye);
        if (d < bestDist && this.hasLineOfSight(botEye, otherEye)) {
          bestDist = d;
          targetPos = otherEye.clone();
          targetIsPlayer = false;
          targetBot = other;
        }
      }

      // Movement & Navigation
      bot.strafeTimer -= dt;
      if (bot.strafeTimer <= 0) {
        bot.strafeDir = Math.random() < 0.5 ? 1 : -1;
        bot.strafeTimer = 0.8 + Math.random() * 1.4;
      }

      let moveX = 0;
      let moveZ = 0;

      if (targetPos) {
        const toTargetX = targetPos.x - bot.pos.x;
        const toTargetZ = targetPos.z - bot.pos.z;
        const desiredYaw = Math.atan2(toTargetX, toTargetZ);
        // Smooth yaw turn
        let diff = desiredYaw - bot.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        bot.yaw += diff * Math.min(1, dt * 10);

        // Strafe & keep comfortable combat distance
        const dist = Math.hypot(toTargetX, toTargetZ);
        const preferredDist = bot.weaponId === 'vince' ? 7 : bot.weaponId === 'hunter' ? 22 : 13;
        const fwdPush = dist > preferredDist + 2 ? 0.7 : dist < preferredDist - 2 ? -0.6 : 0;

        moveX = Math.sin(bot.yaw) * fwdPush + Math.cos(bot.yaw) * bot.strafeDir * 0.85;
        moveZ = Math.cos(bot.yaw) * fwdPush - Math.sin(bot.yaw) * bot.strafeDir * 0.85;

        // Fire when cooldown ready
        bot.fireCooldown -= dt;
        if (bot.fireCooldown <= 0) {
          bot.fireCooldown = (spec.fireRateMs / 1000) * (bot.weaponId === 'triggerman' || bot.weaponId === 'runngun' ? 2.1 : 1.35) * diffCfg.reactMult;

          const muzzlePos = new THREE.Vector3();
          bot.rig.muzzleWorldAnchor.getWorldPosition(muzzlePos);

          const shotDir = new THREE.Vector3().subVectors(targetPos, muzzlePos).normalize();
          shotDir.x += (Math.random() - 0.5) * diffCfg.spread;
          shotDir.y += (Math.random() - 0.5) * diffCfg.spread;
          shotDir.z += (Math.random() - 0.5) * diffCfg.spread;
          shotDir.normalize();

          const distToMe = bot.pos.distanceTo(this.playerPos);
          const vol = THREE.MathUtils.clamp(1 - distToMe / 55, 0.08, 0.55);
          soundEngine.playShoot(bot.weaponId, vol);

          // Check hit probability along ray vs target
          const endPos = muzzlePos.clone().addScaledVector(shotDir, Math.min(45, bestDist + 2));
          this.spawnTracer(muzzlePos, endPos, 0xfb7185);

          // Line-to-target miss radius check
          const closestPt = new THREE.Vector3()
            .subVectors(targetPos, muzzlePos)
            .projectOnVector(shotDir)
            .add(muzzlePos);
          const missDist = closestPt.distanceTo(targetPos);

          if (missDist < 0.62) {
            const isHead = missDist < 0.22 && Math.random() < 0.28;
            const rawDmg = isHead ? spec.damageHead : spec.damageBody;
            const finalDmg = Math.max(6, Math.round(rawDmg * diffCfg.dmgScale));
            if (targetIsPlayer) {
              this.damagePlayer(finalDmg, bot, isHead);
            } else if (targetBot) {
              this.damageBot(targetBot, finalDmg, isHead, bot.name, spec.weaponName, false);
            }
          }
        }
      } else {
        // Patrol waypoints
        bot.waypointTimer -= dt;
        const dx = bot.waypoint.x - bot.pos.x;
        const dz = bot.waypoint.z - bot.pos.z;
        const distWp = Math.hypot(dx, dz);
        if (distWp < 2.2 || bot.waypointTimer <= 0) {
          bot.waypoint.copy(waypoints[Math.floor(Math.random() * waypoints.length)]);
          bot.waypointTimer = 3.5 + Math.random() * 4;
        } else {
          const desiredYaw = Math.atan2(dx, dz);
          let diff = desiredYaw - bot.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          bot.yaw += diff * Math.min(1, dt * 7);
          moveX = dx / distWp;
          moveZ = dz / distWp;
        }
      }

      const moveLen = Math.hypot(moveX, moveZ);
      const botSpeed = 7.4 * spec.speedMult;
      if (moveLen > 0.01) {
        bot.vel.x = (moveX / moveLen) * botSpeed;
        bot.vel.z = (moveZ / moveLen) * botSpeed;
      } else {
        bot.vel.x *= 0.8;
        bot.vel.z *= 0.8;
      }

      const prevX = bot.pos.x;
      const prevZ = bot.pos.z;
      bot.onGround = this.updateEntityPhysics(bot.pos, bot.vel, 0.45, 1.85, dt, true);

      // Jump if stuck against a crate while moving
      const moved = Math.hypot(bot.pos.x - prevX, bot.pos.z - prevZ);
      if (bot.onGround && moveLen > 0.2 && moved < botSpeed * dt * 0.25) {
        bot.vel.y = 8.8;
        bot.onGround = false;
      }

      // Sync rig transform & limb swing animation
      bot.rig.root.position.copy(bot.pos);
      bot.rig.root.rotation.y = bot.yaw;

      const actualSpd = Math.hypot(bot.vel.x, bot.vel.z);
      if (actualSpd > 0.5 && bot.onGround) {
        bot.walkPhase += dt * actualSpd * 1.4;
        const swing = Math.sin(bot.walkPhase) * 0.65;
        bot.rig.leftLegPivot.rotation.x = swing;
        bot.rig.rightLegPivot.rotation.x = -swing;
        bot.rig.leftArmPivot.rotation.x = -swing * 0.35;
      } else {
        bot.rig.leftLegPivot.rotation.x = THREE.MathUtils.damp(bot.rig.leftLegPivot.rotation.x, 0, 10, dt);
        bot.rig.rightLegPivot.rotation.x = THREE.MathUtils.damp(bot.rig.rightLegPivot.rotation.x, 0, 10, dt);
      }
    }
  }

  private updateFx(dt: number) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.scene.remove(t.mesh);
        (t.mesh.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      } else {
        (t.mesh.material as THREE.MeshBasicMaterial).opacity = (t.life / t.maxLife) * 0.85;
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        (s.mesh.material as THREE.Material).dispose();
        this.sparks.splice(i, 1);
      } else {
        s.vel.y -= 18 * dt;
        s.mesh.position.addScaledVector(s.vel, dt);
        s.mesh.rotation.x += dt * 8;
        s.mesh.rotation.y += dt * 6;
        (s.mesh.material as THREE.MeshBasicMaterial).opacity = s.life / s.maxLife;
      }
    }
  }

  private emitHud() {
    const spec = WEAPON_SPECS[this.currentWeaponId];
    const scoreboard: ScoreboardEntry[] = [
      {
        id: 'player',
        name: 'You',
        weaponId: this.currentWeaponId,
        kills: this.playerKills,
        deaths: this.playerDeaths,
        score: this.playerScore,
        isPlayer: true,
      },
      ...this.bots.map((b) => ({
        id: b.id,
        name: b.name,
        weaponId: b.weaponId,
        kills: b.kills,
        deaths: b.deaths,
        score: b.score,
        isPlayer: false,
      })),
    ].sort((a, b) => b.score - a.score || b.kills - a.kills);

    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    const spreadRatio = THREE.MathUtils.clamp(
      (horizSpeed / 14) * (1 - this.adsLerp) + this.viewModelKick * 5,
      0,
      1.5
    );

    this.callbacks.onHudUpdate({
      hp: Math.ceil(this.playerHp),
      maxHp: this.playerMaxHp,
      ammo: this.ammo,
      maxAmmo: spec.magSize,
      isReloading: this.isReloading,
      reloadProgress: this.isReloading ? Math.min(1, this.reloadElapsed / spec.reloadMs) : 0,
      isAds: this.adsLerp > 0.55,
      isSliding: this.isSliding,
      speed: horizSpeed,
      spreadRatio,
      kills: this.playerKills,
      deaths: this.playerDeaths,
      score: this.playerScore,
      streak: this.playerStreak,
      timeRemaining: Math.max(0, Math.ceil(this.timeRemaining)),
      hitMarkerType: this.hitMarkerTimer > 0 ? this.hitMarkerType : 'none',
      hitMarkerSeq: this.hitMarkerSeq,
      damageFlash: this.damageFlash,
      lastKillBanner: this.lastKillBanner,
      killFeed: this.killFeed,
      scoreboard,
      respawnTimer: this.playerAlive ? 0 : Math.max(0, this.respawnTimer),
      pointerLocked: this.pointerLocked,
    });
  }

  private tick = () => {
    if (this.disposed) return;

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.phase === 'playing') {
      this.timeRemaining -= dt;
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.exitPointerLock();
        this.setPhase('ended');
      } else {
        this.updatePlayer(dt);
        this.updateBots(dt);
        this.updateFx(dt);
      }
    } else {
      // Scenic live flythrough orbit in menu/paused/ended states
      this.menuOrbitAngle += dt * 0.14;
      const radius = 26;
      this.camera.position.set(
        Math.cos(this.menuOrbitAngle) * radius,
        14.5,
        Math.sin(this.menuOrbitAngle) * radius
      );
      this.camera.lookAt(0, 2.2, 0);
      this.updateFx(dt);
    }

    if (this.hitMarkerTimer > 0) this.hitMarkerTimer -= dt;
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt * 2.8);

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.05) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }

    this.renderer.render(this.scene, this.camera);
    this.scheduleNextTick();
  };

  private scheduleNextTick() {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.unbindEvents();
    this.exitPointerLock();

    if (this.map) {
      this.map.dispose();
    }
    this.textures.dispose();
    this.fxGeoTracer.dispose();
    this.fxGeoSpark.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
