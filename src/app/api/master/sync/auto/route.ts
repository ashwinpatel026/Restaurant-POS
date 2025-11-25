/**
 * Auto Sync API Endpoint
 * POST /api/master/sync/auto
 * Triggers automatic sync for all locations (cron job endpoint)
 * 
 * This endpoint can be called by:
 * - Vercel Cron Jobs
 * - External cron services (cron-job.org, etc.)
 * - Internal scheduled tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncService } from '@/lib/sync/syncService';

// Optional: Add API key authentication for cron jobs
const CRON_SECRET = process.env.CRON_SECRET || process.env.CRON_SECRET_KEY;

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret if configured
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('Auto-sync triggered at', new Date().toISOString());

    // Process pending syncs for all locations
    await syncService.processPendingSyncs();

    return NextResponse.json({
      success: true,
      message: 'Auto-sync completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in auto-sync:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support GET for easier cron job setup
export async function GET(request: NextRequest) {
  return POST(request);
}

