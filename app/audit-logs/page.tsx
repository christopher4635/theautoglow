'use client';

import React, { useState, useEffect } from 'react';
import { History, Search, Shield, Clock, User, Filter } from 'lucide-react';
import { formatDateTime, cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function AuditLogsPage() {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      !search ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight">System Audit & Compliance Logs</h1>
          <p className="text-xs text-muted mt-0.5">
            Immutable traceability of financial adjustments, user activity, vehicle check-ins, and data modifications
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter audit logs by user, action, or entity ID..."
          className="w-full pl-9 pr-3 py-1.5 bg-white border border-border rounded text-xs text-charcoal focus:outline-none focus:border-charcoal"
        />
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-surface border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
              <th className="py-2.5 px-4">Timestamp</th>
              <th className="py-2.5 px-4">User</th>
              <th className="py-2.5 px-4">Action</th>
              <th className="py-2.5 px-4">Entity Type / ID</th>
              <th className="py-2.5 px-4">Metadata Payload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">
                  Loading audit logs...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">
                  No audit logs matching search.
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id} className="hover:bg-surface/50 font-mono text-[11px]">
                  <td className="py-3 px-4 text-muted whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="py-3 px-4 font-sans font-semibold text-charcoal">
                    {log.user_name}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-800 border border-zinc-200 font-bold">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-charcoal">
                    {log.entity_type} <span className="text-muted">({log.entity_id})</span>
                  </td>
                  <td className="py-3 px-4 text-muted-dark max-w-md truncate">
                    {log.details_json || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
