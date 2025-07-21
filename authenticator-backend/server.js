const express = require('express');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { requestLogger, errorLogger } = require('./middlewares/requestLogger');
const authRoutes = require('./routes/authRoutes');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

// Load environment variables
dotenv.config();

const app = express();

// Connect to MongoDB
connectDB().catch(err => {
  logger.error('MongoDB connection error:', err);
  process.exit(1);
});

// Add request ID to each request
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || Date.now().toString();
  next();
});

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enhanced request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = req.id;
  
  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  });
  
  // Log request body (except for sensitive data)
  if (req.body && Object.keys(req.body).length > 0) {
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '******';
    logger.debug('Request body', { requestId, body: sanitizedBody });
  }
  
  // Capture response finish event to log the outcome
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      duration: `${duration}ms`
    });
  });
  
  next();
});

// Add morgan for HTTP request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev', { 
    stream: { 
      write: message => logger.http(message.trim()) 
    } 
  }));
}

// API Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Authenticator API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error);
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  
  // Log the error
  logger.error({
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user?.id || 'anonymous',
    body: req.body,
    params: req.params,
    query: req.query,
    headers: {
      'user-agent': req.get('user-agent'),
      referer: req.get('referer')
    }
  });

  // Don't leak error details in production
  const errorResponse = {
    error: {
      message: statusCode === 500 ? 'Internal Server Error' : err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  };

  res.status(statusCode).json(errorResponse);
});

// Error logger (must be after all other middleware and routes)
app.use(errorLogger);

// Create HTTP server
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Start server
server.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM for graceful shutdown
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    logger.info('💥 Process terminated!');
  });
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Only keep one SIGTERM handler
// The duplicate SIGTERM handler has been removed

module.exports = server;
