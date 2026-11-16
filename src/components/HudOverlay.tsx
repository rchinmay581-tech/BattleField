import { WEAPON_SPECS, type DamagePopup, type HudSnapshot, type WeaponId } from '../game/types';
import { Crosshair } from './Crosshair';

interface HudOverlayProps {
  hud: HudSnapshot;
  weaponId: WeaponId;
  damagePopups: DamagePopup[];
  onLockPointer: () => void;
  onOpenPause: () => void;
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function HudOverlay({
  hud,
  weaponId,
  damagePopups,
  onLockPointer,
  onOpenPause,
}: HudOverlayProps) {
  const spec = WEAPON_SPECS[weaponId];
  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const isLowHp = hud.hp <= 30;
  const isLowAmmo = hud.ammo <= Math.max(1, Math.floor(hud.maxAmmo * 0.25));

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {/* Damage edge flash */}
      {hud.damageFlash > 0.01 && (
        <div
          className="fixed inset-0"
          style={{
            opacity: hud.damageFlash * 0.65,
            background:
              'radial-gradient(circle at center, transparent 52%, rgba(220, 38, 38, 0.72) 100%)',
          }}
        />
      )}

      {/* Floating damage numbers */}
      {damagePopups.map((p) => (
        <div
          key={p.id}
          className={`fixed -translate-x-1/2 -translate-y-1/2 font-mono text-sm font-bold tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
            p.headshot ? 'text-amber-300 text-base' : 'text-white'
          }`}
          style={{ left: p.x, top: p.y - 16 }}
        >
          {p.headshot ? `${p.amount}!` : p.amount}
        </div>
      ))}

      {/* Crosshair / Sniper Scope */}
      {hud.respawnTimer <= 0 && (
        <Crosshair
          weaponId={weaponId}
          isAds={hud.isAds}
          spreadRatio={hud.spreadRatio}
          hitMarkerType={hud.hitMarkerType}
          hitMarkerSeq={hud.hitMarkerSeq}
        />
      )}

      {/* Top-Left: Kill Feed */}
      <div className="fixed left-5 top-5 flex flex-col gap-1.5">
        {hud.killFeed.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded bg-zinc-950/78 px-3 py-1.5 text-xs border border-white/10"
          >
            <span
              className={`font-semibold ${
                item.isPlayerKiller ? 'text-amber-400' : 'text-zinc-100'
              }`}
            >
              {item.killer}
            </span>
            <span className="text-zinc-400 font-mono text-[11px]">
              [{item.weapon}
              {item.headshot ? ' · HS' : ''}]
            </span>
            <span
              className={`font-semibold ${
                item.isPlayerVictim ? 'text-rose-400' : 'text-zinc-200'
              }`}
            >
              {item.victim}
            </span>
          </div>
        ))}
      </div>

      {/* Top-Center: Match Timer & Score */}
      <div className="fixed left-1/2 top-5 -translate-x-1/2 flex items-center gap-5 rounded-lg bg-zinc-950/82 px-5 py-2 border border-white/10">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-zinc-400">Time</span>
          <span className="font-mono text-xl font-bold tabular-nums text-white">
            {formatTimer(hud.timeRemaining)}
          </span>
        </div>
        <div className="h-4 w-px bg-white/15" />
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-zinc-400">Kills</span>
          <span className="font-mono text-xl font-bold tabular-nums text-amber-400">
            {hud.kills}
          </span>
        </div>
        <div className="h-4 w-px bg-white/15" />
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-zinc-400">Score</span>
          <span className="font-mono text-lg font-bold tabular-nums text-zinc-100">
            {hud.score}
          </span>
        </div>
        {hud.streak >= 2 && (
          <>
            <div className="h-4 w-px bg-white/15" />
            <span className="font-display text-sm font-bold text-emerald-400 whitespace-nowrap">
              {hud.streak} Streak
            </span>
          </>
        )}
      </div>

      {/* Top-Right: Quick controls hint */}
      <div className="fixed right-5 top-5 flex items-center gap-2 pointer-events-auto">
        {!hud.pointerLocked && (
          <button
            type="button"
            onClick={onLockPointer}
            className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Click to Lock Mouse
          </button>
        )}
        <button
          type="button"
          onClick={onOpenPause}
          className="rounded-md bg-zinc-950/82 border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Menu [P]
        </button>
      </div>

      {/* Center Elimination Banner */}
      {hud.lastKillBanner && (
        <div
          key={hud.lastKillBanner.seq}
          className="animate-kill-banner fixed left-1/2 top-[22%] -translate-x-1/2 flex items-center gap-2.5 rounded-md bg-zinc-950/85 px-4 py-1.5 border border-amber-500/40"
        >
          <span className="font-display text-sm font-bold text-amber-400">
            {hud.lastKillBanner.headshot ? 'Headshot Elimination' : 'Eliminated'}
          </span>
          <span className="text-sm font-semibold text-white">
            {hud.lastKillBanner.victim}
          </span>
          <span className="font-mono text-xs font-bold tabular-nums text-zinc-300">
            +{hud.lastKillBanner.headshot ? 150 : 100}
          </span>
        </div>
      )}

      {/* Respawn Screen */}
      {hud.respawnTimer > 0 && (
        <div className="fixed inset-0 flex items-center justify-center bg-zinc-950/55">
          <div className="rounded-xl bg-zinc-950/90 border border-white/15 px-8 py-6 text-center">
            <div className="font-display text-2xl font-bold text-rose-400">
              Eliminated
            </div>
            <div className="mt-2 font-mono text-sm tabular-nums text-zinc-300">
              Respawning in {hud.respawnTimer.toFixed(1)}s
            </div>
          </div>
        </div>
      )}

      {/* Bottom-Left: Health & Slide-Hop Speedometer */}
      <div className="fixed bottom-6 left-6 flex flex-col gap-2.5 min-w-[230px]">
        <div className="flex items-center justify-between text-xs font-medium text-zinc-300 px-1">
          <span className="font-mono tabular-nums">
            {hud.speed.toFixed(1)} u/s
          </span>
          <span className={hud.isSliding ? 'text-amber-400 font-semibold' : 'text-zinc-400'}>
            {hud.isSliding ? 'Sliding' : 'Tab: Scoreboard'}
          </span>
        </div>
        <div className="rounded-lg bg-zinc-950/84 border border-white/10 p-3.5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Health</span>
            <span
              className={`font-mono text-2xl font-bold tabular-nums ${
                isLowHp ? 'text-rose-400' : 'text-white'
              }`}
            >
              {hud.hp}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-sm bg-zinc-800">
            <div
              className={`h-full transition-all duration-100 ${
                isLowHp ? 'bg-rose-500' : 'bg-emerald-400'
              }`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom-Right: Weapon & Ammo */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-2 min-w-[220px]">
        {hud.isReloading ? (
          <div className="w-full rounded-lg bg-zinc-950/84 border border-amber-500/40 px-4 py-3">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-400 mb-2">
              <span>Reloading</span>
              <span className="font-mono tabular-nums">
                {Math.round(hud.reloadProgress * 100)}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-sm bg-zinc-800">
              <div
                className="h-full bg-amber-400"
                style={{ width: `${hud.reloadProgress * 100}%` }}
              />
            </div>
          </div>
        ) : isLowAmmo && hud.ammo > 0 ? (
          <div className="rounded bg-zinc-950/82 px-2.5 py-1 text-xs font-medium text-amber-400 border border-amber-500/30">
            Press R to Reload
          </div>
        ) : null}

        <div className="w-full rounded-lg bg-zinc-950/84 border border-white/10 px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <div className="font-display text-sm font-bold text-white">
                {spec.weaponName}
              </div>
              <div className="text-xs text-zinc-400">{spec.className}</div>
            </div>
            <div className="flex items-baseline gap-1 font-mono tabular-nums">
              <span
                className={`text-3xl font-bold ${
                  hud.ammo === 0 ? 'text-rose-400' : 'text-white'
                }`}
              >
                {hud.ammo}
              </span>
              <span className="text-sm text-zinc-500">/ {hud.maxAmmo}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
