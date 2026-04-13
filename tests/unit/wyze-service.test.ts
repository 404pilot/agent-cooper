import { describe, it, expect } from 'vitest';
import { WyzeService } from '../../src/wyze/service';
import { DeviceStatus } from '../../src/wyze/types';

const dummyCredentials = {
  email: 'test@test.com',
  password: 'password',
  keyId: 'key-id',
  apiKey: 'api-key',
};

/**
 * Tests for the 20-minute open door threshold logic.
 * The function checks if a garage door has been open longer than
 * the specified threshold, used to decide whether to send an alert.
 */
describe('WyzeService.isOpenTooLong', () => {
  const service = new WyzeService(dummyCredentials);

  it('should ignore closed doors regardless of how long ago they were closed', () => {
    const status: DeviceStatus = {
      isOpen: false,
      lastUpdatedAt: new Date(Date.now() - 60 * 60 * 1000),
    };
    expect(service.isOpenTooLong(status, 20)).toBe(false);
  });

  it('should not alert when door just opened (10 min < 20 min threshold)', () => {
    const status: DeviceStatus = {
      isOpen: true,
      lastUpdatedAt: new Date(Date.now() - 10 * 60 * 1000),
    };
    expect(service.isOpenTooLong(status, 20)).toBe(false);
  });

  it('should alert when door has been open past threshold (25 min > 20 min)', () => {
    const status: DeviceStatus = {
      isOpen: true,
      lastUpdatedAt: new Date(Date.now() - 25 * 60 * 1000),
    };
    expect(service.isOpenTooLong(status, 20)).toBe(true);
  });

  it('should alert at exactly the threshold boundary (20 min = 20 min)', () => {
    const status: DeviceStatus = {
      isOpen: true,
      lastUpdatedAt: new Date(Date.now() - 20 * 60 * 1000),
    };
    expect(service.isOpenTooLong(status, 20)).toBe(true);
  });
});
