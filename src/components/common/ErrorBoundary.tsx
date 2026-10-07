/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button.js';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Resilient ErrorBoundary component for Modular Monolith fault isolation.
 * Prevents a crash in any single module or widget from bringing down the entire application.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled component error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 bg-white border border-rose-200 rounded-2xl shadow-xs max-w-2xl mx-auto text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              {this.props.fallbackTitle || 'Something went wrong in this module'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {this.props.fallbackMessage ||
                'This specific screen encountered an unexpected error. Other school modules remain fully operational.'}
            </p>
          </div>

          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <div className="p-3 bg-slate-900 text-rose-300 font-mono text-[11px] rounded-lg text-left overflow-x-auto max-h-40 border border-slate-800">
              <span className="font-bold text-rose-400">{this.state.error.name}: </span>
              {this.state.error.message}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={this.handleReset}
            >
              Retry Module
            </Button>
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Home className="w-3.5 h-3.5" />}
              onClick={this.handleReload}
            >
              Reload System
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
