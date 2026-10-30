import { ChatMessage, LeaderboardEntry } from '@/types/game';
import { generateId } from '@/lib/game-utils';
import { MAX_MATCH_CONTENDERS } from '@/lib/constants';

export interface PooledClientSession {
  sessionId: string;
  playerId: string;
  displayName: string;
  badge: string;
  inMatch: boolean;
  roomCode: string | null;
  connectedAt: number;
  lastActiveAt: number;
}

export interface RoomPlayerSlot {
  playerId: string;
  sessionId: string;
  displayName: string;
  badge: string;
  joinedAt: number;
  lastSeenAt: number;
}

export interface MatchRoomInstance {
  roomCode: string;
  roomNumber: number;
  isCustomRoom: boolean;
  status: 'queuing' | 'in_progress';
  maxPlayers: number; // Always 10 players per match instance (like Free Fire)
  players: RoomPlayerSlot[];
  createdAt: number;
  updatedAt: number;
}

const MAX_POOL_CONNECTIONS = 60;
const IDLE_TIMEOUT_MS = 45_000;
const MAX_CHAT_HISTORY = 50;

class BoundedDatabasePool {
  private activePool = new Map<string, PooledClientSession>();
  private matchRooms = new Map<string, MatchRoomInstance>();
  private nextRoomNumber = 101;
  private leaderboardIndex = new Map<string, LeaderboardEntry>();
  private sortedLeaderboardCache: LeaderboardEntry[] | null = null;
  private chatMessages: ChatMessage[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData(): void {
    const initialCompetitors: LeaderboardEntry[] = [
      {
        playerId: 'seed_1',
        displayName: 'NovaQueen',
        titleBadge: 'Top 3 Idol',
        wins: 14,
        top3Finishes: 29,
        kills: 86,
        damageDealt: 18420,
        compatibilityScore: 980,
        unlockedCuteGirl: true,
        updatedAt: Date.now() - 3600_000,
      },
      {
        playerId: 'seed_2',
        displayName: 'Kaito_FF',
        titleBadge: 'Heart Hunter',
        wins: 11,
        top3Finishes: 24,
        kills: 74,
        damageDealt: 15900,
        compatibilityScore: 910,
        unlockedCuteGirl: true,
        updatedAt: Date.now() - 5200_000,
      },
      {
        playerId: 'seed_3',
        displayName: 'SakuraSniper',
        titleBadge: 'Cupid Ace',
        wins: 9,
        top3Finishes: 21,
        kills: 68,
        damageDealt: 14250,
        compatibilityScore: 875,
        unlockedCuteGirl: true,
        updatedAt: Date.now() - 7800_000,
      },
      {
        playerId: 'seed_4',
        displayName: 'RyujinX',
        titleBadge: 'Solo Legend',
        wins: 6,
        top3Finishes: 15,
        kills: 51,
        damageDealt: 11200,
        compatibilityScore: 760,
        unlockedCuteGirl: true,
        updatedAt: Date.now() - 9400_000,
      },
      {
        playerId: 'seed_5',
        displayName: 'BlazeVortex',
        titleBadge: 'Storm Runner',
        wins: 2,
        top3Finishes: 7,
        kills: 29,
        damageDealt: 6840,
        compatibilityScore: 620,
        unlockedCuteGirl: false,
        updatedAt: Date.now() - 12400_000,
      },
    ];

    for (const entry of initialCompetitors) {
      this.leaderboardIndex.set(entry.playerId, entry);
    }

    this.chatMessages = [
      {
        id: 'msg_init_1',
        senderId: 'seed_1',
        senderName: 'NovaQueen',
        senderBadge: 'Top 3 Idol',
        text: 'Just unlocked Aiko Starlight from a Top 3 finish! Her 50 DMG beam at the Love-Vend machine is clutch.',
        timestamp: Date.now() - 180_000,
      },
      {
        id: 'msg_init_2',
        senderId: 'seed_2',
        senderName: 'Kaito_FF',
        senderBadge: 'Heart Hunter',
        text: 'Share your Room Code in chat if you want to drop into the same 10-player Bermuda lobby with friends!',
        timestamp: Date.now() - 95_000,
      },
      {
        id: 'msg_init_3',
        senderId: 'seed_3',
        senderName: 'SakuraSniper',
        senderBadge: 'Cupid Ace',
        text: 'Room #101 is full! Starting Room #102 now—anyone can queue or toggle bots on/off for their own match.',
        timestamp: Date.now() - 35_000,
      },
    ];
  }

  /**
   * Prunes stale connections and empty/inactive matchmaking rooms to keep memory and connections bounded.
   */
  private pruneIdleConnections(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.activePool.entries()) {
      if (now - session.lastActiveAt > IDLE_TIMEOUT_MS) {
        this.activePool.delete(sessionId);
      }
    }

    for (const [code, room] of this.matchRooms.entries()) {
      room.players = room.players.filter(
        (p) =>
          this.activePool.has(p.sessionId) &&
          now - p.lastSeenAt <= IDLE_TIMEOUT_MS
      );
      if (room.players.length === 0 && now - room.updatedAt > 60_000) {
        this.matchRooms.delete(code);
      }
    }
  }

  /**
   * Acquires or reuses a pooled connection slot for a client session.
   */
  public acquireConnection(
    sessionId: string,
    playerId: string,
    displayName: string,
    badge: string,
    inMatch = false
  ): PooledClientSession {
    this.pruneIdleConnections();

    const existing = this.activePool.get(sessionId);
    if (existing) {
      existing.displayName = displayName;
      existing.badge = badge;
      existing.inMatch = inMatch;
      existing.lastActiveAt = Date.now();
      return existing;
    }

    if (this.activePool.size >= MAX_POOL_CONNECTIONS) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [key, val] of this.activePool.entries()) {
        if (val.lastActiveAt < oldestTime) {
          oldestTime = val.lastActiveAt;
          oldestKey = key;
        }
      }
      if (oldestKey) {
        this.activePool.delete(oldestKey);
      }
    }

    const created: PooledClientSession = {
      sessionId,
      playerId,
      displayName,
      badge,
      inMatch,
      roomCode: null,
      connectedAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    this.activePool.set(sessionId, created);
    return created;
  }

  /**
   * Explicitly releases a client connection and removes them from any matchmaking room when leaving the site.
   */
  public releaseConnection(sessionId: string): boolean {
    const session = this.activePool.get(sessionId);
    if (session?.roomCode) {
      this.removePlayerFromRoom(sessionId, session.roomCode);
    }
    return this.activePool.delete(sessionId);
  }

  private removePlayerFromRoom(sessionId: string, roomCode: string): void {
    const room = this.matchRooms.get(roomCode);
    if (!room) return;
    room.players = room.players.filter((p) => p.sessionId !== sessionId);
    room.updatedAt = Date.now();
    if (room.players.length === 0) {
      this.matchRooms.delete(roomCode);
    }
  }

  /**
   * Free Fire Multi-Instance 10-Player Room System:
   * - If `requestedRoomCode` is provided (Friend Room Code), joins or creates that 10-player room.
   *   If that Friend Room is already full (10/10), overflows into a new room (`CODE-2`) so nobody is blocked!
   * - If no `requestedRoomCode` is provided (Public Matchmaking), finds the first open queuing public room
   *   with `< 10` players. If all existing rooms have 10 players or are already `in_progress`, automatically
   *   creates a new 10-player room (`FF-101`, `FF-102`, `FF-103`, etc.) so unlimited 10-player matches can run simultaneously!
   */
  public joinOrSyncMatchRoom(params: {
    sessionId: string;
    playerId: string;
    displayName: string;
    badge: string;
    requestedRoomCode?: string;
    createNewFriendRoom?: boolean;
  }): {
    room: MatchRoomInstance;
    activeMatchRoomsCount: number;
  } {
    this.pruneIdleConnections();
    const now = Date.now();
    const session = this.acquireConnection(
      params.sessionId,
      params.playerId,
      params.displayName,
      params.badge,
      false
    );

    let targetRoom: MatchRoomInstance | undefined;

    if (params.createNewFriendRoom) {
      // Generate a fresh 6-char friend room code
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const customCode = `FF-${randomNum}`;
      const roomNum = this.nextRoomNumber++;
      targetRoom = {
        roomCode: customCode,
        roomNumber: roomNum,
        isCustomRoom: true,
        status: 'queuing',
        maxPlayers: MAX_MATCH_CONTENDERS,
        players: [],
        createdAt: now,
        updatedAt: now,
      };
      this.matchRooms.set(customCode, targetRoom);
    } else if (params.requestedRoomCode && params.requestedRoomCode.trim()) {
      const normalized = params.requestedRoomCode.trim().toUpperCase();
      const existing = this.matchRooms.get(normalized);

      if (existing) {
        const alreadyIn = existing.players.some(
          (p) => p.sessionId === params.sessionId || p.playerId === params.playerId
        );
        if (alreadyIn || existing.players.length < MAX_MATCH_CONTENDERS) {
          targetRoom = existing;
        } else {
          // Requested room already has 10 players — spin up a new overflow 10-player instance so this player can still play!
          const overflowCode = `${normalized}-${this.nextRoomNumber}`;
          const roomNum = this.nextRoomNumber++;
          targetRoom = {
            roomCode: overflowCode,
            roomNumber: roomNum,
            isCustomRoom: true,
            status: 'queuing',
            maxPlayers: MAX_MATCH_CONTENDERS,
            players: [],
            createdAt: now,
            updatedAt: now,
          };
          this.matchRooms.set(overflowCode, targetRoom);
        }
      } else {
        // Create the friend room with the requested code
        const roomNum = this.nextRoomNumber++;
        targetRoom = {
          roomCode: normalized,
          roomNumber: roomNum,
          isCustomRoom: true,
          status: 'queuing',
          maxPlayers: MAX_MATCH_CONTENDERS,
          players: [],
          createdAt: now,
          updatedAt: now,
        };
        this.matchRooms.set(normalized, targetRoom);
      }
    } else {
      // Public Auto-Scaling 10-Player Queue:
      // 1. Check if player is already in an open queuing public room with < 10 players
      if (session.roomCode) {
        const currentRoom = this.matchRooms.get(session.roomCode);
        if (
          currentRoom &&
          currentRoom.status === 'queuing' &&
          (currentRoom.players.length < MAX_MATCH_CONTENDERS ||
            currentRoom.players.some((p) => p.sessionId === params.sessionId))
        ) {
          targetRoom = currentRoom;
        }
      }

      // 2. Otherwise find any open public queuing room that has < 10 players
      if (!targetRoom) {
        for (const room of this.matchRooms.values()) {
          if (
            !room.isCustomRoom &&
            room.status === 'queuing' &&
            room.players.length < MAX_MATCH_CONTENDERS
          ) {
            targetRoom = room;
            break;
          }
        }
      }

      // 3. If all existing rooms have 10 players or are already in progress, create a brand-new 10-player match room!
      if (!targetRoom) {
        const roomNum = this.nextRoomNumber++;
        const code = `ROOM-${roomNum}`;
        targetRoom = {
          roomCode: code,
          roomNumber: roomNum,
          isCustomRoom: false,
          status: 'queuing',
          maxPlayers: MAX_MATCH_CONTENDERS,
          players: [],
          createdAt: now,
          updatedAt: now,
        };
        this.matchRooms.set(code, targetRoom);
      }
    }

    // If the player was previously in a different room, remove them from the old room
    if (session.roomCode && session.roomCode !== targetRoom.roomCode) {
      this.removePlayerFromRoom(params.sessionId, session.roomCode);
    }
    session.roomCode = targetRoom.roomCode;

    // Upsert player into targetRoom.players (max 10 players)
    const existingPlayerIdx = targetRoom.players.findIndex(
      (p) => p.sessionId === params.sessionId || p.playerId === params.playerId
    );
    if (existingPlayerIdx >= 0) {
      targetRoom.players[existingPlayerIdx] = {
        ...targetRoom.players[existingPlayerIdx],
        sessionId: params.sessionId,
        displayName: params.displayName,
        badge: params.badge,
        lastSeenAt: now,
      };
    } else if (targetRoom.players.length < MAX_MATCH_CONTENDERS) {
      targetRoom.players.push({
        playerId: params.playerId,
        sessionId: params.sessionId,
        displayName: params.displayName,
        badge: params.badge,
        joinedAt: now,
        lastSeenAt: now,
      });
    }
    targetRoom.updatedAt = now;

    return {
      room: targetRoom,
      activeMatchRoomsCount: Math.max(1, this.matchRooms.size),
    };
  }

  /**
   * When a player launches their match, if a public room hits 10 players we mark it `in_progress`
   * so any subsequent players who join the app immediately get a fresh 10-player room (`ROOM-102`, etc.).
   */
  public notifyPlayerLaunchedMatch(sessionId: string, roomCode?: string): void {
    const session = this.activePool.get(sessionId);
    if (session) {
      session.inMatch = true;
    }
    const code = roomCode || session?.roomCode;
    if (!code) return;
    const room = this.matchRooms.get(code);
    if (!room) return;
    if (room.players.length >= MAX_MATCH_CONTENDERS) {
      room.status = 'in_progress';
    }
    room.updatedAt = Date.now();
  }

  public getPoolStats(): {
    activeConnections: number;
    maxConnections: number;
    activeMatchRoomsCount: number;
    onlinePlayers: PooledClientSession[];
  } {
    this.pruneIdleConnections();
    return {
      activeConnections: this.activePool.size,
      maxConnections: MAX_POOL_CONNECTIONS,
      activeMatchRoomsCount: Math.max(1, this.matchRooms.size),
      onlinePlayers: Array.from(this.activePool.values()),
    };
  }

  public queryTopLeaderboard(limit = 15): LeaderboardEntry[] {
    if (!this.sortedLeaderboardCache) {
      this.sortedLeaderboardCache = Array.from(
        this.leaderboardIndex.values()
      ).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.top3Finishes !== a.top3Finishes)
          return b.top3Finishes - a.top3Finishes;
        if (b.kills !== a.kills) return b.kills - a.kills;
        return b.damageDealt - a.damageDealt;
      });
    }
    return this.sortedLeaderboardCache.slice(0, limit);
  }

  public upsertLeaderboardEntry(update: {
    playerId: string;
    displayName: string;
    titleBadge: string;
    placement: number;
    kills: number;
    damageDealt: number;
    compatibilityScore: number;
    unlockedCuteGirl: boolean;
  }): LeaderboardEntry {
    const existing = this.leaderboardIndex.get(update.playerId);
    const isWin = update.placement === 1 ? 1 : 0;
    const isTop3 = update.placement <= 3 ? 1 : 0;

    const nextEntry: LeaderboardEntry = existing
      ? {
          ...existing,
          displayName: update.displayName,
          titleBadge: update.titleBadge,
          wins: existing.wins + isWin,
          top3Finishes: existing.top3Finishes + isTop3,
          kills: existing.kills + update.kills,
          damageDealt: existing.damageDealt + Math.round(update.damageDealt),
          compatibilityScore: Math.max(
            existing.compatibilityScore,
            update.compatibilityScore
          ),
          unlockedCuteGirl:
            existing.unlockedCuteGirl ||
            update.unlockedCuteGirl ||
            isTop3 === 1,
          updatedAt: Date.now(),
        }
      : {
          playerId: update.playerId,
          displayName: update.displayName,
          titleBadge: update.titleBadge,
          wins: isWin,
          top3Finishes: isTop3,
          kills: update.kills,
          damageDealt: Math.round(update.damageDealt),
          compatibilityScore: update.compatibilityScore,
          unlockedCuteGirl: update.unlockedCuteGirl || isTop3 === 1,
          updatedAt: Date.now(),
        };

    this.leaderboardIndex.set(update.playerId, nextEntry);
    this.sortedLeaderboardCache = null;
    return nextEntry;
  }

  public getRecentChatMessages(limit = 30): ChatMessage[] {
    return this.chatMessages.slice(-limit);
  }

  public appendChatMessage(
    senderId: string,
    senderName: string,
    senderBadge: string,
    text: string,
    isSystem = false
  ): ChatMessage {
    const cleanText = text.trim().slice(0, 220);
    const msg: ChatMessage = {
      id: generateId('msg'),
      senderId,
      senderName,
      senderBadge,
      text: cleanText,
      timestamp: Date.now(),
      isSystem,
    };
    this.chatMessages.push(msg);
    if (this.chatMessages.length > MAX_CHAT_HISTORY) {
      this.chatMessages.shift();
    }
    return msg;
  }
}

const globalForPool = globalThis as unknown as {
  heartdropDbPool?: BoundedDatabasePool;
};

export const dbPool =
  globalForPool.heartdropDbPool ?? new BoundedDatabasePool();
if (!globalForPool.heartdropDbPool) {
  globalForPool.heartdropDbPool = dbPool;
}
