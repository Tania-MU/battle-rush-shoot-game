'use client';

import { ChatMessage, LeaderboardEntry, PlayerProfile } from '@/types/game';
import { generateId } from '@/lib/game-utils';
import type { MatchRoomInstance } from '@/lib/db-pool';

interface SyncResponse {
  chatMessages: ChatMessage[];
  onlineCount: number;
  poolSize: number;
  maxPoolSize: number;
  activeMatchRoomsCount?: number;
  onlinePlayers: {
    playerId: string;
    displayName: string;
    badge: string;
    inMatch: boolean;
    roomCode?: string | null;
  }[];
}

export interface MatchRoomSyncResponse {
  room: MatchRoomInstance;
  activeMatchRoomsCount: number;
}

class ClientConnectionManager {
  private sessionId: string = '';
  private playerId: string = '';
  private isConnected = false;
  private lifecycleBound = false;

  public getSessionId(): string {
    if (!this.sessionId && typeof window !== 'undefined') {
      const saved = window.sessionStorage.getItem('hdr_session_id');
      if (saved) {
        this.sessionId = saved;
      } else {
        this.sessionId = generateId('sess');
        window.sessionStorage.setItem('hdr_session_id', this.sessionId);
      }
    }
    return this.sessionId || 'sess_fallback';
  }

  /**
   * Registers automatic teardown listeners (`pagehide` and `beforeunload`)
   * so the pooled connection is disconnected as soon as the user leaves the site.
   */
  public bindLifecycleCleanup(playerId: string): void {
    this.playerId = playerId;
    if (this.lifecycleBound || typeof window === 'undefined') return;
    this.lifecycleBound = true;

    const handleLeaveSite = () => {
      this.disconnectImmediate();
    };

    window.addEventListener('pagehide', handleLeaveSite);
    window.addEventListener('beforeunload', handleLeaveSite);
  }

  public disconnectImmediate(): void {
    if (!this.sessionId) return;
    const payload = JSON.stringify({
      sessionId: this.sessionId,
      playerId: this.playerId,
    });

    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function'
    ) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/game/disconnect', blob);
    } else if (typeof fetch !== 'undefined') {
      fetch('/api/game/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
    this.isConnected = false;
  }

  public async syncLobbyState(
    profile: PlayerProfile,
    inMatch: boolean
  ): Promise<SyncResponse | null> {
    try {
      const sessionId = this.getSessionId();
      this.bindLifecycleCleanup(profile.id);
      const res = await fetch('/api/game/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'heartbeat',
          sessionId,
          playerId: profile.id,
          displayName: profile.displayName,
          badge: profile.titleBadge,
          inMatch,
        }),
      });
      if (!res.ok) return null;
      this.isConnected = true;
      return (await res.json()) as SyncResponse;
    } catch {
      return null;
    }
  }

  public async joinOrSyncMatchmakingRoom(
    profile: PlayerProfile,
    options?: {
      requestedRoomCode?: string;
      createNewFriendRoom?: boolean;
    }
  ): Promise<MatchRoomSyncResponse | null> {
    try {
      const sessionId = this.getSessionId();
      this.bindLifecycleCleanup(profile.id);
      const res = await fetch('/api/game/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'matchmaking_join_or_sync',
          sessionId,
          playerId: profile.id,
          displayName: profile.displayName,
          badge: profile.titleBadge,
          requestedRoomCode: options?.requestedRoomCode,
          createNewFriendRoom: options?.createNewFriendRoom,
        }),
      });
      if (!res.ok) return null;
      return (await res.json()) as MatchRoomSyncResponse;
    } catch {
      return null;
    }
  }

  public async notifyMatchLaunched(roomCode?: string): Promise<void> {
    try {
      const sessionId = this.getSessionId();
      await fetch('/api/game/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'matchmaking_launch',
          sessionId,
          roomCode,
        }),
      });
    } catch {
      // Ignore network error
    }
  }

  public async sendChatMessage(
    profile: PlayerProfile,
    text: string,
    isSystem = false
  ): Promise<ChatMessage[] | null> {
    try {
      const sessionId = this.getSessionId();
      const res = await fetch('/api/game/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          sessionId,
          playerId: profile.id,
          displayName: profile.displayName,
          badge: profile.titleBadge,
          text,
          isSystem,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.chatMessages ?? null;
    } catch {
      return null;
    }
  }

  public async fetchLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const res = await fetch('/api/game/leaderboard', { method: 'GET' });
      if (!res.ok) return [];
      const data = await res.json();
      return data.entries ?? [];
    } catch {
      return [];
    }
  }

  public async submitMatchResult(params: {
    profile: PlayerProfile;
    placement: number;
    kills: number;
    damageDealt: number;
  }): Promise<LeaderboardEntry[]> {
    try {
      const res = await fetch('/api/game/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: params.profile.id,
          displayName: params.profile.displayName,
          titleBadge: params.profile.titleBadge,
          placement: params.placement,
          kills: params.kills,
          damageDealt: params.damageDealt,
          compatibilityScore: params.profile.compatibilityScore,
          unlockedCuteGirl:
            params.profile.unlockedCuteGirl || params.placement <= 3,
        }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.entries ?? [];
    } catch {
      return [];
    }
  }
}

export const clientConnection = new ClientConnectionManager();
