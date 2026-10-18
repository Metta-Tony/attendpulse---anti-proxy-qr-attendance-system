import React, { useState, useEffect, useRef } from 'react';
import {
  AttendanceRecord,
  Course,
  LectureSession,
  SecurityCheckResult,
  User,
  Venue,
} from '../types/attendance';
import { verifyScanAttempt } from '../services/attendanceEngine';
import { calculateHaversineDistance } from '../utils/geo';
import { generateRotatingToken } from '../utils/crypto';
import confetti from 'canvas-confetti';
import jsQR from 'jsqr';
import {
  Camera,
  Smartphone,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  ShieldAlert,
  Zap,
  Info,
} from 'lucide-react';

interface StudentPortalProps {
  currentStudent: User;
  allStudents: User[];
  onSelectStudent: (student: User) => void;
  session: LectureSession;
  course: Course;
  venue: Venue;
  attendanceRecords: AttendanceRecord[];
  onRecordAdded: (record: AttendanceRecord) => void;
  pastAttendanceCounts: Record<string, number>;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  currentStudent,
  allStudents,
  onSelectStudent,
  session,
  course,
  venue,
  attendanceRecords,
  onRecordAdded,
  pastAttendanceCounts,
}) => {
  // Device & Geolocation simulation states
  const [useRealCamera, setUseRealCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Student GPS coordinates simulation
  const [gpsPreset, setGpsPreset] = useState<'hall' | 'cafeteria' | 'hostel' | 'disabled'>('hall');
  // Device simulation
  const [simulateUnboundDevice, setSimulateUnboundDevice] = useState(false);

  // Verification result modal/card
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<SecurityCheckResult | null>(null);
  const [lastOutcomeReason, setLastOutcomeReason] = useState<string | null>(null);

  // Coordinates resolution based on preset
  let studentLat: number | undefined = venue.latitude + 0.00002;
  let studentLng: number | undefined = venue.longitude + 0.00001;

  if (gpsPreset === 'cafeteria') {
    studentLat = venue.latitude + 0.0012; // ~135m away
    studentLng = venue.longitude + 0.0006;
  } else if (gpsPreset === 'hostel') {
    studentLat = venue.latitude + 0.0043; // ~480m away
    studentLng = venue.longitude + 0.0021;
  } else if (gpsPreset === 'disabled') {
    studentLat = undefined;
    studentLng = undefined;
  }

  const simulatedDeviceId = simulateUnboundDevice
    ? 'DEV-UNBOUND-990022'
    : currentStudent.boundDeviceId || 'DEV-A49F2B81-4201';

  const simulatedDeviceModel = simulateUnboundDevice
    ? 'Unregistered Stranger Phone'
    : currentStudent.deviceModel || 'Samsung Galaxy A54';

  const currentDistanceMeters =
    studentLat !== undefined && studentLng !== undefined
      ? calculateHaversineDistance(studentLat, studentLng, venue.latitude, venue.longitude)
      : null;

  // Real Camera Scanner implementation using jsQR
  useEffect(() => {
    let stream: MediaStream | null = null;

    if (useRealCamera) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play();
          }
          setCameraError(null);

          // Poll canvas for QR codes
          scanIntervalRef.current = setInterval(() => {
            if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code && code.data) {
                  // Found QR!
                  handlePerformScan(code.data);
                  setUseRealCamera(false);
                }
              }
            }
          }, 300);
        })
        .catch((err) => {
          console.warn('Camera access not granted or unavailable:', err);
          setCameraError('Camera access unavailable. Use One-Tap Projected Scan below.');
          setUseRealCamera(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [useRealCamera]);

  // Execute Verification
  const handlePerformScan = async (tokenString: string) => {
    setIsVerifying(true);
    setLastCheckResult(null);
    setLastOutcomeReason(null);

    try {
      const outcome = await verifyScanAttempt({
        tokenRaw: tokenString,
        student: currentStudent,
        deviceId: simulatedDeviceId,
        deviceModel: simulatedDeviceModel,
        studentLatitude: studentLat,
        studentLongitude: studentLng,
        session,
        course,
        venue,
        existingRecords: attendanceRecords,
      });

      setLastCheckResult(outcome.checkResult);
      setLastOutcomeReason(outcome.reason || null);

      if (outcome.allowed && outcome.record) {
        onRecordAdded(outcome.record);
        confetti({
          particleCount: 60,
          spread: 55,
          origin: { y: 0.7 },
        });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // One-Tap Scan of Current Projected Token
  const handleScanCurrentProjectedToken = async () => {
    // Generate the exact live token that the projector is displaying
    const tokenObj = await generateRotatingToken(
      session.id,
      course.id,
      session.secretKey
    );
    await handlePerformScan(tokenObj.tokenString);
  };

  // Attack Test: Scan Expired Token (Replay Attack)
  const handleScanExpiredToken = async () => {
    const expiredTokenObj = await generateRotatingToken(
      session.id,
      course.id,
      session.secretKey,
      Math.floor(Date.now() / 1000) - 35
    );
    await handlePerformScan(expiredTokenObj.tokenString);
  };

  // Student 75% Attendance calculation for this course
  const pastAttended = pastAttendanceCounts[currentStudent.id] || 0;
  const isPresentToday = attendanceRecords.some(
    (r) =>
      r.sessionId === session.id &&
      r.studentId === currentStudent.id &&
      (r.status === 'success' || r.status === 'manual_override')
  );
  const totalAttended = pastAttended + (isPresentToday ? 1 : 0);
  const totalSessionsHeld = 8;
  const attendanceRate = Math.round((totalAttended / totalSessionsHeld) * 1000) / 10;
  const isEligible = attendanceRate >= 75.0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Student Profile & Quick Switcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Student Mobile Portal</span>
              <span aria-hidden="true">·</span>
              <span>No App Installation Required</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {currentStudent.name}
              <span className="text-xs font-mono font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                {currentStudent.matricOrStaffId}
              </span>
            </h1>
            <div className="text-xs text-slate-500 mt-1">
              <span>{currentStudent.department}</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{currentStudent.email}</span>
            </div>
          </div>

          {/* Quick Persona Switcher for Evaluation */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
              Test Student:
            </span>
            <select
              value={currentStudent.id}
              onChange={(e) => {
                const s = allStudents.find((item) => item.id === e.target.value);
                if (s) onSelectStudent(s);
              }}
              className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded font-medium text-slate-800"
            >
              {allStudents
                .filter((u) => u.role === 'student')
                .map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.name} ({stu.matricOrStaffId})
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Student Console: Scanner & Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Mobile Camera & QR Scanning */}
        <div className="md:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Attendance QR Scanner
              </h2>
              <span className="text-xs text-slate-500">
                Point at lecturer screen or tap one-click scan
              </span>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {course.code}
            </div>
          </div>

          {/* Real Camera Viewport */}
          {useRealCamera && (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-8 border-2 border-emerald-400/80 rounded-lg pointer-events-none" />
              <button
                onClick={() => setUseRealCamera(false)}
                className="absolute top-2 right-2 px-2 py-1 text-xs bg-slate-900/80 text-white rounded"
              >
                Close Camera
              </button>
            </div>
          )}

          {cameraError && (
            <div className="p-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg">
              {cameraError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleScanCurrentProjectedToken}
              disabled={isVerifying}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              {isVerifying ? 'Verifying 7 Security Layers...' : 'One-Tap Scan Active Projected QR'}
            </button>

            <button
              onClick={() => setUseRealCamera(!useRealCamera)}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4 text-slate-500" />
              {useRealCamera ? 'Close Camera Viewfinder' : 'Open Device Camera (Live Scanner)'}
            </button>
          </div>

          {/* Security Verification Result Box */}
          {lastCheckResult && (
            <div
              className={`p-4 rounded-xl border ${
                lastCheckResult.passed
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/80 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-start gap-3">
                {lastCheckResult.passed ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">
                      {lastCheckResult.passed ? 'Attendance Registered!' : 'Scan Rejected'}
                    </h3>
                    <span className="text-xs font-mono tabular-nums opacity-75">
                      {lastCheckResult.details.processingTimeMs}ms
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed opacity-90">
                    {lastCheckResult.message}
                  </p>

                  {/* 7 Check Breakdown Badges */}
                  <div className="pt-2 grid grid-cols-2 gap-1 text-[11px] font-mono">
                    <span
                      className={`flex items-center gap-1 ${
                        lastCheckResult.details.signatureValid
                          ? 'text-emerald-700'
                          : 'text-rose-700 font-semibold'
                      }`}
                    >
                      {lastCheckResult.details.signatureValid ? '✓' : '✗'} 1. Signature
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        lastCheckResult.details.sessionActive
                          ? 'text-emerald-700'
                          : 'text-rose-700 font-semibold'
                      }`}
                    >
                      {lastCheckResult.details.sessionActive ? '✓' : '✗'} 2. Time Window
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        lastCheckResult.details.tokenFresh
                          ? 'text-emerald-700'
                          : 'text-rose-700 font-semibold'
                      }`}
                    >
                      {lastCheckResult.details.tokenFresh ? '✓' : '✗'} 3. Freshness (&le;10s)
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        lastCheckResult.details.isEnrolled
                          ? 'text-emerald-700'
                          : 'text-rose-700 font-semibold'
                      }`}
                    >
                      {lastCheckResult.details.isEnrolled ? '✓' : '✗'} 4. Enrolment
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        lastCheckResult.details.deviceMatch
                          ? 'text-emerald-700'
                          : 'text-rose-700 font-semibold'
                      }`}
                    >
                      {lastCheckResult.details.deviceMatch ? '✓' : '✗'} 5. Bound Device
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        lastCheckResult.details.geofencePass
                          ? 'text-emerald-700'
                          : 'text-rose-700 font-semibold'
                      }`}
                    >
                      {lastCheckResult.details.geofencePass ? '✓' : '✗'} 6. Geofence ({lastCheckResult.details.distanceMeters}m)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attack Simulator Accordion / Testing Helpers */}
          <div className="pt-3 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-700 block mb-2">
              Integrity Attack Simulation (Quick Test)
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleScanExpiredToken}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition-colors"
                title="Replay an expired token from 35s ago"
              >
                Replay Expired QR (35s)
              </button>
              <button
                onClick={() => {
                  setGpsPreset('hostel');
                  setTimeout(() => handleScanCurrentProjectedToken(), 100);
                }}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition-colors"
                title="Scan while at hostel dormitory (480m)"
              >
                Geofence Attack (Hostel 480m)
              </button>
              <button
                onClick={() => {
                  setSimulateUnboundDevice(true);
                  setTimeout(() => handleScanCurrentProjectedToken(), 100);
                }}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition-colors"
                title="Scan on an unregistered phone"
              >
                Unbound Phone Attack
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Device Binding & Geofence Status */}
        <div className="md:col-span-5 space-y-6">
          {/* Device Binding Status Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-slate-500" />
                Registered Device Binding
              </span>
              <span className="text-[11px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                Hardware Bound
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 font-mono">
              <div className="text-slate-500 text-[11px]">Bound Device ID:</div>
              <div className="text-slate-900 font-semibold select-all break-all">
                {currentStudent.boundDeviceId || 'Unregistered'}
              </div>
              <div className="text-slate-500 text-[11px] pt-1">Model: {currentStudent.deviceModel || 'Generic Phone'}</div>
            </div>

            {/* Toggle unbound device simulator */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-600">Simulate foreign device:</span>
              <button
                onClick={() => setSimulateUnboundDevice(!simulateUnboundDevice)}
                className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                  simulateUnboundDevice
                    ? 'bg-rose-100 border-rose-300 text-rose-800'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {simulateUnboundDevice ? 'Unbound Active' : 'Normal Bound'}
              </button>
            </div>
          </div>

          {/* GPS Geofence Telemetry Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-500" />
                Venue Geofence ({venue.radiusMeters}m Max)
              </span>
              {currentDistanceMeters !== null && (
                <span
                  className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                    currentDistanceMeters <= venue.radiusMeters
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {currentDistanceMeters}m away
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500">
              Venue: <span className="font-semibold text-slate-800">{venue.name}</span>
            </div>

            {/* GPS Preset Switcher */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Simulate Student Physical Location:
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  onClick={() => setGpsPreset('hall')}
                  className={`px-2 py-1.5 rounded border text-center transition-colors ${
                    gpsPreset === 'hall'
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  In Theatre (2m)
                </button>
                <button
                  onClick={() => setGpsPreset('cafeteria')}
                  className={`px-2 py-1.5 rounded border text-center transition-colors ${
                    gpsPreset === 'cafeteria'
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Cafeteria (135m)
                </button>
                <button
                  onClick={() => setGpsPreset('hostel')}
                  className={`px-2 py-1.5 rounded border text-center transition-colors ${
                    gpsPreset === 'hostel'
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Hostel (480m)
                </button>
                <button
                  onClick={() => setGpsPreset('disabled')}
                  className={`px-2 py-1.5 rounded border text-center transition-colors ${
                    gpsPreset === 'disabled'
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  GPS Disabled
                </button>
              </div>
            </div>
          </div>

          {/* Personal 75% Attendance Progress Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-500" />
                {course.code} Attendance Standing
              </span>
              <span
                className={`text-xs font-mono font-bold ${
                  isEligible ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {attendanceRate.toFixed(1)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isEligible ? 'bg-emerald-600' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, attendanceRate)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 font-mono tabular-nums">
              <span>{totalAttended} / {totalSessionsHeld} Sessions Logged</span>
              <span>75.0% Required</span>
            </div>

            {!isEligible && (
              <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 flex items-start gap-2 text-xs text-rose-800">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>
                  Below 75% threshold! You are currently ineligible to sit for the final examination.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
