export type WeaponId = 'triggerman' | 'hunter' | 'runngun' | 'vince';
export type MapId = 'burg' | 'cargo';
export type Difficulty = 'casual' | 'competitive' | 'nightmare';
export type GamePhase = 'menu' | 'playing' | 'paused' | 'ended';

export interface WeaponSpec {
  id: WeaponId;
  className: string;
  weaponName: string;
  role: string;
  maxHp: number;
  speedMult: number;
  magSize: number;
  fireRateMs: number;
  reloadMs: number;
  damageBody: number;
  damageHead: number;
  pellets: number;
  spreadHip: number;
  spreadAds: number;
  adsFov: number;
  automatic: boolean;
  recoilKick: number;
  range: number;
  impulseSelf: number; // Shotgun jump kickback
  accentColor: string;
  stats: {
    damage: number;
    fireRate: number;
    mobility: number;
    range: number;
  };
}

export const WEAPON_SPECS: Record<WeaponId, WeaponSpec> = {
  triggerman: {
    id: 'triggerman',
    className: 'Triggerman',
    weaponName: 'AK-47 Tactical',
    role: 'All-Range Assault',
    maxHp: 100,
    speedMult: 1.0,
    magSize: 30,
    fireRateMs: 105,
    reloadMs: 1450,
    damageBody: 24,
    damageHead: 42,
    pellets: 1,
    spreadHip: 0.018,
    spreadAds: 0.0025,
    adsFov: 52,
    automatic: true,
    recoilKick: 0.022,
    range: 140,
    impulseSelf: 0,
    accentColor: '#F59E0B',
    stats: { damage: 72, fireRate: 76, mobility: 72, range: 78 },
  },
  hunter: {
    id: 'hunter',
    className: 'Hunter',
    weaponName: 'AWP Longbow',
    role: 'Precision Marksman',
    maxHp: 65,
    speedMult: 1.04,
    magSize: 3,
    fireRateMs: 920,
    reloadMs: 1650,
    damageBody: 78,
    damageHead: 135,
    pellets: 1,
    spreadHip: 0.055,
    spreadAds: 0.0004,
    adsFov: 26,
    automatic: false,
    recoilKick: 0.065,
    range: 220,
    impulseSelf: 0,
    accentColor: '#06B6D4',
    stats: { damage: 100, fireRate: 24, mobility: 78, range: 100 },
  },
  runngun: {
    id: 'runngun',
    className: 'Run N Gun',
    weaponName: 'Vektor SMG',
    role: 'High-Speed Flanker',
    maxHp: 100,
    speedMult: 1.15,
    magSize: 32,
    fireRateMs: 68,
    reloadMs: 1200,
    damageBody: 16,
    damageHead: 28,
    pellets: 1,
    spreadHip: 0.024,
    spreadAds: 0.007,
    adsFov: 58,
    automatic: true,
    recoilKick: 0.012,
    range: 105,
    impulseSelf: 0,
    accentColor: '#10B981',
    stats: { damage: 48, fireRate: 96, mobility: 96, range: 54 },
  },
  vince: {
    id: 'vince',
    className: 'Vince',
    weaponName: 'Breacher SG-2',
    role: 'Close-Quarters Breacher',
    maxHp: 100,
    speedMult: 1.05,
    magSize: 2,
    fireRateMs: 420,
    reloadMs: 1300,
    damageBody: 17, // x7 pellets = 119 max close
    damageHead: 26,
    pellets: 7,
    spreadHip: 0.068,
    spreadAds: 0.042,
    adsFov: 60,
    automatic: false,
    recoilKick: 0.075,
    range: 55,
    impulseSelf: 10.5,
    accentColor: '#EF4444',
    stats: { damage: 94, fireRate: 45, mobility: 84, range: 32 },
  },
};

export interface MapMeta {
  id: MapId;
  name: string;
  subtitle: string;
  matchDurationSec: number;
}

export const MAP_METAS: Record<MapId, MapMeta> = {
  burg: {
    id: 'burg',
    name: 'Burg Courtyard',
    subtitle: 'Sunlit sandstone alleys, market crates & elevated sniper catwalks',
    matchDurationSec: 150,
  },
  cargo: {
    id: 'cargo',
    name: 'Cargo Yard',
    subtitle: 'Coastal port containers, steel skybridge & loading ramps',
    matchDurationSec: 150,
  },
};

export interface KillFeedItem {
  id: number;
  killer: string;
  victim: string;
  weapon: string;
  headshot: boolean;
  isPlayerKiller: boolean;
  isPlayerVictim: boolean;
  timestamp: number;
}

export interface ScoreboardEntry {
  id: string;
  name: string;
  weaponId: WeaponId;
  kills: number;
  deaths: number;
  score: number;
  isPlayer: boolean;
}

export interface DamagePopup {
  id: number;
  amount: number;
  headshot: boolean;
  x: number;
  y: number;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  reloadProgress: number; // 0-1
  isAds: boolean;
  isSliding: boolean;
  speed: number;
  spreadRatio: number;
  kills: number;
  deaths: number;
  score: number;
  streak: number;
  timeRemaining: number;
  hitMarkerType: 'none' | 'body' | 'head';
  hitMarkerSeq: number;
  damageFlash: number; // 0-1
  lastKillBanner: { victim: string; headshot: boolean; streak: number; seq: number } | null;
  killFeed: KillFeedItem[];
  scoreboard: ScoreboardEntry[];
  respawnTimer: number; // >0 if player is dead waiting to respawn
  pointerLocked: boolean;
}

export interface GameSettings {
  weaponId: WeaponId;
  mapId: MapId;
  difficulty: Difficulty;
  sensitivity: number; // 0.3 - 2.5
  fov: number; // 65 - 105
  muted: boolean;
  botCount: number; // 4 - 8
}
