import { NextRequest, NextResponse } from 'next/server';
import { dbPool } from '@/lib/db-pool';

export async function GET() {
  const entries = dbPool.queryTopLeaderboard(15);
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      playerId,
      displayName,
      titleBadge,
      placement,
      kills,
      damageDealt,
      compatibilityScore,
      unlockedCuteGirl,
    } = body;

    if (!playerId || !displayName) {
      return NextResponse.json({ error: 'Missing playerId or displayName' }, { status: 400 });
    }

    const updated = dbPool.upsertLeaderboardEntry({
      playerId: String(playerId),
      displayName: String(displayName).slice(0, 24),
      titleBadge: String(titleBadge || 'Solo Contender').slice(0, 28),
      placement: Number(placement) || 10,
      kills: Number(kills) || 0,
      damageDealt: Number(damageDealt) || 0,
      compatibilityScore: Number(compatibilityScore) || 500,
      unlockedCuteGirl: Boolean(unlockedCuteGirl),
    });

    if (Number(placement) <= 3) {
      dbPool.appendChatMessage(
        String(playerId),
        String(displayName),
        String(titleBadge || 'Top 3 Winner'),
        `Finished #${placement} with ${kills} kills (${Math.round(damageDealt)} DMG) and unlocked the Cute Virtual Girl companion!`,
        true
      );
    }

    const entries = dbPool.queryTopLeaderboard(15);
    return NextResponse.json({ updated, entries });
  } catch {
    return NextResponse.json({ error: 'Failed to update leaderboard' }, { status: 400 });
  }
}
