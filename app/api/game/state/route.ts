import { NextRequest, NextResponse } from 'next/server';
import { dbPool } from '@/lib/db-pool';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      sessionId = 'sess_anon',
      playerId = 'player_anon',
      displayName = 'Mohammad',
      badge = 'Solo Contender',
      inMatch = false,
      text = '',
      isSystem = false,
      requestedRoomCode,
      createNewFriendRoom = false,
      roomCode,
    } = body;

    dbPool.acquireConnection(
      sessionId,
      playerId,
      displayName,
      badge,
      Boolean(inMatch)
    );

    if (action === 'matchmaking_join_or_sync') {
      const { room, activeMatchRoomsCount } = dbPool.joinOrSyncMatchRoom({
        sessionId,
        playerId,
        displayName,
        badge,
        requestedRoomCode,
        createNewFriendRoom: Boolean(createNewFriendRoom),
      });
      return NextResponse.json({
        room,
        activeMatchRoomsCount,
      });
    }

    if (action === 'matchmaking_launch') {
      dbPool.notifyPlayerLaunchedMatch(sessionId, roomCode);
      return NextResponse.json({ ok: true });
    }

    if (
      action === 'chat' &&
      typeof text === 'string' &&
      text.trim().length > 0
    ) {
      dbPool.appendChatMessage(
        playerId,
        displayName,
        badge,
        text,
        Boolean(isSystem)
      );
    }

    const poolStats = dbPool.getPoolStats();
    const chatMessages = dbPool.getRecentChatMessages(30);

    return NextResponse.json({
      chatMessages,
      onlineCount: poolStats.activeConnections,
      poolSize: poolStats.activeConnections,
      maxPoolSize: poolStats.maxConnections,
      activeMatchRoomsCount: poolStats.activeMatchRoomsCount,
      onlinePlayers: poolStats.onlinePlayers.map((p) => ({
        playerId: p.playerId,
        displayName: p.displayName,
        badge: p.badge,
        inMatch: p.inMatch,
        roomCode: p.roomCode,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to process state sync' },
      { status: 400 }
    );
  }
}
