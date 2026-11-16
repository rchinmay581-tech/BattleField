import { Volume2, VolumeX } from 'lucide-react';
import {
  MAP_METAS,
  WEAPON_SPECS,
  type Difficulty,
  type GamePhase,
  type GameSettings,
  type MapId,
  type WeaponId,
} from '../game/types';

interface LobbyMenuProps {
  phase: Extract<GamePhase, 'menu' | 'paused'>;
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onPlayOrResume: () => void;
  onRestartMatch: () => void;
}

const WEAPON_ORDER: WeaponId[] = ['triggerman', 'hunter', 'runngun', 'vince'];
const MAP_ORDER: MapId[] = ['burg', 'cargo'];
const DIFFICULTIES: Array<{ id: Difficulty; label: string }> = [
  { id: 'casual', label: 'Casual' },
  { id: 'competitive', label: 'Competitive' },
  { id: 'nightmare', label: 'Nightmare' },
];

export function LobbyMenu({
  phase,
  settings,
  onUpdateSettings,
  onPlayOrResume,
  onRestartMatch,
}: LobbyMenuProps) {
  const activeWeapon = WEAPON_SPECS[settings.weaponId];

  const patch = (partial: Partial<GameSettings>) => {
    onUpdateSettings({ ...settings, ...partial });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-zinc-950/72 p-4 md:p-8 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-xl bg-zinc-950/94 border border-white/12 p-6 md:p-8 shadow-2xl">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white">
              VOXSTRIKE
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {phase === 'paused'
                ? 'Match paused · Switch class or adjust settings anytime'
                : 'Fast-paced 3D voxel arena FPS · Slide-hop for peak momentum'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => patch({ muted: !settings.muted })}
              aria-label={settings.muted ? 'Unmute audio' : 'Mute audio'}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              {settings.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            {phase === 'paused' && (
              <button
                type="button"
                onClick={onRestartMatch}
                className="rounded-lg border border-white/15 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Restart Match
              </button>
            )}

            <button
              type="button"
              onClick={onPlayOrResume}
              className="rounded-lg bg-amber-500 px-7 py-2.5 font-display text-base font-bold text-zinc-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {phase === 'paused' ? 'Resume Match' : 'Deploy to Arena'}
            </button>
          </div>
        </div>

        {/* Main 2-Column Configuration Grid */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Class Selection (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold text-white">Select Class</h2>
              <span className="text-xs text-zinc-400">
                {activeWeapon.maxHp} HP · {activeWeapon.magSize} Mag
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {WEAPON_ORDER.map((id) => {
                const w = WEAPON_SPECS[id];
                const selected = settings.weaponId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => patch({ weaponId: id })}
                    className={`text-left rounded-lg p-4 border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-zinc-900 border-amber-500'
                        : 'bg-zinc-900/55 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-base font-bold text-white">
                        {w.className}
                      </span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: w.accentColor }}
                      >
                        {w.weaponName}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{w.role}</p>

                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-zinc-400">
                      <StatBar label="Damage" value={w.stats.damage} accent={w.accentColor} />
                      <StatBar label="Fire Rate" value={w.stats.fireRate} accent={w.accentColor} />
                      <StatBar label="Mobility" value={w.stats.mobility} accent={w.accentColor} />
                      <StatBar label="Range" value={w.stats.range} accent={w.accentColor} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Controls Strip */}
            <div className="mt-1 rounded-lg bg-zinc-900/65 border border-white/10 px-4 py-3">
              <div className="text-xs font-semibold text-zinc-300 mb-2">Controls</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1.5 gap-x-4 text-xs text-zinc-400">
                <div>
                  <span className="font-mono text-zinc-200">WASD</span> Move
                </div>
                <div>
                  <span className="font-mono text-zinc-200">Space</span> Jump
                </div>
                <div>
                  <span className="font-mono text-zinc-200">Shift / C</span> Slide-Hop
                </div>
                <div>
                  <span className="font-mono text-zinc-200">Enter / Click</span> Fire
                </div>
                <div>
                  <span className="font-mono text-zinc-200">Right Click</span> Aim / Scope
                </div>
                <div>
                  <span className="font-mono text-zinc-200">R / Tab</span> Reload / Scores
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Arena & Tuning (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div>
              <h2 className="font-display text-lg font-bold text-white mb-3">Arena Map</h2>
              <div className="flex flex-col gap-2.5">
                {MAP_ORDER.map((mId) => {
                  const m = MAP_METAS[mId];
                  const selected = settings.mapId === mId;
                  return (
                    <button
                      key={mId}
                      type="button"
                      onClick={() => patch({ mapId: mId })}
                      className={`text-left rounded-lg p-3.5 border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-zinc-900 border-amber-500'
                          : 'bg-zinc-900/55 border-white/10 hover:border-white/25'
                      }`}
                    >
                      <div className="font-display text-sm font-bold text-white">
                        {m.name}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-400">{m.subtitle}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-zinc-300 mb-2">Bot Difficulty</div>
              <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-zinc-900 p-1 border border-white/10">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => patch({ difficulty: d.id })}
                    className={`rounded-md py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      settings.difficulty === d.id
                        ? 'bg-amber-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="flex flex-col gap-3.5 rounded-lg bg-zinc-900/65 border border-white/10 p-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-zinc-300 font-medium">Mouse Sensitivity</span>
                  <span className="font-mono tabular-nums text-zinc-200">
                    {settings.sensitivity.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={2.5}
                  step={0.1}
                  value={settings.sensitivity}
                  onChange={(e) => patch({ sensitivity: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-zinc-300 font-medium">Field of View (FOV)</span>
                  <span className="font-mono tabular-nums text-zinc-200">
                    {settings.fov}°
                  </span>
                </div>
                <input
                  type="range"
                  min={65}
                  max={105}
                  step={1}
                  value={settings.fov}
                  onChange={(e) => patch({ fov: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-zinc-300 font-medium">Arena Bots</span>
                  <span className="font-mono tabular-nums text-zinc-200">
                    {settings.botCount}
                  </span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={8}
                  step={1}
                  value={settings.botCount}
                  onChange={(e) => patch({ botCount: parseInt(e.target.value, 10) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBar({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span>{label}</span>
      </div>
      <div className="h-1.5 w-full rounded-sm bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-sm"
          style={{ width: `${value}%`, backgroundColor: accent }}
        />
      </div>
    </div>
  );
}
