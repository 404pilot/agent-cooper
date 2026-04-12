import { execSync } from 'child_process';
import path from 'path';
import { describe, it, expect, beforeAll } from 'vitest';
import { WyzeService, DeviceInfo } from '../../src/wyze/service';
import { WyzeCredentials } from '../../src/wyze/types';

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

function loadGarageCam(): DeviceInfo {
  return {
    mac: decrypt('["wyze"]["devices"]["garage_cam"]["mac"]'),
    model: decrypt('["wyze"]["devices"]["garage_cam"]["model"]'),
  };
}

/**
 * Integration tests that hit the real Wyze API.
 * Requires valid credentials in secrets/secrets.yaml.
 * Verifies that our API client can authenticate and read garage door status.
 */
describe('WyzeService integration', () => {
  let service: WyzeService;
  let garageCam: DeviceInfo;

  beforeAll(async () => {
    service = new WyzeService(loadCredentials());
    garageCam = loadGarageCam();
    await service.authenticate();
  });

  it('should return a valid garage door status (open/closed with timestamp)', async () => {
    const status = await service.getGarageDoorStatus(garageCam);

    expect(typeof status.isOpen).toBe('boolean');
    expect(status.lastUpdatedAt).toBeInstanceOf(Date);
    expect(status.lastUpdatedAt.getTime()).toBeGreaterThan(0);
  });
});
