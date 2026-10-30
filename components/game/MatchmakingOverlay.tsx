'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Layers,
  MapPin,
  Play,
  PlusCircle,
  Shield,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { SectionModal } from '@/components/ui/SectionModal';
import { clientConnection } from '@/lib/client-connection';
import { AI_CONTENDER_PROFILES, MAX_MATCH_CONTENDERS } from '@/lib/constants';
import { PlayerProfile } from '@/types/game';

export interface BermudaDropZone {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  z: number;
  lootTier: string;
}

export const BERMUDA_DROP_ZONES: BermudaDropZone[] = [
  {
    id: 'bimasakti',
    name: 'Bimasakti Strip',
    subtitle: 'Central Highway Crossroads · Love-Vend Access',
    x: 0,
    z: 8,
    lootTier: 'High Traffic · Fast Action',
  },
  {
    id: 'clock_tower',
    name: 'Clock Tower',
    subtitle: 'North-West Brick Spire & Courtyard',
    x: -22,
    z: -30,
    lootTier: 'Epic & Sniper Loot',
  },
  {
    id: 'factory',
    name: 'Factory Container Yard',
    subtitle: 'East Industrial Shipping Containers & Dock',
    x: 34,
    z: 14,
    lootTier: 'Shotgun & AR Hot-Drop',
  },
  {
    id: 'pochinok',
    name: 'Pochinok Compound',
    subtitle: 'Two-Story Stucco Tactical Buildings',
    x: 20,
    z: -16,
    lootTier: 'Balanced Tactical Cover',
  },
];

interface MatchmakingOverlayProps {
  profile: PlayerProfile;
  onlineHumanNames: string[];
  selectedDropZone: BermudaDropZone;
  onSelectDropZone: (zone: BermudaDropZone) => void;
  allowBots: boolean;
  onToggleAllowBots: (allow: boolean) => void;
  activeRoomCode: string;
  onRoomSynced: (roomCode: string, humanNames: string[]) => void;
  onLaunchMatch: () => void;
  onCancel: () => void;
}

export function MatchmakingOverlay({
  profile,
  onlineHumanNames,
  selectedDropZone,
  onSelectDropZone,
  allowBots,
  onToggleAllowBots,
  activeRoomCode,
  onRoomSynced,
  onLaunchMatch,
  onCancel,
}: MatchmakingOverlayProps) {
  const [roomCode, setRoomCode] = useState<string>(activeRoomCode || 'ROOM-101');
  const [roomNumber, setRoomNumber] = useState<number>(101);
  const [isCustomRoom, setIsCustomRoom] = useState<boolean>(false);
  const [activeMatchRoomsCount, setActiveMatchRoomsCount] = useState<number>(1);
  const [roomHumanPlayers, setRoomHumanPlayers] = useState<
    { playerId: string; displayName: string; badge: string }[]
  >([
    {
      playerId: profile.id,
      displayName: profile.displayName || 'Mohammad',
      badge: profile.titleBadge,
    },
  ]);

  const [friendCodeInput, setFriendCodeInput] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Gradual bot backfill state (waits for real players first, then adds 1 bot at a time if allowBots is true)
  const [searchElapsedDone, setSearchElapsedDone] = useState<boolean>(false);
  const [botBackfillCount, setBotBackfillCount] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const syncWithServerRoom = useCallback(
    async (opts?: { requestedRoomCode?: string; createNewFriendRoom?: boolean }) => {
      const res = await clientConnection.joinOrSyncMatchmakingRoom(profile, opts);
      if (!res) return;
      setRoomCode(res.room.roomCode);
      setRoomNumber(res.room.roomNumber);
      setIsCustomRoom(res.room.isCustomRoom);
      setActiveMatchRoomsCount(res.activeMatchRoomsCount);

      const humans = res.room.players.map((p) => ({
        playerId: p.playerId,
        displayName: p.displayName || 'Mohammad',
        badge: p.badge || 'Solo Contender',
      }));
      setRoomHumanPlayers(humans);
      onRoomSynced(
        res.room.roomCode,
        humans.map((h) => h.displayName)
      );
    },
    [onRoomSynced, profile]
  );

  // Sync with server matchmaking room on mount & every 2 seconds while queuing
  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      syncWithServerRoom(
        activeRoomCode ? { requestedRoomCode: activeRoomCode } : undefined
      );
    }, 0);

    const pollInterval = window.setInterval(() => {
      syncWithServerRoom({ requestedRoomCode: roomCode });
    }, 2000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(pollInterval);
    };
  }, [activeRoomCode, roomCode, syncWithServerRoom]);

  // Step 1: Wait 2.0 seconds searching for real human players before starting gradual bot entry
  useEffect(() => {
    const searchTimer = window.setTimeout(() => {
      setSearchElapsedDone(true);
    }, 2000);
    return () => window.clearTimeout(searchTimer);
  }, [roomCode]);

  // Combine server room human players + any other online humans
  const humanPlayersList = React.useMemo(() => {
    const map = new Map<string, { name: string; badge: string; isLocal: boolean }>();
    const localName = profile.displayName || 'Mohammad';
    map.set(localName, {
      name: localName,
      badge: profile.titleBadge,
      isLocal: true,
    });

    for (const rp of roomHumanPlayers) {
      if (!map.has(rp.displayName) && map.size < MAX_MATCH_CONTENDERS) {
        map.set(rp.displayName, {
          name: rp.displayName,
          badge: rp.badge,
          isLocal: rp.playerId === profile.id,
        });
      }
    }

    if (!isCustomRoom) {
      for (const name of onlineHumanNames) {
        if (name && !map.has(name) && map.size < MAX_MATCH_CONTENDERS) {
          map.set(name, {
            name,
            badge: 'Live Player',
            isLocal: false,
          });
        }
      }
    }

    return Array.from(map.values()).slice(0, MAX_MATCH_CONTENDERS);
  }, [isCustomRoom, onlineHumanNames, profile.displayName, profile.id, profile.titleBadge, roomHumanPlayers]);

  const maxBotsNeeded = Math.max(0, MAX_MATCH_CONTENDERS - humanPlayersList.length);
  const effectiveBotCount = allowBots
    ? Math.min(botBackfillCount, maxBotsNeeded)
    : 0;
  const totalFilledSlots = humanPlayersList.length + effectiveBotCount;

  // Step 2: Gradual bot entry (1 bot every 650ms) ONLY when allowBots is true
  useEffect(() => {
    if (!allowBots) {
      return;
    }
    if (!searchElapsedDone) return;

    if (effectiveBotCount < maxBotsNeeded) {
      const botTimer = window.setTimeout(() => {
        setBotBackfillCount((prev) => Math.min(maxBotsNeeded, prev + 1));
      }, 650);
      return () => window.clearTimeout(botTimer);
    }
  }, [allowBots, effectiveBotCount, maxBotsNeeded, searchElapsedDone]);

  // Step 3: Countdown when 10/10 slots are filled
  useEffect(() => {
    if (totalFilledSlots < MAX_MATCH_CONTENDERS) {
      return;
    }
    if (countdown === null) {
      const startTimer = window.setTimeout(() => setCountdown(3), 150);
      return () => window.clearTimeout(startTimer);
    }
    if (countdown > 0) {
      const tick = window.setTimeout(() => setCountdown(countdown - 1), 850);
      return () => window.clearTimeout(tick);
    }
    const launchTimer = window.setTimeout(() => {
      clientConnection.notifyMatchLaunched(roomCode);
      onLaunchMatch();
    }, 150);
    return () => window.clearTimeout(launchTimer);
  }, [countdown, onLaunchMatch, roomCode, totalFilledSlots]);

  const handleToggleBotsCheckbox = (checked: boolean) => {
    onToggleAllowBots(checked);
    setCountdown(null);
    if (!checked) {
      setBotBackfillCount(0);
    }
  };

  const handleCreateFriendRoom = async () => {
    setSearchElapsedDone(false);
    setBotBackfillCount(0);
    setCountdown(null);
    await syncWithServerRoom({ createNewFriendRoom: true });
  };

  const handleJoinFriendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendCodeInput.trim()) return;
    setSearchElapsedDone(false);
    setBotBackfillCount(0);
    setCountdown(null);
    await syncWithServerRoom({ requestedRoomCode: friendCodeInput.trim() });
    setFriendCodeInput('');
  };

  const handleCopyRoomCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(roomCode).catch(() => {});
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Build 10-slot display roster
  const roster = Array.from({ length: MAX_MATCH_CONTENDERS }, (_, idx) => {
    if (idx < humanPlayersList.length) {
      const h = humanPlayersList[idx];
      return {
        slot: idx + 1,
        name: h.name,
        badge: h.badge,
        isHuman: true,
        isLocal: h.isLocal,
        isJoined: true,
      };
    }

    const botIndex = idx - humanPlayersList.length;
    if (allowBots && botIndex < effectiveBotCount) {
      const ai = AI_CONTENDER_PROFILES[botIndex % AI_CONTENDER_PROFILES.length];
      return {
        slot: idx + 1,
        name: `${ai.name}(bot)`,
        badge: ai.badge,
        isHuman: false,
        isLocal: false,
        isJoined: true,
      };
    }

    return {
      slot: idx + 1,
      name: '',
      badge: '',
      isHuman: false,
      isLocal: false,
      isJoined: false,
    };
  });

  const statusHeadline =
    totalFilledSlots >= MAX_MATCH_CONTENDERS
      ? `Room ${roomCode} Full (10/10) — Deploying in ${countdown ?? 3}s`
      : !allowBots
        ? `Waiting for Real Players in ${roomCode} (${humanPlayersList.length}/10 Players · Bots Disabled)`
        : !searchElapsedDone
          ? `Searching for Real Players in ${roomCode} (${humanPlayersList.length}/10)...`
          : `Filling Remaining Slots with Bots (${totalFilledSlots}/10)...`;

  return (
    <SectionModal
      kicker={`Bermuda Solo Matchmaking · Instance #${roomNumber} (${roomCode})`}
      title={statusHeadline}
      maxWidthClass="max-w-5xl"
      headerRight={
        <div className="flex items-center gap-2">
          <div
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-sky-400 flex items-center gap-1.5"
            title="Each match holds 10 players. When 10 players are in a match, additional players automatically start a new 10-player match room!"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{activeMatchRoomsCount} Active 10P Room(s)</span>
          </div>
          <div className="px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono tabular-nums text-emerald-400 flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>
              {totalFilledSlots} / {MAX_MATCH_CONTENDERS} Ready
            </span>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left 7 Columns: Friend Room Invite Bar + Bot Toggle Checkbox + 10-Player Roster */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-4">
          {/* Play With Friends & Multi-Room Instance Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-xs font-bold text-white">
                  Play With Friends — Room Code:
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/50 font-mono font-bold text-xs text-rose-300">
                  {roomCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRoomCode}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-[11px] text-slate-200 flex items-center gap-1 transition-colors"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleCreateFriendRoom}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] font-semibold text-amber-300 flex items-center gap-1 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create Friend Room</span>
              </button>
            </div>

            <form
              onSubmit={handleJoinFriendCode}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value)}
                placeholder="Enter friend's Room Code (e.g. FF-101 or FRIEND1)..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
              >
                Join Friend Room
              </button>
            </form>

            <div className="text-[11px] text-slate-400 leading-snug">
              Share your Room Code with friends so they join your 10-player
              match. If a room already has 10 players, new players automatically
              start a separate 10-player match room!
            </div>
          </div>

          {/* Per-Player Allow Bots Checkbox */}
          <label className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex items-start gap-3 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={allowBots}
              onChange={(e) => handleToggleBotsCheckbox(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-rose-500 rounded cursor-pointer"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-rose-400" />
                  <span>Allow Bots to Fill Empty Slots (Up to 10 Players)</span>
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    allowBots
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {allowBots ? 'BOTS ALLOWED' : 'REAL PLAYERS ONLY'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Applies only to <strong>your</strong> match. If unchecked, zero
                bots will enter your match (other players can still start their
                own matches with bots).
              </p>
            </div>
          </label>

          {/* 10-Player Matchmaking Roster */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>
                10-Player Solo Roster ({humanPlayersList.length} Real ·{' '}
                {effectiveBotCount} Bot)
              </span>
              <span className="font-mono">200 Max HP · 50 Bot DMG Cap</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {roster.map((entry) => (
                <div
                  key={entry.slot}
                  className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                    !entry.isJoined
                      ? 'bg-slate-900/40 border-slate-800/60 text-slate-500'
                      : entry.isLocal
                        ? 'bg-rose-950/40 border-rose-500/60 text-white'
                        : entry.isHuman
                          ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-100'
                          : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono tabular-nums text-slate-400 w-5">
                      #{entry.slot}
                    </span>
                    {entry.isJoined ? (
                      <div className="truncate">
                        <div className="font-semibold truncate">
                          {entry.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {entry.badge} ·{' '}
                          {entry.isHuman ? 'Real Player' : 'AI Bot'}
                        </div>
                      </div>
                    ) : (
                      <span className="italic text-slate-500">
                        {allowBots
                          ? 'Searching player / bot...'
                          : 'Waiting for real player...'}
                      </span>
                    )}
                  </div>
                  {entry.isJoined && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400">
            <Shield className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              <strong>Fair-Play Protection:</strong> Bots have a{' '}
              <strong className="text-slate-200">50 maximum damage</strong>{' '}
              ability and never eliminate you or other bots.
            </span>
          </div>
        </div>

        {/* Right 5 Columns: Bermuda Drop Zone Selector & Launch Controls */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-3">
              <MapPin className="w-4 h-4" />
              <span>Select Bermuda Map Drop Zone</span>
            </div>

            <div className="flex flex-col gap-2">
              {BERMUDA_DROP_ZONES.map((zone) => {
                const isSelected = selectedDropZone.id === zone.id;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => onSelectDropZone(zone)}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      isSelected
                        ? 'bg-rose-950/50 border-rose-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold">{zone.name}</span>
                      <span className="text-[10px] font-mono text-amber-400">
                        {zone.lootTier}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {zone.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4 mt-4 border-t border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Leave Queue</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  clientConnection.notifyMatchLaunched(roomCode);
                  onLaunchMatch();
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  Drop Now (
                  {allowBots
                    ? '10 Contenders'
                    : `${humanPlayersList.length} Real Player${
                        humanPlayersList.length > 1 ? 's' : ''
                      }`}
                  )
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </SectionModal>
  );
}
