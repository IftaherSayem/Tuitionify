import winston from 'winston';

// Structured logging with Winston — JSON in production, colored console locally.
// Logs to console (captured by Vercel) and optionally to files in local dev.

const isProd = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isProd
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
          })
        )
  ),
  transports: [
    new winston.transports.Console(),
    // Local file logs (not in production — Vercel has its own logging)
    ...(isProd
      ? []
      : [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]),
  ],
});

// Helper to log admin actions with context
export function logAdminAction(action, actor, target, details = {}) {
  logger.info('Admin action', {
    action,
    actorId: actor._id,
    actorEmail: actor.email,
    targetId: target,
    ...details,
    timestamp: new Date().toISOString(),
  });
}

export default logger;
