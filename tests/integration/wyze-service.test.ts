import { execSync } from 'child_process';
import path from 'path';
import { describe, it, expect, beforeAll } from 'vitest';
import { WyzeService } from '../../src/wyze/service';
import { WyzeCredentials } from '../../src/wyze/types';
import { getMonitoredDevices } from '../../src/config';

const ROOT_DIR = path.resolve(__dirname, '../..');
const SECRETS_FILE = path.join(ROOT_DIR, 'secrets/secrets.yaml');

function decrypt(key: string): string {
  return execSync(`sops -d --extract '${key}' "${SECRETS_FILE}"`).toString().trim();
}

function loadCredentials(): WyzeCredentials {
  return {
    email: decrypt('["wyze"]["email"]'),
    password: decrypt('["wyze"]["password"]'),
    keyId: decrypt('["wyze"]["key_id"]'),
    apiKey: decrypt('["wyze"]["api_key"]'),
  };
}

// Set env vars so getMonitoredDevices() can read device MAC/model
process.env.GARAGE_CAM_MAC = decrypt('["wyze"]["devices"]["garage_cam"]["mac"]');
process.env.GARAGE_CAM_MODEL = decrypt('["wyze"]["devices"]["garage_cam"]["model"]');
process.env.FRONT_DOOR_LOCK_MAC = decrypt('["wyze"]["devices"]["front_door_lock"]["mac"]');
process.env.FRONT_DOOR_LOCK_MODEL = decrypt('["wyze"]["devices"]["front_door_lock"]["model"]');

/**
 * Integration tests that hit the real Wyze API.
 * Requires valid credentials in secrets/secrets.yaml.
 * Automatically tests all monitored devices defined in config.
 */
describe('WyzeService integration', () => {
  let service: WyzeService;

  beforeAll(async () => {
    service = new WyzeService(loadCredentials());
    await service.authenticate();
  });

  for (const device of getMonitoredDevices()) {
    it(`should return status for: ${device.label}`, async () => {
      const status = await service.getDeviceStatus(device);
      expect(typeof status.isOpen).toBe('boolean');
      expect(status.lastUpdatedAt).toBeInstanceOf(Date);
      expect(status.lastUpdatedAt.getTime()).toBeGreaterThan(0);
    });
  }
});
