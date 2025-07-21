const winston = require('winston');
const path = require('path');
const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, json } = format;
const DailyRotateFile = require('winston-daily-rotate-file');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  
  // Add metadata if it exists
  if (Object.keys(meta).length > 0) {
    log += `\n${JSON.stringify(meta, null, 2)}`;
  }
  
  return log;
});

// Create console transport for development
const consoleTransport = new transports.Console({
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

// Create file transport for all logs
const fileTransport = new DailyRotateFile({
  filename: path.join(logDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  level: 'info',
});

// Create error file transport
const errorFileTransport = new DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  level: 'error',
});

// Create the logger instance
const logger = createLogger({
  level: 'info',
  defaultMeta: { service: 'authenticator-backend' },
  transports: [
    consoleTransport,
    fileTransport,
    errorFileTransport
  ],
  exceptionHandlers: [
    new transports.File({ 
      filename: path.join(logDir, 'exceptions.log'),
      level: 'error' 
    })
  ],
  exitOnError: false
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Add stream for morgan
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;
