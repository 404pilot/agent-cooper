import * as crypto from 'crypto';
import { logger } from '../logger';
import {
  WyzeCredentials,
  WyzeTokens,
  WyzeDevice,
  WyzeProperty,
  WyzeApiResponse,
  WyzeRawDevice,
} from './types';

const AUTH_HOST = 'https://auth-prod.api.wyze.com';
const API_HOST = 'https://api.wyzecam.com';

function tripleMd5(password: string): string {
  let hash = password;
  for (let i = 0; i < 3; i++) {
    hash = crypto.hash('md5', hash, 'hex');
  }
  return hash;
}

function defaultBody(): Record<string, unknown> {
  return {
    phone_id: 'wyze_developer_api',
    app_ver: 'wyze_developer_api',
    app_version: 'wyze_developer_api',
    sc: 'wyze_developer_api',
    sv: 'wyze_developer_api',
    ts: Date.now(),
  };
}

export class WyzeClient {
  private credentials: WyzeCredentials;
  private tokens: WyzeTokens | null = null;

  constructor(credentials: WyzeCredentials) {
    this.credentials = credentials;
  }

  async login(): Promise<WyzeTokens> {
    const res = await fetch(`${AUTH_HOST}/api/user/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        keyid: this.credentials.keyId,
        apikey: this.credentials.apiKey,
      },
      body: JSON.stringify({
        email: this.credentials.email,
        password: tripleMd5(this.credentials.password),
      }),
    });

    const data = await res.json();
    if (!data.access_token) {
      logger.error('Wyze login failed', { response: data });
      throw new Error(`Wyze login failed: ${JSON.stringify(data)}`);
    }

    logger.info('Wyze login successful');
    this.tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
    return this.tokens;
  }

  async refreshAccessToken(): Promise<WyzeTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available. Call login() first.');
    }

    const res = await fetch(`${API_HOST}/app/user/refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...defaultBody(),
        refresh_token: this.tokens.refreshToken,
      }),
    });

    const data = await res.json();
    if (!data.data?.access_token) {
      throw new Error(`Wyze token refresh failed: ${JSON.stringify(data)}`);
    }

    this.tokens = {
      accessToken: data.data.access_token,
      refreshToken: data.data.refresh_token,
    };
    return this.tokens;
  }

  async getDevices(): Promise<WyzeDevice[]> {
    logger.debug('Fetching device list');
    const data = await this.apiPost('/app/v2/home_page/get_object_list');
    const devices = (data.data?.device_list || []).map(mapDevice);
    logger.info('Fetched devices', { count: devices.length });
    return devices;
  }

  async getPropertyList(mac: string, model: string): Promise<WyzeProperty[]> {
    logger.debug('Fetching property list', { mac, model });
    const data = await this.apiPost('/app/v2/device/get_property_list', {
      device_mac: mac,
      device_model: model,
    });
    return data.data?.property_list || [];
  }

  private getAccessToken(): string {
    if (!this.tokens?.accessToken) {
      throw new Error('Not authenticated. Call login() first.');
    }
    return this.tokens.accessToken;
  }

  private async apiPost(
    path: string,
    extra: Record<string, unknown> = {},
  ): Promise<WyzeApiResponse> {
    const res = await fetch(`${API_HOST}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...defaultBody(),
        access_token: this.getAccessToken(),
        ...extra,
      }),
    });
    return res.json();
  }
}

function mapDevice(raw: WyzeRawDevice): WyzeDevice {
  return {
    mac: raw.mac,
    nickname: raw.nickname,
    productModel: raw.product_model,
    productType: raw.product_type,
    connState: raw.conn_state,
    deviceParams: raw.device_params || {},
  };
}
