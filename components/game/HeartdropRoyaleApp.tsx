'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { ArenaActionHandle, ArenaCanvas } from '@/components/game/ArenaCanvas';
import { BottomControlDock } from '@/components/game/BottomControlDock';
import { CombatHud } from '@/components/game/CombatHud';
import {
  BERMUDA_DROP_ZONES,
  BermudaDropZone,
  MatchmakingOverlay,
} from '@/components/game/MatchmakingOverlay';
import { MatchSummaryModal } from '@/components/game/MatchSummaryModal';
import { TopThreeRewardModal } from '@/components/game/TopThreeRewardModal';
import { SectionModal } from '@/components/ui/SectionModal';
import { clientConnection } from '@/lib/client-connection';
import {
  MAX_COMPANION_DAMAGE,
  MAX_MATCH_CONTENDERS,
  MAX_PLAYER_HP,
  MAX_PLAYER_SHIELD,
  STORM_PHASES,
  SYNERGY_BUFFS,
  WEAPONS_CATALOG,
} from '@/lib/constants';
import { generateId } from '@/lib/game-utils';
import { soundFX } from '@/lib/sound-effects';
import {
  ChatMessage,
  CombatHudSnapshot,
  GameScreenState,
  GirlPersonaId,
  LeaderboardEntry,
  MatchSummaryStats,
  PlayerProfile,
} from '@/types/game';

const PROFILE_STORAGE_KEY = 'heartdrop_royale_profile_v1';

const DEFAULT_PROFILE: PlayerProfile = {
  id: 'player_local',
  displayName: 'Mohammad',
  avatarColor: '#F43F5E',
  visorColor: '#22D3EE',
  outfitStyle: 'valkyrie',
  titleBadge: 'Solo Contender',
  quizCompleted: false,
  activeSynergyBuff: 'companion_sync',
  compatibilityScore: 520,
  unlockedCuteGirl: false,
  selectedCompanion: 'dog',
  selectedGirlPersona: 'aiko',
  matchesPlayed: 0,
  wins: 0,
  top3Finishes: 0,
  totalKills: 0,
  totalDamage: 0,
  bestSurvivalSeconds: 0,
};

const INITIAL_HUD: CombatHudSnapshot = {
  hp: MAX_PLAYER_HP,
  maxHp: MAX_PLAYER_HP,
  shield: 25,
  maxShield: MAX_PLAYER_SHIELD,
  botDamageTakenByPlayer: 0,
  maxBotDamageAllowed: MAX_COMPANION_DAMAGE,
  weapon: WEAPONS_CATALOG.crimson_ar,
  weapons: [WEAPONS_CATALOG.crimson_ar, WEAPONS_CATALOG.cupid_sniper],
  activeWeaponIndex: 0,
  aliveCount: MAX_MATCH_CONTENDERS,
  totalContenders: MAX_MATCH_CONTENDERS,
  kills: 0,
  damageDealt: 0,
  companion: null,
  storm: {
    phase: 1,
    maxPhases: STORM_PHASES.length,
    currentRadius: STORM_PHASES[0].startRadius,
    targetRadius: STORM_PHASES[0].targetRadius,
    centerX: 0,
    centerZ: 0,
    timeRemainingSec: STORM_PHASES[0].durationSec,
    damagePerSecond: STORM_PHASES[0].damagePerSec,
    isShrinking: false,
  },
  nearbyVending: null,
  nearbyShrine: null,
  nearbyLoot: null,
  activeBuff: SYNERGY_BUFFS.companion_sync,
  outsideStorm: false,
  killFeed: [],
  killBanner: null,
  isPointerLocked: false,
  isAds: false,
  isSprinting: false,
  zoomLevel: 1,
  pitchDeg: 0,
  currentZoneName: 'Bimasakti Strip',
  playerPos: { x: 0, z: 8, rotationY: Math.PI },
  contenderRadar: [],
  vendingRadar: [],
};

export function HeartdropRoyaleApp() {
  const [screenState, setScreenState] = useState<GameScreenState>(
    GameScreenState.TITLE
  );
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);
  const [selectedDropZone, setSelectedDropZone] = useState<BermudaDropZone>(
    BERMUDA_DROP_ZONES[0]
  );
  const [matchSeed, setMatchSeed] = useState<number>(1);
  const [hud, setHud] = useState<CombatHudSnapshot>(INITIAL_HUD);
  const [lastSummary, setLastSummary] = useState<MatchSummaryStats | null>(
    null
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [maxPoolSize, setMaxPoolSize] = useState<number>(60);
  const [onlineHumanNames, setOnlineHumanNames] = useState<string[]>([]);
  const [roomHumanNames, setRoomHumanNames] = useState<string[]>([]);
  const [activeRoomCode, setActiveRoomCode] = useState<string>('');
  const [allowBots, setAllowBots] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const actionRef = useRef<ArenaActionHandle | null>(null);
  const profileRef = useRef<PlayerProfile>(profile);
  const screenStateRef = useRef<GameScreenState>(screenState);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    screenStateRef.current = screenState;
  }, [screenState]);

  // Load persisted profile, per-player allowBots preference, & bind connection pool disconnect cleanup
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
          setProfile((prev) => ({
            ...prev,
            ...parsed,
            id: parsed.id || generateId('plr'),
          }));
        } else {
          const freshId = generateId('plr');
          setProfile((prev) => ({ ...prev, id: freshId }));
        }

        const savedAllowBots = window.localStorage.getItem(
          'heartdrop_allow_bots_v1'
        );
        if (savedAllowBots !== null) {
          setAllowBots(savedAllowBots === 'true');
        }
      } catch {
        // Fallback to default profile
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
      clientConnection.disconnectImmediate();
    };
  }, []);

  const handleToggleAllowBots = useCallback((nextAllow: boolean) => {
    setAllowBots(nextAllow);
    try {
      window.localStorage.setItem(
        'heartdrop_allow_bots_v1',
        nextAllow ? 'true' : 'false'
      );
    } catch {
      // Ignore storage error
    }
  }, []);

  const handleRoomSynced = useCallback(
    (code: string, humanNames: string[]) => {
      setActiveRoomCode(code);
      setRoomHumanNames(humanNames);
    },
    []
  );

  const updateProfile = useCallback(
    (updater: (prev: PlayerProfile) => PlayerProfile) => {
      setProfile((prev) => {
        const next = updater(prev);
        try {
          window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
        return next;
      });
    },
    []
  );

  // Pooled real-time lobby sync + leaderboard fetch
  useEffect(() => {
    let active = true;

    const runSync = async () => {
      const currentProfile = profileRef.current;
      const inMatch = screenStateRef.current === GameScreenState.PLAYING;
      const syncData = await clientConnection.syncLobbyState(
        currentProfile,
        inMatch
      );
      if (!active || !syncData) return;
      setChatMessages(syncData.chatMessages);
      setOnlineCount(syncData.onlineCount);
      setMaxPoolSize(syncData.maxPoolSize);
      setOnlineHumanNames(
        syncData.onlinePlayers.map((p) => p.displayName).filter(Boolean)
      );
    };

    const loadBoard = async () => {
      const entries = await clientConnection.fetchLeaderboard();
      if (active && entries.length > 0) {
        setLeaderboard(entries);
      }
    };

    runSync();
    loadBoard();

    const interval = window.setInterval(runSync, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  // Enter the 10-Player Matchmaking Queue first
  const handleEnterMatchmaking = useCallback(() => {
    setScreenState(GameScreenState.MATCHMAKING);
  }, []);

  // Launch from Matchmaking into the active 3D Bermuda Arena
  const handleLaunchMatchFromQueue = useCallback(() => {
    setMatchSeed((s) => s + 1);
    setScreenState(GameScreenState.PLAYING);
  }, []);

  // Global keyboard shortcuts for Title Screen (Enter/Space to Start Matchmaking) and Pause (Escape)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) {
        return;
      }
      if (
        screenState === GameScreenState.TITLE &&
        (e.code === 'Enter' || e.code === 'Space')
      ) {
        e.preventDefault();
        handleEnterMatchmaking();
      } else if (
        screenState === GameScreenState.PLAYING &&
        e.code === 'Escape'
      ) {
        e.preventDefault();
        setScreenState(GameScreenState.PAUSED);
      } else if (
        screenState === GameScreenState.PAUSED &&
        e.code === 'Escape'
      ) {
        e.preventDefault();
        setScreenState(GameScreenState.PLAYING);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleEnterMatchmaking, screenState]);

  const handleMatchComplete = useCallback(
    async (summary: MatchSummaryStats) => {
      setLastSummary(summary);
      setScreenState(GameScreenState.SUMMARY);

      const isTop3 = summary.placement <= 3;
      const isWin = summary.placement === 1;

      updateProfile((prev) => {
        const newlyUnlockedGirl = prev.unlockedCuteGirl || isTop3;
        return {
          ...prev,
          matchesPlayed: prev.matchesPlayed + 1,
          wins: prev.wins + (isWin ? 1 : 0),
          top3Finishes: prev.top3Finishes + (isTop3 ? 1 : 0),
          totalKills: prev.totalKills + summary.kills,
          totalDamage: prev.totalDamage + summary.damageDealt,
          bestSurvivalSeconds: Math.max(
            prev.bestSurvivalSeconds,
            summary.survivalTimeSec
          ),
          compatibilityScore:
            prev.compatibilityScore + summary.compatibilityBonus,
          unlockedCuteGirl: newlyUnlockedGirl,
          selectedCompanion: isTop3 ? 'girl' : prev.selectedCompanion,
        };
      });

      const updatedBoard = await clientConnection.submitMatchResult({
        profile: {
          ...profileRef.current,
          unlockedCuteGirl: profileRef.current.unlockedCuteGirl || isTop3,
          compatibilityScore:
            profileRef.current.compatibilityScore + summary.compatibilityBonus,
        },
        placement: summary.placement,
        kills: summary.kills,
        damageDealt: summary.damageDealt,
      });

      if (updatedBoard.length > 0) {
        setLeaderboard(updatedBoard);
      }
    },
    [updateProfile]
  );

  const handleSendChat = useCallback(async (text: string) => {
    const msgs = await clientConnection.sendChatMessage(
      profileRef.current,
      text
    );
    if (msgs) {
      setChatMessages(msgs);
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = soundFX.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0B0F19]">
      {/* Persistent Isolated 3D WebGL Bermuda Arena Canvas */}
      <ArenaCanvas
        screenState={screenState}
        profile={profile}
        matchSeed={matchSeed}
        spawnCoords={{ x: selectedDropZone.x, z: selectedDropZone.z }}
        onlineHumanNames={
          roomHumanNames.length > 0 ? roomHumanNames : onlineHumanNames
        }
        allowBots={allowBots}
        onHudUpdate={setHud}
        onMatchComplete={handleMatchComplete}
        actionRef={actionRef}
      />

      {/* STATE 1: TITLE SCREEN & COLLAPSIBLE HUB DOCK */}
      {screenState === GameScreenState.TITLE && (
        <>
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center text-center w-full max-w-2xl px-4">
            <svg
              viewBox="0 0 560 96"
              className="w-full max-w-md h-auto drop-shadow-2xl"
              aria-label="Heartdrop Royale"
            >
              <defs>
                <linearGradient
                  id="hdrTitleGrad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#F43F5E" />
                  <stop offset="50%" stopColor="#FB7185" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>
              <path
                d="M280 10 C270 0, 250 2, 250 18 C250 32, 280 46, 280 54 C280 46, 310 32, 310 18 C310 2, 290 0, 280 10 Z"
                fill="url(#hdrTitleGrad)"
              />
              <text
                x="280"
                y="78"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="36"
                fontWeight="800"
                letterSpacing="3"
                fontFamily="var(--font-display), sans-serif"
              >
                HEARTDROP ROYALE
              </text>
            </svg>

            <p className="text-xs md:text-sm text-slate-300 mt-1 font-medium">
              Bermuda Solo Battle Royale (10P Rooms) · Friend Room Codes · 200 Max HP
            </p>

            <div className="mt-4 flex flex-col items-center gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={handleEnterMatchmaking}
                className="px-7 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl shadow-2xl transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Find 10-Player Solo Match / Play With Friends</span>
              </button>
              <span className="text-[11px] text-slate-300 bg-slate-950/80 border border-slate-800 px-3.5 py-1 rounded-lg font-mono">
                Shift Toggle Sprint · Space Jump · RMB Scope (2x/4x) · LMB Fire · F Loot
              </span>
            </div>
          </div>

          <BottomControlDock
            profile={profile}
            onUpdateProfile={updateProfile}
            onStartMatch={handleEnterMatchmaking}
            onOpenDateLounge={() =>
              setScreenState(GameScreenState.TOP_THREE_REWARD)
            }
            leaderboard={leaderboard}
            chatMessages={chatMessages}
            onSendChat={handleSendChat}
            onlineCount={onlineCount}
            maxPoolSize={maxPoolSize}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />
        </>
      )}

      {/* STATE 2: 10-PLAYER SOLO MATCHMAKING QUEUE, FRIEND ROOM CODE & ALLOW BOTS CHECKBOX */}
      {screenState === GameScreenState.MATCHMAKING && (
        <MatchmakingOverlay
          profile={profile}
          onlineHumanNames={onlineHumanNames}
          selectedDropZone={selectedDropZone}
          onSelectDropZone={setSelectedDropZone}
          allowBots={allowBots}
          onToggleAllowBots={handleToggleAllowBots}
          activeRoomCode={activeRoomCode}
          onRoomSynced={handleRoomSynced}
          onLaunchMatch={handleLaunchMatchFromQueue}
          onCancel={() => setScreenState(GameScreenState.TITLE)}
        />
      )}

      {/* STATE 3: ACTIVE 3D BERMUDA BATTLE ROYALE COMBAT HUD */}
      {screenState === GameScreenState.PLAYING && (
        <CombatHud
          hud={hud}
          profile={profile}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onPause={() => setScreenState(GameScreenState.PAUSED)}
          actionRef={actionRef}
        />
      )}

      {/* STATE 4: PAUSE MODAL */}
      {screenState === GameScreenState.PAUSED && (
        <SectionModal
          kicker="Match Paused"
          title="Heartdrop Royale — Bermuda Solo Arena"
          maxWidthClass="max-w-md"
        >
          <p className="text-xs text-slate-300 leading-relaxed mb-5">
            Click inside the 3D arena to lock your mouse for full 360° horizontal
            and vertical up/down aiming. Bots can deal at most 50 total damage
            to you and will never eliminate you.
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setScreenState(GameScreenState.PLAYING)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume Match (Esc)</span>
            </button>
            <button
              type="button"
              onClick={handleEnterMatchmaking}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Re-Queue Matchmaking</span>
            </button>
            <button
              type="button"
              onClick={() => setScreenState(GameScreenState.TITLE)}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              Leave Match to Bermuda Lobby
            </button>
          </div>
        </SectionModal>
      )}

      {/* STATE 5: ANIMATED POST-MATCH SUMMARY */}
      {screenState === GameScreenState.SUMMARY && lastSummary && (
        <MatchSummaryModal
          summary={lastSummary}
          unlockedCuteGirlAlready={profile.unlockedCuteGirl}
          onProceedToTop3Reward={() =>
            setScreenState(GameScreenState.TOP_THREE_REWARD)
          }
          onPlayAgain={handleEnterMatchmaking}
          onReturnToHub={() => setScreenState(GameScreenState.TITLE)}
        />
      )}

      {/* STATE 6: TOP 3 REWARD SHOWCASE (CUTE VIRTUAL GIRL) & VIRTUAL DATE LOUNGE */}
      {screenState === GameScreenState.TOP_THREE_REWARD && (
        <TopThreeRewardModal
          profile={profile}
          placement={lastSummary?.placement ?? 1}
          onSelectPersonaAndEquip={(personaId: GirlPersonaId) => {
            updateProfile((prev) => ({
              ...prev,
              unlockedCuteGirl: true,
              selectedCompanion: 'girl',
              selectedGirlPersona: personaId,
            }));
          }}
          onBonusAffinityEarned={(bonus: number) => {
            updateProfile((prev) => ({
              ...prev,
              compatibilityScore: prev.compatibilityScore + bonus,
            }));
          }}
          onPlayNextMatch={handleEnterMatchmaking}
          onReturnToHub={() => setScreenState(GameScreenState.TITLE)}
        />
      )}
    </main>
  );
}
