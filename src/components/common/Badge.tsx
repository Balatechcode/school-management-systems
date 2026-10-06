/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RoleCode } from '../../types/index.js';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'role';
  roleCode?: RoleCode | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  roleCode,
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[10px] font-semibold px-2 py-0.5 rounded-full',
    md: 'text-xs font-medium px-2.5 py-0.5 rounded-full',
  };

  // Dedicated role styling
  if (roleCode) {
    const roleColors: Record<string, string> = {
      ADMIN: 'bg-rose-100 text-rose-800 border border-rose-200',
      PRINCIPAL: 'bg-purple-100 text-purple-800 border border-purple-200',
      TEACHER: 'bg-blue-100 text-blue-800 border border-blue-200',
      ACCOUNTANT: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      LIBRARIAN: 'bg-amber-100 text-amber-800 border border-amber-200',
      RECEPTIONIST: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
      PARENT: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
      STUDENT: 'bg-teal-100 text-teal-800 border border-teal-200',
    };

    return (
      <span
        className={`inline-flex items-center tracking-wide uppercase font-semibold ${sizeStyles[size]} ${
          roleColors[roleCode] || 'bg-slate-100 text-slate-800 border border-slate-200'
        } ${className}`}
      >
        {children}
      </span>
    );
  }

  const variantStyles = {
    primary: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    info: 'bg-sky-50 text-sky-700 border border-sky-200',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    role: 'bg-slate-100 text-slate-800 border border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center font-medium ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
