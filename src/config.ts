import { WyzeCredentials } from './wyze/types';
import { DeviceInfo } from './wyze/service';
import { EmailConfig } from './email/service';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getWyzeCredentials(): WyzeCredentials {
  return {
    email: requireEnv('WYZE_EMAIL'),
    password: requireEnv('WYZE_PASSWORD'),
    keyId: requireEnv('WYZE_KEY_ID'),
    apiKey: requireEnv('WYZE_API_KEY'),
  };
}

// Wyze property IDs:
// P1301 — garage door controller (HL_CGDC) open/close state
// P2001 — lock door sensor open/close state
// P3    — lock locked/unlocked state (0=locked, 1=unlocked)
export function getMonitoredDevices(): DeviceInfo[] {
  return [
    {
      label: 'Garage door',
      mac: requireEnv('GARAGE_CAM_MAC'),
      model: requireEnv('GARAGE_CAM_MODEL'),
      openPid: 'P1301',
      activeState: 'open',
      inactiveState: 'closed',
    },
    {
      label: 'Front door',
      mac: requireEnv('FRONT_DOOR_LOCK_MAC'),
      model: requireEnv('FRONT_DOOR_LOCK_MODEL'),
      openPid: 'P2001',
      activeState: 'open',
      inactiveState: 'closed',
    },
    {
      label: 'Front door lock',
      mac: requireEnv('FRONT_DOOR_LOCK_MAC'),
      model: requireEnv('FRONT_DOOR_LOCK_MODEL'),
      openPid: 'P3',
      activeState: 'unlocked',
      inactiveState: 'locked',
    },
  ];
}

export function getEmailConfig(): EmailConfig {
  const primary = requireEnv('GMAIL_TO_PRIMARY');
  const others = process.env['GMAIL_TO_OTHERS']?.split(',').filter(Boolean) || [];
  return {
    gmailUser: requireEnv('GMAIL_USER'),
    gmailAppPassword: requireEnv('GMAIL_APP_PASSWORD'),
    to: [primary, ...others],
  };
}

export const OPEN_THRESHOLD_MINUTES = 10;
