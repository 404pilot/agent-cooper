import { logger } from './logger';

const DEFAULT_DELAYS = [5000, 15000, 30000]; // 5s, 15s, 30s

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  delays: number[] = DEFAULT_DELAYS,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < delays.length) {
        const delay = delays[attempt];
        logger.warn(
          `${label} failed (attempt ${attempt + 1}/${delays.length + 1}), retrying in ${delay / 1000}s`,
          {
            error: lastError.message,
          },
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  logger.error(`${label} failed after ${delays.length + 1} attempts`, {
    error: lastError?.message,
  });
  throw lastError;
}
