/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(message ? { message } : {}),
  });
}

export function sendError(
  res: Response,
  message: string,
  code = 'BAD_REQUEST',
  statusCode = 400,
  details?: unknown
) {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(details ? { details } : {}),
  });
}
