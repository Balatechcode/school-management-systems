/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { History, Shield, RefreshCw, Terminal, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { api } from '../../lib/api.js';
import { AuditLog } from '../../types/index.js';
import { Table, Column } from '../../components/common/Table.js';
import { Badge } from '../../components/common/Badge.js';
import { Button } from '../../components/common/Button.js';
import { Input } from '../../components/common/Input.js';

export const AuditLogsView: React.FC = () => {
  const { hasPermission, isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<AuditLog[]>('/api/audit-logs');
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (e) {
      console.warn('Failed to fetch audit logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = searchTerm.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.entity_type.toLowerCase().includes(q) ||
      (log.username && log.username.toLowerCase().includes(q)) ||
      (log.ip_address && log.ip_address.includes(q))
    );
  });

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (log) => (
        <span className="text-xs font-mono text-slate-500">
          {new Date(log.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log) => (
        <Badge variant="primary" size="sm">
          {log.action}
        </Badge>
      ),
    },
    {
      key: 'entity',
      header: 'Target Entity',
      render: (log) => (
        <span className="text-xs text-slate-700">
          <strong className="text-slate-900">{log.entity_type}</strong>
          {log.entity_id && (
            <span className="font-mono text-slate-400 text-[10px] ml-1.5">
              #{log.entity_id.substring(0, 8)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'actor',
      header: 'Initiator / User',
      render: (log) => (
        <span className="text-xs font-medium text-slate-800">
          {log.username ? `@${log.username}` : 'System'}
        </span>
      ),
    },
    {
      key: 'ip',
      header: 'IP / Origin',
      render: (log) => (
        <span className="text-xs font-mono text-slate-500">
          {log.ip_address || '127.0.0.1'}
        </span>
      ),
    },
    {
      key: 'diff',
      header: 'Payload Details',
      className: 'text-right',
      render: (log) => (
        <Button
          size="sm"
          variant="outline"
          className="text-[11px] py-1"
          onClick={() => setSelectedLog(log)}
        >
          View JSON
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Security & System Audit Trail
          </h2>
          <p className="text-xs text-slate-500">
            Immutable log of user modifications, security permission updates, and administrative events.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={fetchLogs}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Log
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <Input
          placeholder="Filter logs by action, actor, entity, or IP..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Logs Table */}
      <Table
        columns={columns}
        data={filteredLogs}
        keyExtractor={(l) => l.id}
        isLoading={isLoading}
        emptyMessage="No audit logs recorded yet."
      />

      {/* Inspect JSON Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Audit Entry: {selectedLog.action}
                </h4>
                <p className="text-xs text-slate-500">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Close ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block mb-1">New Values:</span>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto font-mono text-[11px]">
                  {JSON.stringify(selectedLog.new_values, null, 2) || 'null'}
                </pre>
              </div>

              {selectedLog.old_values && (
                <div>
                  <span className="font-semibold text-slate-700 block mb-1">Old Values:</span>
                  <pre className="p-3 bg-slate-900 text-amber-400 rounded-lg overflow-x-auto font-mono text-[11px]">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <Button size="sm" onClick={() => setSelectedLog(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
