export type UserRole = 'student' | 'lecturer' | 'admin';

export interface User {
  id: string;
  matricOrStaffId: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  boundDeviceId?: string;
  deviceModel?: string;
  avatarUrl?: string;
  enrolledCourseIds?: string[];
}

export interface Venue {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  building: string;
  capacity: number;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  lecturerId: string;
  lecturerName: string;
  department: string;
  creditUnits: number;
  semester: string;
  totalPlannedSessions: number;
  enrolledStudentIds: string[];
}

export interface LectureSession {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  lecturerId: string;
  venueId: string;
  venueName: string;
  secretKey: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  isActive: boolean;
  isPaused: boolean;
  topic: string;
  date: string;
}

export interface RotatingTokenPayload {
  sessionId: string;
  courseId: string;
  timestamp: number; // Unix timestamp in seconds
  rotationCounter: number; // Increments every 10s
  signature: string; // HMAC-SHA256
}

export type ScanStatus = 'success' | 'rejected' | 'manual_override';

export type RejectionReason =
  | 'INVALID_SIGNATURE'
  | 'SESSION_INACTIVE'
  | 'TOKEN_EXPIRED'
  | 'NOT_ENROLLED'
  | 'DEVICE_MISMATCH'
  | 'OUTSIDE_GEOFENCE'
  | 'DUPLICATE_SCAN'
  | 'MALFORMED_TOKEN'
  | 'STUDENT_NOT_FOUND';

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  courseId: string;
  studentId: string;
  studentMatric: string;
  studentName: string;
  timestamp: string;
  status: ScanStatus;
  rejectionReason?: RejectionReason;
  rejectionDetail?: string;
  deviceId: string;
  deviceModel: string;
  studentLatitude?: number;
  studentLongitude?: number;
  distanceMeters?: number;
  processingTimeMs: number;
  isManualOverride: boolean;
  overrideReason?: string;
  overrideByLecturerId?: string;
}

export interface SecurityCheckResult {
  passed: boolean;
  failedCheck?: 'signature' | 'session_window' | 'freshness' | 'enrolment' | 'device' | 'geofence' | 'duplicate';
  message: string;
  details: {
    signatureValid: boolean;
    sessionActive: boolean;
    tokenAgeSeconds: number;
    tokenFresh: boolean;
    isEnrolled: boolean;
    deviceMatch: boolean;
    distanceMeters: number;
    geofencePass: boolean;
    alreadyRecorded: boolean;
    processingTimeMs: number;
  };
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  sessionId: string;
  courseCode: string;
  studentMatric: string;
  studentName: string;
  action: 'SCAN_ATTEMPT' | 'MANUAL_OVERRIDE' | 'DEVICE_RESET' | 'SESSION_SECRET_ROLLOVER';
  outcome: 'ALLOWED' | 'BLOCKED';
  reason?: string;
  checksFailed: string[];
  clientIp: string;
  deviceId: string;
  distanceMeters?: number;
  processingTimeMs: number;
}

export interface TestCaseResult {
  id: number;
  title: string;
  category: 'Cryptography' | 'Freshness/Replay' | 'Device Binding' | 'Geofence' | 'Business Logic' | 'Session Window';
  attackDescription: string;
  expectedOutcome: 'ALLOWED' | 'BLOCKED';
  actualOutcome: 'ALLOWED' | 'BLOCKED';
  expectedReason?: string;
  actualReason?: string;
  processingTimeMs: number;
  passed: boolean;
  executedAt?: string;
}

export interface BenchmarkStats {
  totalScans: number;
  successfulScans: number;
  blockedScans: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  meanLatencyMs: number;
  medianLatencyMs: number;
  p95LatencyMs: number;
}
