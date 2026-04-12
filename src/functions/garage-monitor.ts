import { app, InvocationContext, Timer } from '@azure/functions';
import { logger, runWithContext } from '../logger';
import { withRetry } from '../retry';
import { WyzeService } from '../wyze/service';
import { EmailService } from '../email/service';
import { GarageDoorStatus } from '../wyze/types';
import {
  getWyzeCredentials,
  getGarageCamDevice,
  OPEN_THRESHOLD_MINUTES,
  getEmailConfig,
} from '../config';

async function checkGarageDoor(wyze: WyzeService): Promise<GarageDoorStatus> {
  return withRetry(async () => {
    await wyze.authenticate();
    return wyze.getGarageDoorStatus(getGarageCamDevice());
  }, 'Wyze garage door check');
}

async function sendAlert(email: EmailService, subject: string, body: string): Promise<void> {
  await withRetry(() => email.send(subject, body), 'Email alert');
}

export async function garageMonitor(timer: Timer, context: InvocationContext): Promise<void> {
  return runWithContext(context, async () => {
    if (timer.isPastDue) {
      logger.warn('Timer is running late');
    }

    const wyze = new WyzeService(getWyzeCredentials());
    const email = new EmailService(getEmailConfig());

    let status: GarageDoorStatus;
    try {
      status = await checkGarageDoor(wyze);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Wyze API unreachable', { error: message });
      await sendAlert(
        email,
        'Garage monitor ERROR — Wyze API unreachable',
        `The garage door monitor failed after all retries.\n\nError: ${message}\n\nThis could mean the Wyze API is down or the garage camera is offline.`,
      );
      return;
    }

    const threshold = OPEN_THRESHOLD_MINUTES;
    if (wyze.isOpenTooLong(status, threshold)) {
      logger.warn('Garage door has been open too long!', { threshold });
      await sendAlert(
        email,
        'Garage door is OPEN',
        `Your garage door has been open since ${status.lastUpdatedAt.toLocaleString()} (over ${threshold} minutes).`,
      );
    }
  });
}

app.timer('garageMonitor', {
  schedule: '0 */15 * * * *',
  handler: garageMonitor,
});
