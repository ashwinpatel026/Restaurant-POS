/**
 * Auto Sync Worker
 * Background worker for automatic synchronization
 * Can be run as a cron job or background process
 */

import { syncService } from './syncService';
import { SyncConfig, DEFAULT_SYNC_CONFIG } from './types';

export class AutoSyncWorker {
  private config: SyncConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
  }

  /**
   * Start auto-sync worker
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Auto-sync worker is already running');
      return;
    }

    if (!this.config.enableAutoSync) {
      console.log('Auto-sync is disabled in configuration');
      return;
    }

    console.log(`Starting auto-sync worker (interval: ${this.config.autoSyncInterval}ms)`);

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.processPendingSyncs().catch((error) => {
        console.error('Error in auto-sync worker:', error);
      });
    }, this.config.autoSyncInterval);

    // Process immediately on start
    this.processPendingSyncs().catch((error) => {
      console.error('Error in initial auto-sync:', error);
    });
  }

  /**
   * Stop auto-sync worker
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Auto-sync worker stopped');
  }

  /**
   * Process pending syncs for all locations
   */
  private async processPendingSyncs(): Promise<void> {
    try {
      console.log('Processing pending syncs...');
      await syncService.processPendingSyncs();
      console.log('Pending syncs processed successfully');
    } catch (error) {
      console.error('Error processing pending syncs:', error);
      throw error;
    }
  }

  /**
   * Get worker status
   */
  getStatus(): { isRunning: boolean; config: SyncConfig } {
    return {
      isRunning: this.isRunning,
      config: this.config,
    };
  }
}

// Singleton instance
export const autoSyncWorker = new AutoSyncWorker();

// Auto-start if enabled (for Node.js environments)
if (typeof window === 'undefined' && process.env.ENABLE_AUTO_SYNC === 'true') {
  autoSyncWorker.start();
}

