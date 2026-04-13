import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InvocationContext } from '@azure/functions';

/**
 * Tests for the home monitor orchestration flow.
 * Verifies the function correctly handles:
 * - Normal operation (all devices closed, no alert)
 * - Device open too long (sends alert)
 * - Wyze API failure (sends error alert)
 */

// Mock dependencies before importing
vi.mock('../../src/wyze/service', () => ({
  WyzeService: vi.fn(),
}));
vi.mock('../../src/email/service', () => ({
  EmailService: vi.fn(),
}));
vi.mock('../../src/config', () => ({
  getWyzeCredentials: () => ({ email: 'a', password: 'b', keyId: 'c', apiKey: 'd' }),
  getMonitoredDevices: () => [
    { label: 'Garage door', mac: 'MAC1', model: 'MODEL1', openPid: 'P1301', activeState: 'open', inactiveState: 'closed' },
    { label: 'Front door', mac: 'MAC2', model: 'MODEL2', openPid: 'P2001', activeState: 'open', inactiveState: 'closed' },
    { label: 'Front door lock', mac: 'MAC2', model: 'MODEL2', openPid: 'P3', activeState: 'unlocked', inactiveState: 'locked' },
  ],
  OPEN_THRESHOLD_MINUTES: 20,
  getEmailConfig: () => ({ gmailUser: 'a@b.com', gmailAppPassword: 'x', to: ['a@b.com'] }),
}));
vi.mock('../../src/retry', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

import { homeMonitor } from '../../src/functions/home-monitor';
import { WyzeService } from '../../src/wyze/service';
import { EmailService } from '../../src/email/service';

const mockAuthenticate = vi.fn();
const mockGetDeviceStatus = vi.fn();
const mockIsOpenTooLong = vi.fn();
const mockSend = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthenticate.mockResolvedValue(undefined);
  (WyzeService as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
    authenticate: mockAuthenticate,
    getDeviceStatus: mockGetDeviceStatus,
    isOpenTooLong: mockIsOpenTooLong,
  }));
  (EmailService as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
    send: mockSend,
  }));
});

const fakeTimer = {
  isPastDue: false,
  schedule: { adjustForDST: false },
  scheduleStatus: undefined,
};
const fakeContext = {
  invocationId: 'test-id',
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as unknown as InvocationContext;

describe('homeMonitor', () => {
  it('should not send email when all devices are closed', async () => {
    mockGetDeviceStatus.mockResolvedValue({ isOpen: false, lastUpdatedAt: new Date() });
    mockIsOpenTooLong.mockReturnValue(false);

    await homeMonitor(fakeTimer, fakeContext);

    expect(mockSend).not.toHaveBeenCalled();
    expect(mockGetDeviceStatus).toHaveBeenCalledTimes(3);
  });

  it('should send alert when a device is open too long', async () => {
    mockGetDeviceStatus.mockResolvedValue({
      isOpen: true,
      lastUpdatedAt: new Date(Date.now() - 25 * 60 * 1000),
    });
    mockIsOpenTooLong.mockReturnValue(true);

    await homeMonitor(fakeTimer, fakeContext);

    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it('should send error alerts when device check fails', async () => {
    mockGetDeviceStatus.mockRejectedValue(new Error('Connection refused'));

    await homeMonitor(fakeTimer, fakeContext);

    expect(mockSend).toHaveBeenCalledTimes(3);
    expect(mockSend).toHaveBeenCalledWith(
      expect.stringContaining('ERROR'),
      expect.stringContaining('Connection refused'),
    );
  });

  it('should not send alert when devices are open but under threshold', async () => {
    mockGetDeviceStatus.mockResolvedValue({
      isOpen: true,
      lastUpdatedAt: new Date(Date.now() - 5 * 60 * 1000),
    });
    mockIsOpenTooLong.mockReturnValue(false);

    await homeMonitor(fakeTimer, fakeContext);

    expect(mockSend).not.toHaveBeenCalled();
  });
});
