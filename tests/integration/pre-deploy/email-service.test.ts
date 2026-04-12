import { execSync } from 'child_process';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { EmailService } from '../../../src/email/service';

const ROOT_DIR = path.resolve(__dirname, '../../..');
const SECRETS_FILE = path.join(ROOT_DIR, 'secrets/secrets.yaml');

function decrypt(key: string): string {
  return execSync(`sops -d --extract '${key}' "${SECRETS_FILE}"`).toString().trim();
}

/**
 * Integration test that sends a real email via Gmail.
 * Sends only to the primary recipient to avoid spamming others during testing.
 */
describe('EmailService integration', () => {
  it('should send a test email to the primary recipient', async () => {
    const emailService = new EmailService({
      gmailUser: decrypt('["mail"]["service"]["gmail"]["user"]'),
      gmailAppPassword: decrypt('["mail"]["service"]["gmail"]["app_password"]'),
      to: [decrypt('["mail"]["to"]["primary"]')],
    });

    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
    await expect(
      emailService.send(
        `[Test] Agent Cooper - Email Service (${timestamp})`,
        'This is a test email from the Agent Cooper integration test suite.',
      ),
    ).resolves.toBeUndefined();
  });
});
