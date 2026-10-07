/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import apiRouter from './server/src/routes/index.js';
import { errorHandler } from './server/src/middleware/error.middleware.js';
import { ENV } from './server/src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Security Headers (CSP relaxed in dev for Vite HMR)
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Restricted CORS configuration (allows mobile apps without Origin, dev localhost, and configured APP_URL)
  const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...(process.env.APP_URL ? [process.env.APP_URL] : []),
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
          return callback(null, true);
        }
        return callback(new Error('Blocked by CORS policy'));
      },
      credentials: true,
    })
  );

  // Body parser with size limit to prevent memory exhaustion attacks
  app.use(express.json({ limit: '5mb' }));

  // General API Rate Limiting (300 requests per 15 mins per IP)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  });

  // Strict Auth Rate Limiting (30 attempts per 15 mins per IP to stop brute-force attacks)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
  });

  app.use('/api', apiLimiter);
  app.use('/api/v1', apiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/v1/auth/login', authLimiter);
  app.use('/api/auth/initial-admin', authLimiter);
  app.use('/api/v1/auth/initial-admin', authLimiter);
  app.use('/api/auth/demo-login', authLimiter);
  app.use('/api/v1/auth/demo-login', authLimiter);

  // Mount API REST Routes: /api/v1 (standard for mobile apps) and /api (backwards-compatible)
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Serve database schema SQL for copy-paste setup in UI
  app.get('/database/schema.sql', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'database', 'schema.sql'));
  });

  // Global Error Handler for API
  app.use('/api', errorHandler);
  app.use('/api/v1', errorHandler);

  // Frontend integration: Vite middleware in development, static files in production
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Dynamic import to avoid bundling Vite in production server
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        port: ENV.PORT,
        host: '0.0.0.0',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = ENV.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
======================================================
  EduCore Single-School Management System
  Server active on: http://localhost:${PORT}
  Environment: ${ENV.NODE_ENV}
  Supabase Configured: ${ENV.isSupabaseConfigured() ? 'YES (Live Supabase Auth & DB)' : 'NO (Using In-Memory Demo Mode)'}
======================================================
    `);
  });
}

// Resilient Monolith Process Protection:
// Prevent unhandled promise rejections or rogue exceptions in any module from crashing the entire server process.
process.on('unhandledRejection', (reason) => {
  console.error('🛡️ [Monolith Resilience Guard] Caught Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🛡️ [Monolith Resilience Guard] Caught Uncaught Exception:', err);
});

startServer().catch((err) => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});
