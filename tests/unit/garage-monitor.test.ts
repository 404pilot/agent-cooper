import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InvocationContext } from '@azure/functions';

/**
 * Tests for the garage monitor orchestration flow.
 * Verifies the function correctly handles:
 * - Normal operation (door closed, no alert)
 * - Door open too long (sends alert)
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
  getGarageCamDevice: () => ({ mac: 'MAC', model: 'MODEL' }),
  OPEN_THRESHOLD_MINUTES: 20,
  getEmailConfig: () => ({ gmailUser: 'a@b.com', gmailAppPassword: 'x', to: ['a@b.com'] }),
}));
vi.mock('../../src/retry', () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

import { garageMonitor } from '../../src/functions/garage-monitor';
import { WyzeService } from '../../src/wyze/service';
import { EmailService } from '../../src/email/service';

const mockAuthenticate = vi.fn();
const mockGetGarageDoorStatus = vi.fn();
const mockIsOpenTooLong = vi.fn();
const mockSend = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (WyzeService as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
    authenticate: mockAuthenticate,
    getGarageDoorStatus: mockGetGarageDoorStatus,
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
const fakeContext = { log: vi.fn(), warn: vi.fn() } as unknown as InvocationContext;

describe('garageMonitor', () => {
  it('should not send email when garage door is closed', async () => {
    mockGetGarageDoorStatus.mockResolvedValue({ isOpen: false, lastUpdatedAt: new Date() });
    mockIsOpenTooLong.mockReturnValue(false);

    await garageMonitor(fakeTimer, fakeContext);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should send alert when garage door is open too long', async () => {
    mockGetGarageDoorStatus.mockResolvedValue({
      isOpen: true,
      lastUpdatedAt: new Date(Date.now() - 25 * 60 * 1000),
    });
    mockIsOpenTooLong.mockReturnValue(true);

    await garageMonitor(fakeTimer, fakeContext);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      'Garage door is OPEN',
      expect.stringContaining('over 20 minutes'),
    );
  });

  it('should send error alert when Wyze API is unreachable', async () => {
    mockAuthenticate.mockRejectedValue(new Error('Connection refused'));

    await garageMonitor(fakeTimer, fakeContext);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      'Garage monitor ERROR — Wyze API unreachable',
      expect.stringContaining('Connection refused'),
    );
  });

  it('should not send alert when door is open but under threshold', async () => {
    mockAuthenticate.mockResolvedValue(undefined);
    mockGetGarageDoorStatus.mockResolvedValue({
      isOpen: true,
      lastUpdatedAt: new Date(Date.now() - 5 * 60 * 1000),
    });
    mockIsOpenTooLong.mockReturnValue(false);

    await garageMonitor(fakeTimer, fakeContext);

    expect(mockSend).not.toHaveBeenCalled();
  });
});
