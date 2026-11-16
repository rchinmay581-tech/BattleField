import { WEAPON_SPECS, type ScoreboardEntry } from '../game/types';

interface ScoreboardProps {
  entries: ScoreboardEntry[];
  isEndScreen: boolean;
  onPlayAgain?: () => void;
  onReturnMenu?: () => void;
}

export function Scoreboard({
  entries,
  isEndScreen,
  onPlayAgain,
  onReturnMenu,
}: ScoreboardProps) {
  const winner = entries[0];

  return (
    <div
      className={`fixed inset-0 z-30 flex items-center justify-center p-6 ${
        isEndScreen ? 'bg-zinc-950/82 pointer-events-auto' : 'bg-zinc-950/55 pointer-events-none'
      }`}
    >
      <div className="w-full max-w-2xl rounded-xl bg-zinc-950/94 border border-white/15 p-6 shadow-2xl">
        <div className="flex items-baseline justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              {isEndScreen ? 'Match Complete' : 'Live Scoreboard'}
            </h2>
            {isEndScreen && winner && (
              <p className="mt-1 text-sm text-zinc-400">
                Winner: <span className="font-semibold text-amber-400">{winner.name}</span> ·{' '}
                <span className="font-mono tabular-nums">{winner.score} pts</span>
              </p>
            )}
          </div>
          <span className="text-xs font-medium text-zinc-400">Free-For-All</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs font-medium text-zinc-400">
                <th className="py-2.5 pr-3">#</th>
                <th className="py-2.5 pr-3">Player</th>
                <th className="py-2.5 pr-3">Class</th>
                <th className="py-2.5 px-3 text-right">Kills</th>
                <th className="py-2.5 px-3 text-right">Deaths</th>
                <th className="py-2.5 pl-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entries.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className={
                    entry.isPlayer
                      ? 'bg-amber-500/12 text-white font-semibold'
                      : 'text-zinc-300'
                  }
                >
                  <td className="py-2.5 pr-3 font-mono text-xs tabular-nums text-zinc-400">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className={entry.isPlayer ? 'text-amber-400' : 'text-zinc-100'}>
                      {entry.name}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-zinc-400">
                    {WEAPON_SPECS[entry.weaponId].className}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {entry.kills}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-zinc-400">
                    {entry.deaths}
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono font-bold tabular-nums text-white">
                    {entry.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isEndScreen && (
          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onReturnMenu}
              className="rounded-lg border border-white/15 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Change Loadout
            </button>
            <button
              type="button"
              onClick={onPlayAgain}
              className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
