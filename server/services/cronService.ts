import cron from 'node-cron';
import { db } from '../db';
import { instructorGoogleCredentials } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { google } from 'googleapis';
import { calendarService } from './calendarService';

const WEBHOOK_CALLBACK_URL = process.env.WEBHOOK_CALLBACK_URL || `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/api/availability/webhook/calendar`;

interface WatchRenewalResult {
  instructorId: string;
  success: boolean;
  error?: string;
  newExpiry?: Date;
}

interface TokenHealthResult {
  instructorId: string;
  healthy: boolean;
  error?: string;
}

export class CronService {
  private isInitialized = false;

  /**
   * Renew Google Calendar watch for a single instructor
   */
  async renewCalendarWatch(instructorId: string): Promise<WatchRenewalResult> {
    try {
      const credentials = await db.query.instructorGoogleCredentials.findFirst({
        where: eq(instructorGoogleCredentials.instructorId, instructorId),
      });

      if (!credentials) {
        return {
          instructorId,
          success: false,
          error: 'No credentials found',
        };
      }

      const accessToken = await calendarService.getValidAccessToken(instructorId);
      
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      
      const calendar = google.calendar({ version: 'v3', auth });
      const calendarId = credentials.primaryCalendarId || 'primary';

      const channelId = `calendar-watch-${instructorId}-${Date.now()}`;

      const response = await calendar.events.watch({
        calendarId,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: WEBHOOK_CALLBACK_URL,
        },
      });

      const resourceId = response.data.resourceId;
      const expiration = response.data.expiration;
      const webhookExpiry = expiration ? new Date(parseInt(expiration)) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db.update(instructorGoogleCredentials)
        .set({
          webhookResourceId: resourceId || null,
          webhookChannelId: channelId,
          webhookExpiry,
          syncStatus: 'active',
          lastSyncError: null,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(instructorGoogleCredentials.instructorId, instructorId));

      console.log(`[CronService] Renewed calendar watch for instructor ${instructorId}, expires: ${webhookExpiry.toISOString()}`);

      return {
        instructorId,
        success: true,
        newExpiry: webhookExpiry,
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      console.error(`[CronService] Failed to renew calendar watch for instructor ${instructorId}:`, errorMessage);

      await db.update(instructorGoogleCredentials)
        .set({
          syncStatus: 'sync_error',
          lastSyncError: errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(instructorGoogleCredentials.instructorId, instructorId));

      return {
        instructorId,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check token health for a single instructor
   */
  async checkTokenHealth(instructorId: string): Promise<TokenHealthResult> {
    try {
      await calendarService.getValidAccessToken(instructorId);

      await db.update(instructorGoogleCredentials)
        .set({
          syncStatus: 'active',
          lastSyncError: null,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(instructorGoogleCredentials.instructorId, instructorId));

      return {
        instructorId,
        healthy: true,
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      
      const isRevoked = errorMessage.includes('revoked') || 
                        errorMessage.includes('invalid_grant') ||
                        errorMessage.includes('Token has been expired');

      await db.update(instructorGoogleCredentials)
        .set({
          syncStatus: isRevoked ? 'revoked' : 'sync_error',
          lastSyncError: errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(instructorGoogleCredentials.instructorId, instructorId));

      console.error(`[CronService] Token health check failed for instructor ${instructorId}: ${errorMessage}`);

      return {
        instructorId,
        healthy: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Renew all calendar watches for all instructors
   */
  async renewAllCalendarWatches(): Promise<void> {
    console.log('[CronService] Starting calendar watch renewal for all instructors...');

    const allCredentials = await db.query.instructorGoogleCredentials.findMany();

    if (allCredentials.length === 0) {
      console.log('[CronService] No instructor credentials found, skipping renewal.');
      return;
    }

    console.log(`[CronService] Found ${allCredentials.length} instructors with Google credentials`);

    const results: WatchRenewalResult[] = [];

    for (const cred of allCredentials) {
      const result = await this.renewCalendarWatch(cred.instructorId);
      results.push(result);

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`[CronService] Calendar watch renewal complete. Success: ${successful}, Failed: ${failed}`);
  }

  /**
   * Check token health for all instructors
   */
  async checkAllTokenHealth(): Promise<void> {
    console.log('[CronService] Starting token health check for all instructors...');

    const allCredentials = await db.query.instructorGoogleCredentials.findMany();

    if (allCredentials.length === 0) {
      console.log('[CronService] No instructor credentials found, skipping health check.');
      return;
    }

    console.log(`[CronService] Checking token health for ${allCredentials.length} instructors`);

    const results: TokenHealthResult[] = [];

    for (const cred of allCredentials) {
      const result = await this.checkTokenHealth(cred.instructorId);
      results.push(result);

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const healthy = results.filter(r => r.healthy).length;
    const unhealthy = results.filter(r => !r.healthy).length;

    console.log(`[CronService] Token health check complete. Healthy: ${healthy}, Unhealthy: ${unhealthy}`);

    if (unhealthy > 0) {
      const unhealthyInstructors = results.filter(r => !r.healthy).map(r => r.instructorId);
      console.warn(`[CronService] Instructors with unhealthy tokens: ${unhealthyInstructors.join(', ')}`);
    }
  }

  /**
   * Run the daily maintenance job
   */
  async runDailyMaintenance(): Promise<void> {
    console.log('[CronService] Running daily maintenance job...');
    const startTime = Date.now();

    try {
      await this.checkAllTokenHealth();

      await this.renewAllCalendarWatches();

      const duration = (Date.now() - startTime) / 1000;
      console.log(`[CronService] Daily maintenance completed in ${duration.toFixed(2)} seconds`);
    } catch (error) {
      console.error('[CronService] Daily maintenance job failed:', error);
    }
  }

  /**
   * Initialize the cron scheduler
   */
  initialize(): void {
    if (this.isInitialized) {
      console.log('[CronService] Already initialized, skipping...');
      return;
    }

    cron.schedule('0 0 * * *', async () => {
      console.log('[CronService] Midnight cron job triggered');
      await this.runDailyMaintenance();
    }, {
      timezone: 'America/Denver',
    });

    console.log('[CronService] Scheduled daily maintenance job at midnight (America/Denver)');

    this.isInitialized = true;
  }
}

export const cronService = new CronService();
