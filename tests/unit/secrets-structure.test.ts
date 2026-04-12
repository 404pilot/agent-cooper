import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';

const ROOT_DIR = path.resolve(__dirname, '../..');

function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

/**
 * Ensures secrets.yaml and secrets.example.yaml have the same key structure.
 * Catches drift when new secrets are added to one but not the other.
 */
describe('secrets structure', () => {
  it('should have the same keys in secrets.yaml and secrets.example.yaml', () => {
    const exampleContent = readFileSync(
      path.join(ROOT_DIR, 'secrets/secrets.example.yaml'),
      'utf8',
    );
    const example = parse(exampleContent);
    const exampleKeys = getKeys(example);

    const decrypted = execSync(`sops -d ${path.join(ROOT_DIR, 'secrets/secrets.yaml')}`).toString();
    const actual = parse(decrypted);
    const actualKeys = getKeys(actual);

    expect(actualKeys).toEqual(exampleKeys);
  });
});
