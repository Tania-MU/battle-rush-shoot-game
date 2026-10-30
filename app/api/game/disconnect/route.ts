import { NextRequest, NextResponse } from 'next/server';
import { dbPool } from '@/lib/db-pool';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = body?.sessionId;
    if (typeof sessionId === 'string' && sessionId.length > 0) {
      dbPool.releaseConnection(sessionId);
    }
    return NextResponse.json({ disconnected: true });
  } catch {
    return NextResponse.json({ disconnected: false }, { status: 200 });
  }
}
