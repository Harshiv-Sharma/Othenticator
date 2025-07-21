const expressWinston = require('express-winston');
const logger = require('../utils/logger');
const { format } = require('winston');
const { combine, timestamp, printf, json } = format;

// Custom format for request logging
const requestFormat = printf(({ level, message, timestamp, ...meta }) => {
  const { req, res, responseTime } = meta;
  const { method, url, ip, headers, body, query, params, user } = req || {};
  
  // Skip logging sensitive information
  const sanitizedBody = { ...body };
  if (sanitizedBody.password) sanitizedBody.password = '******';
  if (sanitizedBody.token) sanitizedBody.token = '******';
  
  return JSON.stringify({
    timestamp,
    level: level.toUpperCase(),
    message,
    method,
    url,
    statusCode: res?.statusCode,
    responseTime: `${responseTime}ms`,
    ip: headers['x-forwarded-for'] || ip || req.connection.remoteAddress,
    userAgent: headers['user-agent'],
    userId: user?.id || 'anonymous',
    query,
    params,
    // Only include body for non-GET requests
    ...(method !== 'GET' && { body: sanitizedBody })
  });
});

// Request logging middleware
const requestLogger = expressWinston.logger({
  winstonInstance: logger,
  msg: 'HTTP {{req.method}} {{req.url}}',
  requestField: 'req',
  responseField: 'res',
  requestWhitelist: ['method', 'url', 'ip', 'headers', 'query', 'params', 'body'],
  responseWhitelist: ['statusCode'],
  bodyBlacklist: ['password', 'token', 'authorization'],
  headerBlacklist: ['authorization', 'cookie'],
  expressFormat: false,
  colorize: process.env.NODE_ENV !== 'production',
  meta: true,
  statusLevels: {
    success: 'info',
    warn: 'warn',
    error: 'error'
  },
  dynamicMeta: (req) => {
    return {
      user: req.user || null,
      correlationId: req.headers['x-correlation-id'] || null
    };
  },
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    requestFormat
  ),
  // Skip logging for health checks
  skip: (req) => req.originalUrl === '/health' || req.originalUrl === '/favicon.ico',
  // Log all requests, including errors
  ignoreRoute: () => false
});

// Error logging middleware
const errorLogger = expressWinston.errorLogger({
  winstonInstance: logger,
  msg: '{{err.message}}',
  meta: true,
  metaFilter: (req, res, meta) => {
    // Don't log stack traces in production
    if (process.env.NODE_ENV === 'production') {
      delete meta.error.stack;
    }
    return meta;
  },
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  // Skip logging for 404 errors
  skip: (req, res) => res.statusCode === 404
});

module.exports = {
  requestLogger,
  errorLogger
};
