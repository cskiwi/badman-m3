import winston, { format, transports } from 'winston';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';

const { combine, timestamp, printf, colorize, errors } = format;

// Custom format for log files
const logFileFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level.toUpperCase()}] ${stack || message}${metaStr}`;
});

// Custom format for console
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level.toUpperCase()}] ${stack || message}${metaStr}`;
});

export function createWinstonLogger(config?: { name?: string; logDir?: string }) {
  const logDir = config?.logDir || 'logs';
  const appName = config?.name || 'app';

  return WinstonModule.createLogger({
    level: 'silly',
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true })),
    transports: [
      // Console transport
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('Badman', {
            colors: true,
            prettyPrint: true,
            processId: true,
            appName: true,
          }),
        ),
      }),
      // File transport for all logs
      new transports.File({
        filename: `${logDir}/info-${appName}.log`,
        level: 'silly',
        format: combine(timestamp(), logFileFormat),
        options: { flags: 'w' },
      }),
      // Separate file for errors
      new transports.File({
        filename: `${logDir}/error-${appName}.log`,
        level: 'error',
        format: combine(timestamp(), logFileFormat),
        options: { flags: 'w' },
      }),
    ],
  });
}
