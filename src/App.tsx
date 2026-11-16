import { useEffect, useRef, useState } from 'react';
import { HudOverlay } from './components/HudOverlay';
import { LobbyMenu } from './components/LobbyMenu';
import { Scoreboard } from './components/Scoreboard';
import { GameEngine } from './game/engine';
import {
  WEAPON_SPECS,
  type DamagePopup,
  type GamePhase,
  type GameSettings,
  type HudSnapshot,
} from './game/types';

const INITIAL_SETTINGS: GameSettings = {
  weaponId: 'triggerman',
  mapId: 'burg',
  difficulty: 'competitive',
  sensitivity: 1.0,
  fov: 78,
  muted: false,
  botCount: 6,
};

const INITIAL_HUD: HudSnapshot = {
  hp: WEAPON_SPECS.triggerman.maxHp,
  maxHp: WEAPON_SPECS.triggerman.maxHp,
  ammo: WEAPON_SPECS.triggerman.magSize,
  maxAmmo: WEAPON_SPECS.triggerman.magSize,
  isReloading: false,
  reloadProgress: 0,
  isAds: false,
  isSliding: false,
  speed: 0,
  spreadRatio: 0,
  kills: 0,
  deaths: 0,
  score: 0,
  streak: 0,
  timeRemaining: 150,
  hitMarkerType: 'none',
  hitMarkerSeq: 0,
  damageFlash: 0,
  lastKillBanner: null,
  killFeed: [],
  scoreboard: [],
  respawnTimer: 0,
  pointerLocked: false,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [settings, setSettings] = useState<GameSettings>(INITIAL_SETTINGS);
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);
  const [tabHeld, setTabHeld] = useState(false);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const engine = new GameEngine(container, INITIAL_SETTINGS, {
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
      },
      onDamagePopup: (popup) => {
        setDamagePopups((prev) => [...prev.slice(-8), popup]);
        window.setTimeout(() => {
          setDamagePopups((prev) => prev.filter((p) => p.id !== popup.id));
        }, 420);
      },
      onPhaseChange: (nextPhase) => {
        setPhase(nextPhase);
        if (nextPhase !== 'playing') {
          setTabHeld(false);
        }
      },
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab' && phase === 'playing') {
        e.preventDefault();
        setTabHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setTabHeld(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [phase]);

  const handleUpdateSettings = (next: GameSettings) => {
    setSettings(next);
    engineRef.current?.updateSettings(next);
  };

  const handlePlayOrResume = () => {
    if (!engineRef.current) return;
    if (phase === 'menu') {
      engineRef.current.startNewMatch();
    } else {
      engineRef.current.setPhase('playing');
    }
  };

  const handleRestartMatch = () => {
    engineRef.current?.startNewMatch();
  };

  const handleOpenPause = () => {
    engineRef.current?.exitPointerLock();
    engineRef.current?.setPhase('paused');
  };

  const handleLockPointer = () => {
    engineRef.current?.requestPointerLock();
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-zinc-950">
      {/* Isolated WebGL Viewport Container */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {/* In-Game HUD */}
      {phase === 'playing' && (
        <HudOverlay
          hud={hud}
          weaponId={settings.weaponId}
          damagePopups={damagePopups}
          onLockPointer={handleLockPointer}
          onOpenPause={handleOpenPause}
        />
      )}

      {/* Tab-Held Scoreboard */}
      {phase === 'playing' && tabHeld && (
        <Scoreboard entries={hud.scoreboard} isEndScreen={false} />
      )}

      {/* Lobby / Pause Menu */}
      {(phase === 'menu' || phase === 'paused') && (
        <LobbyMenu
          phase={phase}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onPlayOrResume={handlePlayOrResume}
          onRestartMatch={handleRestartMatch}
        />
      )}

      {/* End-of-Match Summary */}
      {phase === 'ended' && (
        <Scoreboard
          entries={hud.scoreboard}
          isEndScreen={true}
          onPlayAgain={handleRestartMatch}
          onReturnMenu={() => engineRef.current?.setPhase('menu')}
        />
      )}
    </div>
  );
}
