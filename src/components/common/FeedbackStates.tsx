/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Loader2, AlertTriangle, FileQuestion } from 'lucide-react';
import { Button } from './Button.js';

export const Loading: React.FC<{ message?: string; fullPage?: boolean }> = ({
  message = 'Loading data...',
  fullPage = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 gap-3">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">{message}</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        {content}
      </div>
    );
  }

  return content;
};

export const EmptyState: React.FC<{
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}> = ({ title, description, actionLabel, onAction, icon }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 bg-white rounded-xl border border-dashed border-slate-300">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        {icon || <FileQuestion className="w-6 h-6" />}
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-xs text-slate-500 max-w-sm">{description}</p>}
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
}> = ({ message = 'Failed to load content', onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-rose-50/50 rounded-xl border border-rose-200">
      <AlertTriangle className="w-8 h-8 text-rose-500 mb-2" />
      <h4 className="text-sm font-semibold text-rose-900">Operation Error</h4>
      <p className="text-xs text-rose-700 mt-1 max-w-md">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};
