/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface TablePaginationConfig {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
  pageSizeOptions?: number[];
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  rowClassName?: (item: T) => string;

  /**
   * Pagination options:
   * 1. Pass `pagination={{ page, limit, total, onPageChange, onLimitChange }}` for server-side pagination.
   * 2. Or leave empty (defaults to client-side pagination with 10, 25, 50, 100 options).
   * 3. Pass `pagination={false}` or `enablePagination={false}` to disable pagination.
   */
  pagination?: TablePaginationConfig | false;
  enablePagination?: boolean;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No records found',
  rowClassName,
  pagination,
  enablePagination = true,
  defaultPageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
}: TableProps<T>) {
  // Client-side pagination state (active when server-side `pagination` is not provided)
  const isServerPagination = Boolean(pagination && typeof pagination === 'object');
  const isPaginationEnabled = pagination !== false && enablePagination;

  const [clientPage, setClientPage] = useState(1);
  const [clientLimit, setClientLimit] = useState(defaultPageSize);

  // Auto-reset client page if data shrinks below current offset
  useEffect(() => {
    if (!isServerPagination && clientPage > 1 && (clientPage - 1) * clientLimit >= data.length) {
      setClientPage(1);
    }
  }, [data.length, clientLimit, clientPage, isServerPagination]);

  // Compute pagination parameters
  const { page, limit, total, totalPages, displayedRows, handlePageChange, handleLimitChange, optionsList } =
    useMemo(() => {
      if (!isPaginationEnabled) {
        return {
          page: 1,
          limit: data.length,
          total: data.length,
          totalPages: 1,
          displayedRows: data,
          handlePageChange: () => {},
          handleLimitChange: () => {},
          optionsList: pageSizeOptions,
        };
      }

      if (isServerPagination && pagination) {
        const pLimit = pagination.limit || defaultPageSize;
        const pTotal = pagination.total || 0;
        const pTotalPages = pagination.totalPages ?? Math.max(1, Math.ceil(pTotal / pLimit));
        const pPage = Math.max(1, Math.min(pTotalPages, pagination.page || 1));

        return {
          page: pPage,
          limit: pLimit,
          total: pTotal,
          totalPages: pTotalPages,
          displayedRows: data, // already paginated by server
          handlePageChange: pagination.onPageChange,
          handleLimitChange: pagination.onLimitChange || (() => {}),
          optionsList: pagination.pageSizeOptions || pageSizeOptions,
        };
      }

      // Client-side pagination
      const cTotal = data.length;
      const cTotalPages = Math.max(1, Math.ceil(cTotal / clientLimit));
      const cPage = Math.max(1, Math.min(cTotalPages, clientPage));
      const startIdx = (cPage - 1) * clientLimit;
      const sliced = data.slice(startIdx, startIdx + clientLimit);

      return {
        page: cPage,
        limit: clientLimit,
        total: cTotal,
        totalPages: cTotalPages,
        displayedRows: sliced,
        handlePageChange: (newPage: number) => {
          setClientPage(Math.max(1, Math.min(cTotalPages, newPage)));
        },
        handleLimitChange: (newLimit: number) => {
          setClientLimit(newLimit);
          setClientPage(1);
        },
        optionsList: pageSizeOptions,
      };
    }, [
      isPaginationEnabled,
      isServerPagination,
      pagination,
      data,
      clientPage,
      clientLimit,
      defaultPageSize,
      pageSizeOptions,
    ]);

  // Compute record range for "Showing X to Y of Z records"
  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(total, page * limit);

  return (
    <div className="w-full overflow-hidden border border-slate-200 rounded-xl bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] uppercase tracking-wider font-semibold text-slate-600">
              {columns.map((col) => (
                <th key={col.key} className={`px-5 py-3.5 ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                    <span className="text-xs font-medium text-slate-500">Loading data...</span>
                  </div>
                </td>
              </tr>
            ) : displayedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-slate-400 text-xs">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              displayedRows.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className={`hover:bg-slate-50/80 transition-colors group text-slate-700 ${
                    rowClassName ? rowClassName(item) : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-5 py-3.5 align-middle ${col.className || ''}`}>
                      {col.render ? col.render(item) : ((item as any)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Reusable Pagination Footer */}
      {isPaginationEnabled && (
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          {/* Left: Record Range Summary */}
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <span>Showing</span>
            <span className="font-semibold text-slate-800">{startRecord}</span>
            <span>to</span>
            <span className="font-semibold text-slate-800">{endRecord}</span>
            <span>of</span>
            <span className="font-semibold text-slate-900">{total}</span>
            <span>records</span>
          </div>

          {/* Right: View at (10, 25, 50, 100) + Next / Previous Navigation */}
          <div className="flex items-center flex-wrap gap-4">
            {/* View at Page Size Selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="table-page-size-select" className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                View at
              </label>
              <select
                id="table-page-size-select"
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                disabled={isLoading || total === 0}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                {optionsList.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Pagination Navigation Buttons */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-500 mr-1.5 whitespace-nowrap">
                Page <strong className="text-slate-800">{page}</strong> of{' '}
                <strong className="text-slate-800">{totalPages}</strong>
              </span>

              {/* First Page */}
              <button
                type="button"
                disabled={page <= 1 || isLoading}
                onClick={() => handlePageChange(1)}
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Previous Page */}
              <button
                type="button"
                disabled={page <= 1 || isLoading}
                onClick={() => handlePageChange(page - 1)}
                className="px-2 py-1 flex items-center gap-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-xs cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              {/* Next Page */}
              <button
                type="button"
                disabled={page >= totalPages || isLoading}
                onClick={() => handlePageChange(page + 1)}
                className="px-2 py-1 flex items-center gap-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium text-xs cursor-pointer"
                title="Next Page"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Last Page */}
              <button
                type="button"
                disabled={page >= totalPages || isLoading}
                onClick={() => handlePageChange(totalPages)}
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
