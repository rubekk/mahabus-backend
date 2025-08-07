import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from '@/config';
import routes from '@/routes';
import { errorHandler, notFoundHandler } from '@/middleware/error';
import { pricingScheduler } from '@/services/pricing.scheduler';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.cors.origins.includes(origin)) {
      callback(null, true); 
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// API routes
app.use('/api', routes);

// Welcome route
app.get('/', (_, res) => {
  res.json({
    success: true,
    message: 'Welcome to Bus Ticketing API',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`🚌 Bus Ticketing API is running on port ${PORT}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  
  // Start dynamic pricing scheduler
  if (config.nodeEnv !== 'test') {
    console.log('💰 Starting dynamic pricing scheduler...');
    pricingScheduler.start();
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  
  // Stop pricing scheduler
  pricingScheduler.stop();
  
  server.close(() => {
    console.log('💀 Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  
  // Stop pricing scheduler
  pricingScheduler.stop();
  
  server.close(() => {
    console.log('💀 Process terminated');
  });
});

export default app;
