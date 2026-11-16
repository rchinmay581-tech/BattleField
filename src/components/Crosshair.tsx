import type { WeaponId } from '../game/types';

interface CrosshairProps {
  weaponId: WeaponId;
  isAds: boolean;
  spreadRatio: number;
  hitMarkerType: 'none' | 'body' | 'head';
  hitMarkerSeq: number;
}

export function Crosshair({
  weaponId,
  isAds,
  spreadRatio,
  hitMarkerType,
  hitMarkerSeq,
}: CrosshairProps) {
  const showSniperScope = weaponId === 'hunter' && isAds;

  if (showSniperScope) {
    return (
      <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
        {/* Crisp outer scope vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at center, transparent 28%, rgba(6, 8, 12, 0.96) 29%)',
          }}
        />
        {/* Mil-dot crosshairs */}
        <div className="relative h-[56vmin] w-[56vmin] rounded-full border-2 border-zinc-800">
          <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-zinc-900/90" />
          <div className="absolute bottom-0 top-0 left-1/2 w-px -translate-x-1/2 bg-zinc-900/90" />
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400" />
          {/* Range ticks */}
          <div className="absolute left-1/2 top-[34%] h-px w-4 -translate-x-1/2 bg-zinc-900" />
          <div className="absolute left-1/2 top-[66%] h-px w-4 -translate-x-1/2 bg-zinc-900" />
          <div className="absolute left-[34%] top-1/2 h-4 w-px -translate-y-1/2 bg-zinc-900" />
          <div className="absolute left-[66%] top-1/2 h-4 w-px -translate-y-1/2 bg-zinc-900" />
        </div>

        {hitMarkerType !== 'none' && (
          <HitMarker key={hitMarkerSeq} isHead={hitMarkerType === 'head'} />
        )}
      </div>
    );
  }

  const gap = Math.round(5 + spreadRatio * 14);
  const tickLen = weaponId === 'vince' ? 10 : 8;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
      <div className="relative h-16 w-16">
        {/* Center dot */}
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 bg-white shadow-[0_0_2px_rgba(0,0,0,0.9)]" />

        {/* Top tick */}
        <div
          className="absolute left-1/2 w-[2px] -translate-x-1/2 bg-white shadow-[0_0_2px_rgba(0,0,0,0.9)]"
          style={{
            height: `${tickLen}px`,
            bottom: `calc(50% + ${gap}px)`,
          }}
        />
        {/* Bottom tick */}
        <div
          className="absolute left-1/2 w-[2px] -translate-x-1/2 bg-white shadow-[0_0_2px_rgba(0,0,0,0.9)]"
          style={{
            height: `${tickLen}px`,
            top: `calc(50% + ${gap}px)`,
          }}
        />
        {/* Left tick */}
        <div
          className="absolute top-1/2 h-[2px] -translate-y-1/2 bg-white shadow-[0_0_2px_rgba(0,0,0,0.9)]"
          style={{
            width: `${tickLen}px`,
            right: `calc(50% + ${gap}px)`,
          }}
        />
        {/* Right tick */}
        <div
          className="absolute top-1/2 h-[2px] -translate-y-1/2 bg-white shadow-[0_0_2px_rgba(0,0,0,0.9)]"
          style={{
            width: `${tickLen}px`,
            left: `calc(50% + ${gap}px)`,
          }}
        />
      </div>

      {hitMarkerType !== 'none' && (
        <HitMarker key={hitMarkerSeq} isHead={hitMarkerType === 'head'} />
      )}
    </div>
  );
}

function HitMarker({ isHead }: { isHead: boolean }) {
  const color = isHead ? 'bg-amber-400' : 'bg-white';
  return (
    <div className="animate-hit-pop fixed left-1/2 top-1/2 h-8 w-8">
      <div className={`absolute left-1/2 top-0 h-2.5 w-[2px] -translate-x-1/2 rotate-45 ${color}`} />
      <div className={`absolute bottom-0 left-1/2 h-2.5 w-[2px] -translate-x-1/2 rotate-45 ${color}`} />
      <div className={`absolute left-0 top-1/2 h-[2px] w-2.5 -translate-y-1/2 rotate-45 ${color}`} />
      <div className={`absolute right-0 top-1/2 h-[2px] w-2.5 -translate-y-1/2 rotate-45 ${color}`} />
    </div>
  );
}
