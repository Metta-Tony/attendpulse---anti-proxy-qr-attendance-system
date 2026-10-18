import React, { useState, useEffect } from 'react';
import {
  AttendanceRecord,
  Course,
  LectureSession,
  User,
  Venue,
} from '../types/attendance';
import { QrCodeCanvas } from './QrCodeCanvas';
import { ManualAttendanceModal } from './ManualAttendanceModal';
import { generateRotatingToken, generateSessionSecret } from '../utils/crypto';
import {
  Play,
  Pause,
  RefreshCw,
  Maximize2,
  Minimize2,
  UserPlus,
  Download,
  Printer,
  Key,
  ShieldCheck,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

interface LecturerDashboardProps {
  session: LectureSession;
  course: Course;
  venue: Venue;
  allStudents: User[];
  attendanceRecords: AttendanceRecord[];
  pastAttendanceCounts: Record<string, number>;
  onManualOverride: (studentId: string, reason: string) => void;
  onUpdateSession: (updated: LectureSession) => void;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({
  session,
  course,
  venue,
  allStudents,
  attendanceRecords,
  pastAttendanceCounts,
  onManualOverride,
  onUpdateSession,
}) => {
  const [currentTokenString, setCurrentTokenString] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(10);
  const [rotationCount, setRotationCount] = useState<number>(0);
  const [isProjectorMode, setIsProjectorMode] = useState<boolean>(false);
  const [showSecretKey, setShowSecretKey] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'live' | 'eligibility'>('live');
  const [eligibilityFilter, setEligibilityFilter] = useState<'all' | 'eligible' | 'barred'>('all');

  // Enrolled students for this course
  const enrolledStudents = allStudents.filter((s) =>
    course.enrolledStudentIds.includes(s.id)
  );

  // Present students in current session
  const currentSessionRecords = attendanceRecords.filter(
    (r) => r.sessionId === session.id && (r.status === 'success' || r.status === 'manual_override')
  );
  const presentStudentIds = new Set(currentSessionRecords.map((r) => r.studentId));

  // 10-Second QR Rotation Engine
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const updateToken = async () => {
      if (!session.isActive || session.isPaused) return;
      const { tokenString, payload } = await generateRotatingToken(
        session.id,
        course.id,
        session.secretKey
      );
      setCurrentTokenString(tokenString);
      setRotationCount(payload.rotationCounter);
    };

    // Immediate generation
    updateToken();

    // 1-second interval to drive the 10-second countdown
    timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remainder = 10 - (now % 10);
      setSecondsRemaining(remainder === 0 ? 10 : remainder);

      // Rotate token at boundary
      if (remainder === 10 || !currentTokenString) {
        updateToken();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session.id, session.secretKey, session.isActive, session.isPaused, course.id, currentTokenString]);

  // Handle Session Toggle Pause / Resume
  const handleTogglePause = () => {
    onUpdateSession({
      ...session,
      isPaused: !session.isPaused,
    });
  };

  // Handle Key Rollover
  const handleRegenerateSecret = () => {
    const newSecret = generateSessionSecret();
    onUpdateSession({
      ...session,
      secretKey: newSecret,
    });
  };

  // 75% Eligibility Calculations
  // Total sessions held = 7 prior + 1 today = 8 sessions
  const totalHeldSessions = 8;
  const studentEligibilityList = enrolledStudents.map((stu) => {
    const pastAttended = pastAttendanceCounts[stu.id] || 0;
    const isPresentToday = presentStudentIds.has(stu.id);
    const totalAttended = pastAttended + (isPresentToday ? 1 : 0);
    const attendancePercentage = Math.round((totalAttended / totalHeldSessions) * 1000) / 10;
    const isEligible = attendancePercentage >= 75.0;

    return {
      student: stu,
      totalAttended,
      totalHeldSessions,
      attendancePercentage,
      isEligible,
      isPresentToday,
    };
  });

  const filteredEligibility = studentEligibilityList.filter((item) => {
    if (eligibilityFilter === 'eligible') return item.isEligible;
    if (eligibilityFilter === 'barred') return !item.isEligible;
    return true;
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'Matric No,Name,Total Attended,Total Sessions,Percentage,Status,Present Today\n';
    const rows = studentEligibilityList
      .map(
        (i) =>
          `"${i.student.matricOrStaffId}","${i.student.name}",${i.totalAttended},${i.totalHeldSessions},${i.attendancePercentage}%,${i.isEligible ? 'ELIGIBLE' : 'BARRED (<75%)'},${i.isPresentToday ? 'YES' : 'NO'}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${course.code}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print Roster
  const handlePrint = () => {
    window.print();
  };

  const presentPercentage = Math.round(
    (presentStudentIds.size / Math.max(1, enrolledStudents.length)) * 100
  );

  return (
    <div className="space-y-6">
      {/* Top Session Summary Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>{course.code}</span>
              <span aria-hidden="true">·</span>
              <span>{course.department}</span>
              <span aria-hidden="true">·</span>
              <span>Session 8 of {course.totalPlannedSessions}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {session.topic}
            </h1>
            <div className="flex items-center gap-4 text-xs text-slate-600 mt-2">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {session.venueName} ({venue.radiusMeters}m geofence)
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Active Time Window
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-xs text-slate-500 block">Enrolled Present</span>
              <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {presentStudentIds.size} / {enrolledStudents.length}
                <span className="text-xs font-normal text-slate-500 ml-1.5">
                  ({presentPercentage}%)
                </span>
              </span>
            </div>
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              Manual Override
            </button>
          </div>
        </div>
      </div>

      {/* Main Split: QR Code Projection & Live Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: QR Code Display & 10-Second Rotation Watcher */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                10-Second Rotating Token
              </h2>
              <span className="text-xs text-slate-500">
                Signed HMAC-SHA256 Token
              </span>
            </div>
            <button
              onClick={() => setIsProjectorMode(true)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              title="Enter Fullscreen Projector Mode"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* QR Code Canvas */}
          <div className="relative p-2 bg-slate-50 rounded-xl border border-slate-200">
            {session.isPaused ? (
              <div className="w-64 h-64 flex flex-col items-center justify-center bg-slate-100 text-slate-500 rounded-lg p-6 text-center">
                <Pause className="w-10 h-10 text-amber-500 mb-2" />
                <span className="text-sm font-semibold text-slate-800">
                  Attendance Paused
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  Click Resume below to resume rotating tokens.
                </span>
              </div>
            ) : currentTokenString ? (
              <QrCodeCanvas value={currentTokenString} size={256} />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-slate-100 text-slate-400">
                Generating signed QR...
              </div>
            )}

            {/* Floating 10-Second Countdown Badge */}
            {!session.isPaused && (
              <div className="absolute -top-3 right-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-mono font-semibold rounded-full shadow-md flex items-center gap-1.5 tabular-nums">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{secondsRemaining}s</span>
              </div>
            )}
          </div>

          {/* 10s Countdown Progress Bar */}
          <div className="w-full mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Token Cycle: #{rotationCount}</span>
              <span className="font-mono tabular-nums">{secondsRemaining}s remaining</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsRemaining / 10) * 100}%` }}
              />
            </div>
          </div>

          {/* Session Security Controls */}
          <div className="w-full mt-6 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleTogglePause}
                className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg border transition-colors flex items-center justify-center gap-1.5 ${
                  session.isPaused
                    ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                    : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
              >
                {session.isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5" /> Resume Attendance
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause Attendance
                  </>
                )}
              </button>

              <button
                onClick={handleRegenerateSecret}
                className="py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
                title="Regenerate secret key if projector screen is compromised"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Rollover Key
              </button>
            </div>

            {/* Secret Key inspection accordion */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-600 font-medium">
                  <Key className="w-3 h-3 text-slate-400" /> Session HMAC Secret
                </span>
                <button
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="text-slate-500 hover:text-slate-800 underline"
                >
                  {showSecretKey ? 'Hide' : 'Reveal'}
                </button>
              </div>
              {showSecretKey && (
                <div className="mt-1.5 p-1.5 bg-white rounded border border-slate-200 font-mono text-[11px] text-slate-700 break-all select-all">
                  {session.secretKey}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Attendance Records & 75% Reports Tabs */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
          {/* Sub Tab Switcher */}
          <div className="px-6 pt-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setActiveSubTab('live')}
                className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
                  activeSubTab === 'live'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Live Attendance Feed ({currentSessionRecords.length})
              </button>
              <button
                onClick={() => setActiveSubTab('eligibility')}
                className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
                  activeSubTab === 'eligibility'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                75% Exam Eligibility List
              </button>
            </div>

            {activeSubTab === 'eligibility' && (
              <div className="flex items-center gap-2 pb-2">
                <button
                  onClick={handleExportCSV}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </div>
            )}
          </div>

          {/* SubTab 1: Live Attendance Feed */}
          {activeSubTab === 'live' && (
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
                <span>Recent verified student scans in this lecture</span>
                <span>Automatic 4.4ms latency verification</span>
              </div>

              {currentSessionRecords.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <Clock className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm font-medium text-slate-600">No scans logged yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    When students scan the projected QR code, their record will appear live.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="py-2.5 px-3">Student</th>
                        <th className="py-2.5 px-3">Matric No</th>
                        <th className="py-2.5 px-3">Device & Geofence</th>
                        <th className="py-2.5 px-3">Time</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentSessionRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {rec.studentName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums">
                            {rec.studentMatric}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            <div>{rec.deviceModel}</div>
                            {rec.distanceMeters !== undefined && (
                              <div className="text-[11px] text-slate-400">
                                {rec.distanceMeters}m from venue
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 tabular-nums">
                            {new Date(rec.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {rec.isManualOverride ? (
                              <span
                                className="inline-block text-amber-700 font-semibold cursor-help"
                                title={rec.overrideReason}
                              >
                                Manual Override
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Verified ({rec.processingTimeMs}ms)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SubTab 2: 75% Threshold Eligibility Report */}
          {activeSubTab === 'eligibility' && (
            <div className="p-6 flex-1 flex flex-col">
              {/* Filter Tabs */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    onClick={() => setEligibilityFilter('all')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      eligibilityFilter === 'all'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Enrolled ({studentEligibilityList.length})
                  </button>
                  <button
                    onClick={() => setEligibilityFilter('eligible')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      eligibilityFilter === 'eligible'
                        ? 'bg-white text-emerald-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Eligible &ge;75% ({studentEligibilityList.filter((i) => i.isEligible).length})
                  </button>
                  <button
                    onClick={() => setEligibilityFilter('barred')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      eligibilityFilter === 'barred'
                        ? 'bg-white text-rose-800 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Barred &lt;75% ({studentEligibilityList.filter((i) => !i.isEligible).length})
                  </button>
                </div>

                <div className="text-xs text-slate-500">
                  <span>Threshold: 75.0% Required</span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Matric No</th>
                      <th className="py-2.5 px-3">Sessions Attended</th>
                      <th className="py-2.5 px-3">Attendance %</th>
                      <th className="py-2.5 px-3">Today</th>
                      <th className="py-2.5 px-3 text-right">Exam Eligibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEligibility.map((item) => (
                      <tr key={item.student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          {item.student.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums">
                          {item.student.matricOrStaffId}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 tabular-nums">
                          {item.totalAttended} / {item.totalHeldSessions}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold tabular-nums">
                          <span
                            className={
                              item.isEligible ? 'text-slate-900' : 'text-rose-600'
                            }
                          >
                            {item.attendancePercentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.isPresentToday ? (
                            <span className="text-emerald-700 font-medium">Present</span>
                          ) : (
                            <span className="text-slate-400">Absent</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {item.isEligible ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Eligible
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Barred (&lt;75%)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Projector Modal for Lecture Theatres */}
      {isProjectorMode && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-8 items-center justify-center">
          <button
            onClick={() => setIsProjectorMode(false)}
            className="absolute top-6 right-6 p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors"
            title="Exit Projector Mode"
          >
            <Minimize2 className="w-6 h-6" />
          </button>

          <div className="text-center max-w-2xl mb-6">
            <span className="text-slate-400 text-sm font-semibold tracking-wider uppercase">
              {course.code} · {venue.name}
            </span>
            <h2 className="text-3xl font-extrabold text-white mt-1">
              Scan to Register Attendance
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Cryptographically signed QR code rotates every 10 seconds. Device binding & venue geofence verified.
            </p>
          </div>

          {/* Big Projector Canvas */}
          <div className="relative p-6 bg-white rounded-3xl shadow-2xl">
            {currentTokenString ? (
              <QrCodeCanvas value={currentTokenString} size={380} />
            ) : (
              <div className="w-96 h-96 flex items-center justify-center text-slate-400">
                Loading...
              </div>
            )}
            <div className="absolute -top-4 right-8 px-4 py-2 bg-slate-900 text-white text-base font-mono font-bold rounded-full shadow-lg flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{secondsRemaining}s</span>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-8 text-slate-300 text-sm font-mono tabular-nums">
            <span>Cycle #{rotationCount}</span>
            <span>·</span>
            <span>{presentStudentIds.size} / {enrolledStudents.length} Students Logged</span>
          </div>
        </div>
      )}

      {/* Manual Override Modal */}
      <ManualAttendanceModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        session={session}
        course={course}
        students={allStudents}
        alreadyMarkedStudentIds={Array.from(presentStudentIds)}
        onSubmitOverride={onManualOverride}
      />
    </div>
  );
};
