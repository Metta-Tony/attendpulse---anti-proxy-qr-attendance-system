import React, { useState } from 'react';
import {
  Course,
  SecurityAuditLog,
  User,
  Venue,
} from '../types/attendance';
import {
  Users,
  Building2,
  FileText,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Download,
  Shield,
  Smartphone,
  Sliders,
} from 'lucide-react';

interface AdminConsoleProps {
  users: User[];
  courses: Course[];
  venues: Venue[];
  auditLogs: SecurityAuditLog[];
  onResetDeviceBinding: (studentId: string) => void;
  onUpdateVenueRadius: (venueId: string, radiusMeters: number) => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  users,
  courses,
  venues,
  auditLogs,
  onResetDeviceBinding,
  onUpdateVenueRadius,
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'audit' | 'users' | 'venues'>('audit');
  const [searchTerm, setSearchTerm] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'ALLOWED' | 'BLOCKED'>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');

  // Filtered Audit Logs
  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.studentMatric.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.deviceId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOutcome = outcomeFilter === 'all' || log.outcome === outcomeFilter;
    const matchesReason = reasonFilter === 'all' || log.reason === reasonFilter;

    return matchesSearch && matchesOutcome && matchesReason;
  });

  // Export Audit CSV
  const handleExportAuditCSV = () => {
    const headers =
      'Timestamp,Student Matric,Student Name,Action,Outcome,Reason,Checks Failed,Device ID,Distance (m),Latency (ms)\n';
    const rows = filteredLogs
      .map(
        (l) =>
          `"${l.timestamp}","${l.studentMatric}","${l.studentName}","${l.action}","${l.outcome}","${l.reason || ''}","${l.checksFailed.join(';') || ''}","${l.deviceId}",${l.distanceMeters || ''},${l.processingTimeMs}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security_audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Institution Administration & Audit</span>
              <span aria-hidden="true">·</span>
              <span>Central Governance Console</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Academic Registry & Integrity Center
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Real-time audit trailing, device bindings, and venue parameter management.
            </p>
          </div>

          {/* Admin Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setActiveAdminTab('audit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeAdminTab === 'audit'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Security Audit Log ({auditLogs.length})
            </button>
            <button
              onClick={() => setActiveAdminTab('users')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeAdminTab === 'users'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Users & Devices ({users.length})
            </button>
            <button
              onClick={() => setActiveAdminTab('venues')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeAdminTab === 'venues'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Venues & Geofences ({venues.length})
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: AUDIT LOG */}
      {activeAdminTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search matric, name, or device..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md w-60 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Outcome filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 font-medium">Outcome:</span>
                <select
                  value={outcomeFilter}
                  onChange={(e) => setOutcomeFilter(e.target.value as any)}
                  className="px-2 py-1 text-xs bg-white border border-slate-300 rounded font-medium text-slate-800"
                >
                  <option value="all">All Outcomes</option>
                  <option value="ALLOWED">Allowed Only</option>
                  <option value="BLOCKED">Blocked Only</option>
                </select>
              </div>

              {/* Reason filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 font-medium">Failure Reason:</span>
                <select
                  value={reasonFilter}
                  onChange={(e) => setReasonFilter(e.target.value)}
                  className="px-2 py-1 text-xs bg-white border border-slate-300 rounded font-medium text-slate-800"
                >
                  <option value="all">All Reasons</option>
                  <option value="TOKEN_EXPIRED">Expired / Replay</option>
                  <option value="OUTSIDE_GEOFENCE">Outside Geofence</option>
                  <option value="DEVICE_MISMATCH">Device Mismatch</option>
                  <option value="DUPLICATE_SCAN">Duplicate Scan</option>
                  <option value="INVALID_SIGNATURE">Invalid Signature</option>
                  <option value="NOT_ENROLLED">Not Enrolled</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleExportAuditCSV}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors flex items-center gap-1.5 self-start md:self-auto"
            >
              <Download className="w-3.5 h-3.5" /> Export Audit Trail
            </button>
          </div>

          {/* Audit Log Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Course</th>
                  <th className="py-2.5 px-3">Outcome</th>
                  <th className="py-2.5 px-3">Rejection Reason / Checks</th>
                  <th className="py-2.5 px-3">Distance & Device</th>
                  <th className="py-2.5 px-3 text-right">Server Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No matching audit records found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{log.studentName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{log.studentMatric}</div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {log.courseCode}
                      </td>
                      <td className="py-2.5 px-3">
                        {log.outcome === 'ALLOWED' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ALLOWED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                            <XCircle className="w-3.5 h-3.5" /> BLOCKED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {log.reason ? (
                          <span className="font-semibold text-rose-700 font-mono text-[11px]">
                            {log.reason}
                          </span>
                        ) : (
                          <span className="text-emerald-700 text-[11px]">All 7 layers verified</span>
                        )}
                        {log.checksFailed && log.checksFailed.length > 0 && (
                          <div className="text-[10px] text-slate-400">
                            Failed: {log.checksFailed.join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        <div>{log.deviceId}</div>
                        {log.distanceMeters !== undefined && (
                          <div className="text-slate-400">{log.distanceMeters}m from venue</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700 tabular-nums">
                        {log.processingTimeMs} ms
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: USERS & DEVICE BINDINGS */}
      {activeAdminTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Enrolled Students & Registered Hardware Bindings
            </h2>
            <span className="text-xs text-slate-500">
              One device per student (anti-proxy enforcement)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                  <th className="py-2.5 px-3">Matric / Staff ID</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Role & Dept</th>
                  <th className="py-2.5 px-3">Bound Device Fingerprint</th>
                  <th className="py-2.5 px-3">Device Model</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                      {u.matricOrStaffId}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      {u.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span className="capitalize">{u.role}</span> · {u.department}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                      {u.boundDeviceId ? (
                        <span>{u.boundDeviceId}</span>
                      ) : (
                        <span className="text-slate-400 italic">No device bound</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {u.deviceModel || 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {u.role === 'student' && u.boundDeviceId && (
                        <button
                          onClick={() => onResetDeviceBinding(u.id)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors inline-flex items-center gap-1"
                          title="Reset student's hardware binding if they replace their phone"
                        >
                          <RefreshCw className="w-3 h-3 text-slate-500" />
                          Reset Binding
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: VENUES & GEOFENCES */}
      {activeAdminTab === 'venues' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Lecture Venue Coordinates & Geofencing Parameters
              </h2>
              <span className="text-xs text-slate-500">
                Haversine radius thresholds applied during attendance scan
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {venues.map((ven) => (
              <div
                key={ven.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{ven.name}</span>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-200 rounded">
                    {ven.code}
                  </span>
                </div>
                <div className="text-xs text-slate-500">{ven.building}</div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1 text-xs font-mono">
                  <div className="text-slate-500">
                    Lat: <span className="text-slate-800 font-semibold">{ven.latitude}</span>
                  </div>
                  <div className="text-slate-500">
                    Lng: <span className="text-slate-800 font-semibold">{ven.longitude}</span>
                  </div>
                  <div className="text-slate-500">
                    Capacity: <span className="text-slate-800 font-semibold">{ven.capacity} seats</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                    <span>Geofence Radius:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {ven.radiusMeters} meters
                    </span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="150"
                    step="5"
                    value={ven.radiusMeters}
                    onChange={(e) =>
                      onUpdateVenueRadius(ven.id, parseInt(e.target.value, 10))
                    }
                    className="w-full accent-slate-900"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>15m (Tight)</span>
                    <span>50m (Standard)</span>
                    <span>150m (Auditorium)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
