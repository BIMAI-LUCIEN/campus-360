import { NextResponse } from 'next/server';
import { databasePool } from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await databasePool.query('SELECT 1');
    return NextResponse.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'degraded',
        database: 'unreachable',
        error: (error as Error)?.message || 'Database connection error',
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  }
}
