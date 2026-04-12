import { logger } from '../logger';
import { WyzeClient } from './client';
import { WyzeCredentials, GarageDoorStatus } from './types';

// Wyze property IDs for garage door controller (HL_CGDC)
const PID_OPEN_CLOSE_STATE = 'P1301';

export interface DeviceInfo {
  mac: string;
  model: string;
}

export class WyzeService {
  private client: WyzeClient;

  constructor(credentials: WyzeCredentials) {
    this.client = new WyzeClient(credentials);
  }

  async authenticate(): Promise<void> {
    await this.client.login();
  }

  async getGarageDoorStatus(device: DeviceInfo): Promise<GarageDoorStatus> {
    const properties = await this.client.getPropertyList(device.mac, device.model);

    const doorProp = properties.find((p) => p.pid === PID_OPEN_CLOSE_STATE);
    if (!doorProp) {
      throw new Error(`Property ${PID_OPEN_CLOSE_STATE} not found for device ${device.mac}`);
    }

    const status = {
      isOpen: doorProp.value === '1',
      lastUpdatedAt: new Date(doorProp.ts),
    };
    logger.info('Garage door status', {
      isOpen: status.isOpen,
      since: status.lastUpdatedAt.toISOString(),
    });
    return status;
  }

  isOpenTooLong(status: GarageDoorStatus, thresholdMinutes: number): boolean {
    if (!status.isOpen) return false;

    const openDurationMs = Date.now() - status.lastUpdatedAt.getTime();
    return openDurationMs >= thresholdMinutes * 60 * 1000;
  }
}
