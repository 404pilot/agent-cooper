import { AsyncLocalStorage } from 'async_hooks';
import { InvocationContext } from '@azure/functions';
import winston from 'winston';
import Transport from 'winston-transport';

const isLocal = !process.env.FUNCTIONS_WORKER_RUNTIME;

// Store the Azure Function context per async invocation
const contextStore = new AsyncLocalStorage<InvocationContext>();

export function runWithContext<T>(context: InvocationContext, fn: () => Promise<T>): Promise<T> {
  return contextStore.run(context, fn);
}

// Custom transport that delegates to Azure Function's context.log()
class AzureContextTransport extends Transport {
  log(
    info: { level: string; message: string; [key: string]: unknown },
    callback: () => void,
  ): void {
    const context = contextStore.getStore();
    if (context) {
      const { level, message, ...meta } = info;
      delete meta.timestamp;
      const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
      const line = `${message}${metaStr}`;

      if (level === 'error') context.error(line);
      else if (level === 'warn') context.warn(line);
      else context.log(line);
    }
    callback();
  }
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: isLocal
    ? [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
              return `[${timestamp}] ${level}: ${message}${metaStr}`;
            }),
          ),
        }),
      ]
    : [new AzureContextTransport()],
});
