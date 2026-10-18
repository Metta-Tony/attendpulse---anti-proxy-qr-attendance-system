import React, { useState, useEffect } from 'react';
import {
  AttendanceRecord,
  Course,
  LectureSession,
  User,
  Venue,
} from '../types/attendance';
import { QrCodeCanvas } from './QrCodeCanvas';
import { generateRotatingToken } from '../utils/crypto';
import { verifyScanAttempt } from '../services/attendanceEngine';
import confetti from 'canvas-confetti';
import {
  Smartphone,
  Tv,
  Zap,
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  ShieldAlert,
  ArrowRight,
  RotateCw,
} from 'lucide-react';

interface DualSimModeProps {
  session: LectureSession;
  course: Course;
  venue: Venue;
  allStudents: User[];
  attendanceRecords: AttendanceRecord[];
  onRecordAdded: (record: AttendanceRecord) => void;
}

export const DualSimMode: React.FC<DualSimModeProps> = ({
  session,
  course,
  venue,
  allStudents,
  attendanceRecords,
  onRecordAdded,
}) => {
  // Lecturer QR rotation state
  const [currentTokenString, setCurrentTokenString] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(10);
  const [rotationCounter, setRotationCounter] = useState(0);

  // Student simulation state
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    allStudents.find((s) => s.role === 'student')?.id || ''
  );
  const [gpsPreset, setGpsPreset] = useState<'hall' | 'cafeteria' | 'hostel'>('hall');
  const [isUnboundPhone, setIsUnboundPhone] = useState(false);
  const [scanResult, setScanResult] = useState<{
    allowed: boolean;
    reason?: string;
    message: string;
    latencyMs: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedStudent =
    allStudents.find((s) => s.id === selectedStudentId) || allStudents[2];

  // 10s rotation timer
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const refresh = async () => {
      const { tokenString, payload } = await generateRotatingToken(
        session.id,
        course.id,
        session.secretKey
      );
      setCurrentTokenString(tokenString);
      setRotationCounter(payload.rotationCounter);
    };

    refresh();

    timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const rem = 10 - (now % 10);
      setSecondsRemaining(rem === 0 ? 10 : rem);

      if (rem === 10 || !currentTokenString) {
        refresh();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session.id, session.secretKey, course.id, currentTokenString]);

  // Coordinates
  let lat = venue.latitude + 0.00001;
  let lng = venue.longitude + 0.00001;
  if (gpsPreset === 'cafeteria') {
    lat = venue.latitude + 0.0012; // 135m
    lng = venue.longitude + 0.0006;
  } else if (gpsPreset === 'hostel') {
    lat = venue.latitude + 0.0043; // 480m
    lng = venue.longitude + 0.0021;
  }

  const deviceId = isUnboundPhone
    ? 'DEV-UNKNOWN-7711'
    : selectedStudent.boundDeviceId || 'DEV-A49F2B81-4201';

  // Perform Scan
  const handleScan = async (useExpired = false) => {
    setIsProcessing(true);
    setScanResult(null);

    try {
      let tokenToScan = currentTokenString;
      if (useExpired) {
        const expiredObj = await generateRotatingToken(
          session.id,
          course.id,
          session.secretKey,
          Math.floor(Date.now() / 1000) - 35
        );
        tokenToScan = expiredObj.tokenString;
      }

      const outcome = await verifyScanAttempt({
        tokenRaw: tokenToScan,
        student: selectedStudent,
        deviceId,
        deviceModel: isUnboundPhone ? 'Stranger Phone' : (selectedStudent.deviceModel || 'Samsung A54'),
        studentLatitude: lat,
        studentLongitude: lng,
        session,
        course,
        venue,
        existingRecords: attendanceRecords,
      });

      setScanResult({
        allowed: outcome.allowed,
        reason: outcome.reason,
        message: outcome.detail,
        latencyMs: outcome.checkResult.details.processingTimeMs,
      });

      if (outcome.allowed && outcome.record) {
        onRecordAdded(outcome.record);
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { x: 0.75, y: 0.6 },
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const currentSessionRecords = attendanceRecords.filter(
    (r) => r.sessionId === session.id && (r.status === 'success' || r.status === 'manual_override')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
            <span>Interactive Real-Time Testbench</span>
            <span aria-hidden="true">·</span>
            <span>Dual Screen Simulation</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Lecturer Projector Screen vs. Student Smartphone
          </h1>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span className="font-semibold text-slate-700">{course.code}</span>
          <span aria-hidden="true">·</span>
          <span>{session.venueName}</span>
        </div>
      </div>

      {/* Dual Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Lecturer Projector Screen */}
        <div className="lg:col-span-6 bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Tv className="w-4 h-4 text-emerald-400" />
              Lecturer Projector Display
            </span>
            <div className="text-xs font-mono text-slate-400">
              Cycle #{rotationCounter}
            </div>
          </div>

          {/* Big QR Display */}
          <div className="relative p-4 bg-white rounded-2xl shadow-md my-2">
            {currentTokenString ? (
              <QrCodeCanvas value={currentTokenString} size={240} />
            ) : (
              <div className="w-60 h-60 flex items-center justify-center text-slate-400">
                Generating QR...
              </div>
            )}

            {/* Countdown Badge */}
            <div className="absolute -top-3 right-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-mono font-bold rounded-full shadow border border-slate-700 flex items-center gap-1.5 tabular-nums">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{secondsRemaining}s</span>
            </div>
          </div>

          {/* 10s Bar */}
          <div className="w-full max-w-xs mt-3">
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsRemaining / 10) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
              <span>Token rotates every 10 seconds</span>
              <span className="font-mono tabular-nums">{secondsRemaining}s</span>
            </div>
          </div>

          {/* Live Attendance List on Projector */}
          <div className="w-full mt-6 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-300">
                Live Class Roster ({currentSessionRecords.length} Present)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Real-Time Sync</span>
            </div>

            <div className="bg-slate-950/70 rounded-lg p-2 max-h-48 overflow-y-auto space-y-1.5 text-xs">
              {currentSessionRecords.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-xs">
                  No scans logged yet. Use phone on the right to scan!
                </div>
              ) : (
                currentSessionRecords.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800 text-slate-200"
                  >
                    <div>
                      <span className="font-medium text-white">{r.studentName}</span>
                      <span className="text-[11px] text-slate-400 font-mono ml-2">
                        {r.studentMatric}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400">
                      {new Date(r.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Student Smartphone Device */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-md flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <Smartphone className="w-4 h-4 text-slate-600" />
              Student Smartphone (Web Browser)
            </span>
            <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
              Device Bound
            </span>
          </div>

          {/* Persona & Location Switcher */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Active Student:</label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setScanResult(null);
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-medium text-slate-800"
              >
                {allStudents
                  .filter((u) => u.role === 'student')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.matricOrStaffId})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Physical Location:</label>
              <select
                value={gpsPreset}
                onChange={(e) => {
                  setGpsPreset(e.target.value as any);
                  setScanResult(null);
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded font-medium text-slate-800"
              >
                <option value="hall">In Lecture Hall (~2m from venue)</option>
                <option value="cafeteria">Cafeteria (~135m - Out of Bounds)</option>
                <option value="hostel">Hostel Dormitory (~480m - Proxy)</option>
              </select>
            </div>
          </div>

          {/* Bound Phone Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-700 font-medium block">Hardware Identification:</span>
              <span className="text-[11px] font-mono text-slate-500">
                {isUnboundPhone ? 'DEV-UNKNOWN-7711 (Unbound)' : selectedStudent.boundDeviceId}
              </span>
            </div>
            <button
              onClick={() => {
                setIsUnboundPhone(!isUnboundPhone);
                setScanResult(null);
              }}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors ${
                isUnboundPhone
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {isUnboundPhone ? 'Using Unbound Device' : 'Using Bound Device'}
            </button>
          </div>

          {/* Scan Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => handleScan(false)}
              disabled={isProcessing}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              {isProcessing ? 'Verifying 7 Security Layers...' : 'Scan Active QR Code'}
            </button>

            <button
              onClick={() => handleScan(true)}
              disabled={isProcessing}
              className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Simulate Replay Attack (Scan 35s Expired Token)
            </button>
          </div>

          {/* Instant Verification Feedback */}
          {scanResult && (
            <div
              className={`p-4 rounded-xl border mt-2 ${
                scanResult.allowed
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {scanResult.allowed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs">
                      {scanResult.allowed ? 'Attendance Accepted' : 'Scan Blocked'}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums opacity-75">
                      Latency: {scanResult.latencyMs} ms
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">{scanResult.message}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
