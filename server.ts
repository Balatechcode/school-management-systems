/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './server/src/routes/index.js';
import { errorHandler } from './server/src/middleware/error.middleware.js';
import { ENV } from './server/src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Basic Middleware
  app.use(cors());
  app.use(express.json());

  // Mount API REST Routes
  app.use('/api', apiRouter);

  // Serve database schema SQL for copy-paste setup in UI
  app.get('/database/schema.sql', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'database', 'schema.sql'));
  });

  // Global Error Handler for API
  app.use('/api', errorHandler);

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

startServer().catch((err) => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});
