import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origins: string[];
  };
  website: {
    url: string;
  };
  esewa: {
    merchantId: string;
    secretKey: string;
    successUrl: string;
    failureUrl: string;
  };
  khalti: {
    secretKey: string;
    publicKey: string;
    successUrl: string;
    failureUrl: string;
  };
  admin: {
    email: string;
    password: string;
  };
  mail: {
    email: string;
    password: string;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '9000000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 100),
  },
  cors: {
    // origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    origins: [
      "http://localhost:8080",
      "http://localhost:8081",
    ]
  },
  website: {
    url: process.env.WEBSITE_URL || 'http://localhost:3000',
  },
  esewa: {
    merchantId: process.env.ESEWA_MERCHANT_ID || '',
    secretKey: process.env.ESEWA_SECRET_KEY || '',
    successUrl: process.env.ESEWA_SUCCESS_URL || '',
    failureUrl: process.env.ESEWA_FAILURE_URL || '',
  },
  khalti: {
    secretKey: process.env.KHALTI_SECRET_KEY || '',
    publicKey: process.env.KHALTI_PUBLIC_KEY || '',
    successUrl: process.env.KHALTI_SUCCESS_URL || '',
    failureUrl: process.env.KHALTI_FAILURE_URL || '',
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@busticketing.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  },
  mail: {
    email: process.env.MAIL_EMAIL || '',
    password: process.env.MAIL_PASSWORD || '',
  }
};

export default config;
