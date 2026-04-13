import { logger } from '../logger';
import { WyzeClient } from './client';
import { WyzeCredentials, DeviceStatus } from './types';

export interface DeviceInfo {
  label: string;
  mac: string;
  model: string;
  openPid: string;
  /** e.g. "open"/"closed" for doors, "unlocked"/"locked" for locks */
  activeState: string;
  inactiveState: string;
}

export class WyzeService {
  private client: WyzeClient;

  constructor(credentials: WyzeCredentials) {
    this.client = new WyzeClient(credentials);
  }

  async authenticate(): Promise<void> {
    await this.client.login();
  }

  async getDeviceStatus(device: DeviceInfo): Promise<DeviceStatus> {
    const properties = await this.client.getPropertyList(device.mac, device.model);

    const prop = properties.find((p) => p.pid === device.openPid);
    if (!prop) {
      throw new Error(`Property ${device.openPid} not found for device ${device.mac}`);
    }

    const status = {
      isOpen: prop.value === '1',
      lastUpdatedAt: new Date(prop.ts),
    };
    logger.info('Device status', {
      label: device.label,
      state: status.isOpen ? device.activeState : device.inactiveState,
      since: status.lastUpdatedAt.toISOString(),
      sinceLocal: status.lastUpdatedAt.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
    });
    return status;
  }

  isOpenTooLong(status: DeviceStatus, thresholdMinutes: number): boolean {
    if (!status.isOpen) return false;

    const openDurationMs = Date.now() - status.lastUpdatedAt.getTime();
    return openDurationMs >= thresholdMinutes * 60 * 1000;
  }
}
