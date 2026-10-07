/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  totalPages: number; // alias for web frontend compatibility
  has_next: boolean;
  has_prev: boolean;
}

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(message ? { message } : {}),
  });
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  pagination: { page: number; limit: number; total: number },
  message?: string
) {
  const total_pages = Math.ceil(pagination.total / pagination.limit) || 1;
  const meta: PaginationMeta = {
    page: pagination.page,
    limit: pagination.limit,
    total: pagination.total,
    total_pages,
    totalPages: total_pages,
    has_next: pagination.page < total_pages,
    has_prev: pagination.page > 1,
  };

  return res.status(200).json({
    success: true,
    data: items,
    pagination: meta,
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
