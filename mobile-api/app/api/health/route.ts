import { NextResponse } from 'next/server';
import { databasePool } from '@/lib/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await databasePool.query('SELECT 1');
    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Health check: database unreachable:', error);
    return NextResponse.json({
      status: 'error',
      db: 'unreachable',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
