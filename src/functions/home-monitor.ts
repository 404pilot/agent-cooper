import { app, InvocationContext, Timer } from '@azure/functions';
import { logger, runWithContext } from '../logger';
import { withRetry } from '../retry';
import { WyzeService, DeviceInfo } from '../wyze/service';
import { EmailService } from '../email/service';
import { DeviceStatus } from '../wyze/types';
import { getWyzeCredentials, getMonitoredDevices, OPEN_THRESHOLD_MINUTES, getEmailConfig } from '../config';

async function sendAlert(email: EmailService, subject: string, body: string): Promise<void> {
  await withRetry(() => email.send(subject, body), 'Email alert');
}

async function monitorDevice(
  wyze: WyzeService,
  email: EmailService,
  device: DeviceInfo,
  threshold: number,
): Promise<void> {
  const { label } = device;
  let status: DeviceStatus;
  try {
    status = await withRetry(() => wyze.getDeviceStatus(device), `${label} check`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`${label} — API unreachable`, { error: message });
    await sendAlert(email, `${label} — ERROR`, `Failed to check ${label}.\n\nError: ${message}`);
    return;
  }

  if (wyze.isOpenTooLong(status, threshold)) {
    const { activeState } = device;
    logger.warn(`${label} — ${activeState} too long!`, { threshold });
    await sendAlert(
      email,
      `${label} — ${activeState.toUpperCase()}`,
      `${label} has been ${activeState} since ${status.lastUpdatedAt.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} (over ${threshold} minutes).`,
    );
  }
}

export async function homeMonitor(timer: Timer, context: InvocationContext): Promise<void> {
  return runWithContext(context, async () => {
    if (timer.isPastDue) {
      logger.warn('Timer is running late');
    }

    const wyze = new WyzeService(getWyzeCredentials());
    await withRetry(() => wyze.authenticate(), 'Wyze login');

    const email = new EmailService(getEmailConfig());
    const threshold = OPEN_THRESHOLD_MINUTES;
    const devices = getMonitoredDevices();

    await Promise.all(devices.map((device) => monitorDevice(wyze, email, device, threshold)));
  });
}

app.timer('homeMonitor', {
  schedule: '0 */15 * * * *',
  handler: homeMonitor,
});
