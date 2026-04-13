export interface WyzeCredentials {
  email: string;
  password: string;
  keyId: string;
  apiKey: string;
}

export interface WyzeTokens {
  accessToken: string;
  refreshToken: string;
}

export interface WyzeDevice {
  mac: string;
  nickname: string;
  productModel: string;
  productType: string;
  connState: number;
  deviceParams: Record<string, unknown>;
}

export interface WyzeProperty {
  pid: string;
  value: string;
  ts: number;
}

export interface DeviceStatus {
  isOpen: boolean;
  lastUpdatedAt: Date;
}

// Raw Wyze API response types

export interface WyzeApiResponse {
  code: string;
  msg: string;
  data: {
    device_list?: WyzeRawDevice[];
    property_list?: WyzeProperty[];
    [key: string]: unknown;
  };
}

export interface WyzeRawDevice {
  mac: string;
  nickname: string;
  product_model: string;
  product_type: string;
  conn_state: number;
  device_params: Record<string, unknown>;
}
