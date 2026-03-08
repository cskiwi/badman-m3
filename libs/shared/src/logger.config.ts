import winston, { format } from 'winston';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, printf, errors } = format;

// Custom format for log files
const logFileFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level.toUpperCase()}] ${stack || message}${metaStr}`;
});

export function createWinstonLogger(config?: { name?: string; logDir?: string; instanceId?: string | number }) {
  const logDir = config?.logDir || 'logs';
  const appName = config?.name || 'app';
  // Support PM2 instance ID via config or environment variable
  const instanceId = config?.instanceId ?? process.env['PM2_INSTANCE_ID'] ?? process.env['NODE_APP_INSTANCE'];
  const suffix = instanceId !== undefined ? `-${instanceId}` : '';

  return WinstonModule.createLogger({
    level: 'silly',
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true })),
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('gladman', {
            colors: true,
            prettyPrint: true,
            processId: true,
            appName: true,
          }),
        ),
      }),
      // Rotating file transport for all logs — keeps 14 days, max 20MB per file
      new DailyRotateFile({
        dirname: logDir,
        filename: `info-${appName}${suffix}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'silly',
        format: combine(timestamp(), logFileFormat),
        maxSize: '20m',
        maxFiles: '14d',
      }),
      // Rotating file transport for errors — keeps 30 days
      new DailyRotateFile({
        dirname: logDir,
        filename: `error-${appName}${suffix}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: combine(timestamp(), logFileFormat),
        maxSize: '20m',
        maxFiles: '30d',
      }),
    ],
  });
}
