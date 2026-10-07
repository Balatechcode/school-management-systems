/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';
import { ENV } from '../config/env.js';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  // Comprehensive server-side logging for debugging
  console.error('Unhandled Server Error:', {
    timestamp: new Date().toISOString(),
    message: err.message,
    stack: err.stack,
    code: err.code,
    status: err.status || err.statusCode,
  });

  const status = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  // SECURITY: Never expose raw SQL errors, stack traces, or internal paths in production
  let clientMessage = err.message || 'An unexpected internal server error occurred';
  if (status >= 500 && ENV.NODE_ENV === 'production') {
    clientMessage = 'An internal server error occurred. Please contact the administrator if this persists.';
  }

  return sendError(res, clientMessage, code, status);
}
