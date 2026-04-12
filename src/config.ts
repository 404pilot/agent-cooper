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

export function getGarageCamDevice(): DeviceInfo {
  return {
    mac: requireEnv('GARAGE_CAM_MAC'),
    model: requireEnv('GARAGE_CAM_MODEL'),
  };
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

export const OPEN_THRESHOLD_MINUTES = 20;
