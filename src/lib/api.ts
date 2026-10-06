/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiResponse } from '../types/index.js';

let authToken: string | null = null;

export const setApiAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('educore_auth_token', token);
  } else {
    localStorage.removeItem('educore_auth_token');
  }
};

export const getStoredAuthToken = (): string | null => {
  if (authToken) return authToken;
  return localStorage.getItem('educore_auth_token');
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const token = getStoredAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || `Request failed with status ${response.status}`,
        code: data.code || 'HTTP_ERROR',
      };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Network communication error',
      code: 'NETWORK_ERROR',
    };
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
