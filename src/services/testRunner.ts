import { BenchmarkStats, Course, LectureSession, TestCaseResult, User, Venue, AttendanceRecord } from '../types/attendance';
import { generateRotatingToken, generateSessionSecret } from '../utils/crypto';
import { verifyScanAttempt } from './attendanceEngine';

export interface TestRunnerEnvironment {
  session: LectureSession;
  course: Course;
  venue: Venue;
  validStudent: User;
  unregisteredStudent: User;
  existingRecords: AttendanceRecord[];
}

export async function run19SecurityTestCases(
  env: TestRunnerEnvironment,
  onProgress?: (index: number, total: number, result: TestCaseResult) => void
): Promise<TestCaseResult[]> {
  const results: TestCaseResult[] = [];
  const total = 19;

  // Pre-generate a valid current token
  const validTokenObj = await generateRotatingToken(
    env.session.id,
    env.course.id,
    env.session.secretKey
  );

  // Pre-generate an expired token (35 seconds ago)
  const expiredNow = Math.floor(Date.now() / 1000) - 35;
  const expiredTokenObj = await generateRotatingToken(
    env.session.id,
    env.course.id,
    env.session.secretKey,
    expiredNow
  );

  // Pre-generate a forged token with invalid secret
  const forgedTokenObj = await generateRotatingToken(
    env.session.id,
    env.course.id,
    'deadbeef00112233445566778899aabb'
  );

  // Test Case Definitions
  const testDefs = [
    {
      id: 1,
      title: 'TC-01: Baseline Legitimate Scan',
      category: 'Business Logic' as const,
      attackDescription: 'Enrolled student scans current token with bound phone at venue location.',
      expectedOutcome: 'ALLOWED' as const,
      expectedReason: undefined,
      run: async () => {
        return verifyScanAttempt({
          tokenRaw: validTokenObj.tokenString,
          student: env.validStudent,
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: env.validStudent.deviceModel || 'Samsung Galaxy A54',
          studentLatitude: env.venue.latitude + 0.00002, // ~2.2m from venue center
          studentLongitude: env.venue.longitude + 0.00001,
          session: env.session,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords.filter(r => r.studentId !== env.validStudent.id),
        });
      },
    },
    {
      id: 2,
      title: 'TC-02: Replay Attack (35s Expired Token)',
      category: 'Freshness/Replay' as const,
      attackDescription: 'Student replays a captured QR code screenshot taken 35 seconds prior.',
      expectedOutcome: 'BLOCKED' as const,
      expectedReason: 'TOKEN_EXPIRED',
      run: async () => {
        return verifyScanAttempt({
          tokenRaw: expiredTokenObj.tokenString,
          student: env.validStudent,
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          studentLatitude: env.venue.latitude,
          studentLongitude: env.venue.longitude,
          session: env.session,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords.filter(r => r.studentId !== env.validStudent.id),
        });
      },
    },
    {
      id: 3,
      title: 'TC-03: Replay Attack (5-Minute Old Token)',
      category: 'Freshness/Replay' as const,
      attackDescription: 'Student replays an intercepted token from 300 seconds ago via messaging app.',
      expectedOutcome: 'BLOCKED' as const,
      expectedReason: 'TOKEN_EXPIRED',
      run: async () => {
        const fiveMinOld = await generateRotatingToken(
          env.session.id,
          env.course.id,
          env.session.secretKey,
          Math.floor(Date.now() / 1000) - 300
        );
        return verifyScanAttempt({
          tokenRaw: fiveMinOld.tokenString,
          student: env.validStudent,
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          studentLatitude: env.venue.latitude,
          studentLongitude: env.venue.longitude,
          session: env.session,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords.filter(r => r.studentId !== env.validStudent.id),
        });
      },
    },
    {
      id: 4,
      title: 'TC-04: Cryptographic Forgery (Altered Signature)',
      category: 'Cryptography' as const,
      attackDescription: 'Attacker creates a custom token with a modified HMAC signature string.',
      expectedOutcome: 'BLOCKED' as const,
      expectedReason: 'INVALID_SIGNATURE',
      run: async () => {
        // Tamper with the signature bytes in payload
        const tampered = { ...validTokenObj.payload, signature: validTokenObj.payload.signature.slice(0, -6) + 'abcdef' };
        const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(tampered))));
        return verifyScanAttempt({
          tokenRaw: `ATTEND_SEC_v1:${b64}`,
          student: env.validStudent,
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          studentLatitude: env.venue.latitude,
          studentLongitude: env.venue.longitude,
          session: env.session,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords.filter(r => r.studentId !== env.validStudent.id),
        });
      },
    },
    {
      id: 5,
      title: 'TC-05: Key Forgery (Wrong Session Secret)',
      category: 'Cryptography' as const,
      attackDescription: 'Attacker calculates HMAC signature using an unauthorized guess secret key.',
      expectedOutcome: 'BLOCKED' as const,
      expectedReason: 'INVALID_SIGNATURE',
      run: async () => {
        return verifyScanAttempt({
          tokenRaw: forgedTokenObj.tokenString,
          student: env.validStudent,
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          studentLatitude: env.venue.latitude,
          studentLongitude: env.venue.longitude,
          session: env.session,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords.filter(r => r.studentId !== env.validStudent.id),
        });
      },
    },
    {
      id: 6,
      title: 'TC-06: Malformed QR Payload',
      category: 'Cryptography' as const,
      attackDescription: 'Attacker generates non-base64 garbage or arbitrary URL QR code.',
      expectedOutcome: 'BLOCKED' as const,
      expectedReason: 'MALFORMED_TOKEN',
      run: async () => {
        return verifyScanAttempt({
          tokenRaw: 'https://malicious-site.example/attendance-hack',
          student: env.validStudent,
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          studentLatitude: env.venue.latitude,
          studentLongitude: env.venue.longitude,
          session: env.session,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords.filter(r => r.studentId !== env.validStudent.id),
        });
      },
    },
    {
      id: 7,
      title: 'TC-07: Unregistered Phone Device (Device Spoofing)',
      category: 'Device Binding' as const,
      attackDescription: 'Student borrows a stranger’s phone not bound to their account.',
      expectedOutcome: 'BLOCKED' as const,
      expectedReason: 'DEVICE_MISMATCH',
      run: async () => {
        return verifyScanAttempt({
          tokenRaw: validTokenObj.tokenString,
          student: env.validStudent,
          deviceId: 'DEV-UNKNOWN-998811',
          deviceModel: 'Unregistered Tablet',
          studentLatitude: env.venue.latitude,
          studentLongitude: env.venue.longitude,
          session: env.session,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords.filter(r => r.studentId !== env.validStudent.id),
        });
      },
    },
    {
      id: 8,
      title: 'TC-08: Proxy Device Hand-off (Student B Phone)',
      category: 'Device Binding' as const,
      attackDescription: 'Present student attempts to log absent friend using present student’s device.',
      expectedOutcome: 'BLOCKED' as const,
      expectedReason: 'DEVICE_MISMATCH',
      run: async () => {
        return verifyScanAttempt({
          tokenRaw: validTokenObj.tokenString,
          student: env.validStudent, // Valid student Tobi
          deviceId: 'DEV-7B12C09A-1902', // Chioma's phone device
          deviceModel: 'Apple iPhone 13',
          studentLatitude: env.venue.latitude,
          studentLongitude: env.venue.longitude,
          session: env.session,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords.filter(r => r.studentId !== env.validStudent.id),
        });
      },
    },
    {
      id: 9,
      title: 'TC-09: Geofence Breach - Hostel Dormitory (480m)',
      category: 'Geofence' as const,
      attackDescription: 'Student scans QR code photo shared on WhatsApp from campus hostel 480m away.',
      expectedOutcome: 'BLOCKED' as const,
      expectedReason: 'OUTSIDE_GEOFENCE',
      run: async () => {
        return verifyScanAttempt({
          tokenRaw: validTokenObj.tokenString,
          student: env.validStudent,
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          studentLatitude: env.venue.latitude + 0.0043, // ~480m away
          studentLongitude: env.venue.longitude + 0.0021,
          session: env.session,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords.filter(r => r.studentId !== env.validStudent.id),
        });
      },
    },
    {
      id: 10,
      title: 'TC-10: Geofence Breach - Faculty Cafeteria (135m)',
      category: 'Geofence' as const,
      attackDescription: 'Student scans from cafeteria building outside the 50m lecture venue perimeter.',
      expectedOutcome: 'BLOCKED' as const,
      expectedReason: 'OUTSIDE_GEOFENCE',
      run: async () => {
        return verifyScanAttempt({
          tokenRaw: validTokenObj.tokenString,
          student: env.validStudent,
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          studentLatitude: env.venue.latitude + 0.0012, // ~135m away
          studentLongitude: env.venue.longitude + 0.0006,
          session: env.session,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords.filter(r => r.studentId !== env.validStudent.id),
        });
      },
    },
    {
      id: 11,
      title: 'TC-11: Geofence Failure - Missing GPS Telemetry',
      category: 'Geofence' as const,
      attackDescription: 'Student disables GPS location permissions in mobile browser.',
      expectedOutcome: 'BLOCKED' as const,
      expectedReason: 'OUTSIDE_GEOFENCE',
      run: async () => {
        return verifyScanAttempt({
          tokenRaw: validTokenObj.tokenString,
          student: env.validStudent,
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          studentLatitude: undefined, // Missing GPS
          studentLongitude: undefined,
          session: env.session,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords.filter(r => r.studentId !== env.validStudent.id),
        });
      },
    },
    {
      id: 12,
      title: 'TC-12: Duplicate Scan - Immediate Rescan',
      category: 'Business Logic' as const,
      attackDescription: 'Student taps scan button twice in rapid succession.',
      expectedOutcome: 'BLOCKED' as const,
      expectedReason: 'DUPLICATE_SCAN',
      run: async () => {
        const dummyPriorRecord: AttendanceRecord = {
          id: 'prior-1',
          sessionId: env.session.id,
          courseId: env.course.id,
          studentId: env.validStudent.id,
          studentMatric: env.validStudent.matricOrStaffId,
          studentName: env.validStudent.name,
          timestamp: new Date().toISOString(),
          status: 'success',
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          processingTimeMs: 4.2,
          isManualOverride: false,
        };
        return verifyScanAttempt({
          tokenRaw: validTokenObj.tokenString,
          student: env.validStudent,
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          studentLatitude: env.venue.latitude,
          studentLongitude: env.venue.longitude,
          session: env.session,
          course: env.course,
          venue: env.venue,
          existingRecords: [...env.existingRecords, dummyPriorRecord],
        });
      },
    },
    {
      id: 13,
      title: 'TC-13: Duplicate Scan - Next Rotation Cycle',
      category: 'Business Logic' as const,
      attackDescription: 'Student already recorded attempts to scan the next 10-second token.',
      expectedOutcome: 'BLOCKED' as const,
      expectedReason: 'DUPLICATE_SCAN',
      run: async () => {
        const dummyPriorRecord: AttendanceRecord = {
          id: 'prior-2',
          sessionId: env.session.id,
          courseId: env.course.id,
          studentId: env.validStudent.id,
          studentMatric: env.validStudent.matricOrStaffId,
          studentName: env.validStudent.name,
          timestamp: new Date(Date.now() - 30000).toISOString(),
          status: 'success',
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          processingTimeMs: 4.0,
          isManualOverride: false,
        };
        return verifyScanAttempt({
          tokenRaw: validTokenObj.tokenString,
          student: env.validStudent,
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          studentLatitude: env.venue.latitude,
          studentLongitude: env.venue.longitude,
          session: env.session,
          course: env.course,
          venue: env.venue,
          existingRecords: [...env.existingRecords, dummyPriorRecord],
        });
      },
    },
    {
      id: 14,
      title: 'TC-14: Session Time Window - Session Ended',
      category: 'Session Window' as const,
      attackDescription: 'Scan attempted after lecturer officially marked session as completed.',
      expectedOutcome: 'BLOCKED' as const,
      expectedReason: 'SESSION_INACTIVE',
      run: async () => {
        const closedSession = { ...env.session, isActive: false };
        return verifyScanAttempt({
          tokenRaw: validTokenObj.tokenString,
          student: env.validStudent,
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          studentLatitude: env.venue.latitude,
          studentLongitude: env.venue.longitude,
          session: closedSession,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords.filter(r => r.studentId !== env.validStudent.id),
        });
      },
    },
    {
      id: 15,
      title: 'TC-15: Session Time Window - Lecturer Paused Session',
      category: 'Session Window' as const,
      attackDescription: 'Lecturer temporarily pauses attendance capture during lecture question time.',
      expectedOutcome: 'BLOCKED' as const,
      expectedReason: 'SESSION_INACTIVE',
      run: async () => {
        const pausedSession = { ...env.session, isPaused: true };
        return verifyScanAttempt({
          tokenRaw: validTokenObj.tokenString,
          student: env.validStudent,
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          studentLatitude: env.venue.latitude,
          studentLongitude: env.venue.longitude,
          session: pausedSession,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords.filter(r => r.studentId !== env.validStudent.id),
        });
      },
    },
    {
      id: 16,
      title: 'TC-16: Enrolment Check - Non-Enrolled Student',
      category: 'Business Logic' as const,
      attackDescription: 'Mechanical Engineering student scans QR code for Computer Science CSC 401.',
      expectedOutcome: 'BLOCKED' as const,
      expectedReason: 'NOT_ENROLLED',
      run: async () => {
        return verifyScanAttempt({
          tokenRaw: validTokenObj.tokenString,
          student: env.unregisteredStudent,
          deviceId: env.unregisteredStudent.boundDeviceId!,
          deviceModel: env.unregisteredStudent.deviceModel || 'Samsung Galaxy S22',
          studentLatitude: env.venue.latitude,
          studentLongitude: env.venue.longitude,
          session: env.session,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords,
        });
      },
    },
    {
      id: 17,
      title: 'TC-17: Boundary Test - Perimeter Edge (46m from Center)',
      category: 'Geofence' as const,
      attackDescription: 'Legitimate student standing at lecture hall back doorway (46m, within 50m radius).',
      expectedOutcome: 'ALLOWED' as const,
      expectedReason: undefined,
      run: async () => {
        return verifyScanAttempt({
          tokenRaw: validTokenObj.tokenString,
          student: env.validStudent,
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          // Approx 46 meters away
          studentLatitude: env.venue.latitude + 0.00038,
          studentLongitude: env.venue.longitude + 0.00015,
          session: env.session,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords.filter(r => r.studentId !== env.validStudent.id),
        });
      },
    },
    {
      id: 18,
      title: 'TC-18: Boundary Test - Freshness Edge (9s into window)',
      category: 'Freshness/Replay' as const,
      attackDescription: 'Scan completed at 9 seconds elapsed before token rotates to next cycle.',
      expectedOutcome: 'ALLOWED' as const,
      expectedReason: undefined,
      run: async () => {
        const tokenAt9s = await generateRotatingToken(
          env.session.id,
          env.course.id,
          env.session.secretKey,
          Math.floor(Date.now() / 1000) - 9
        );
        return verifyScanAttempt({
          tokenRaw: tokenAt9s.tokenString,
          student: env.validStudent,
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          studentLatitude: env.venue.latitude,
          studentLongitude: env.venue.longitude,
          session: env.session,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords.filter(r => r.studentId !== env.validStudent.id),
        });
      },
    },
    {
      id: 19,
      title: 'TC-19: Key Rollover Invalidation',
      category: 'Cryptography' as const,
      attackDescription: 'Lecturer regenerates session secret key due to compromised screen projection.',
      expectedOutcome: 'BLOCKED' as const,
      expectedReason: 'INVALID_SIGNATURE',
      run: async () => {
        // Lecturer changed secretKey
        const newSecret = generateSessionSecret();
        const updatedSession = { ...env.session, secretKey: newSecret };
        return verifyScanAttempt({
          tokenRaw: validTokenObj.tokenString, // Signed with old secret
          student: env.validStudent,
          deviceId: env.validStudent.boundDeviceId!,
          deviceModel: 'Samsung Galaxy A54',
          studentLatitude: env.venue.latitude,
          studentLongitude: env.venue.longitude,
          session: updatedSession,
          course: env.course,
          venue: env.venue,
          existingRecords: env.existingRecords.filter(r => r.studentId !== env.validStudent.id),
        });
      },
    },
  ];

  for (let i = 0; i < testDefs.length; i++) {
    const def = testDefs[i];
    const outcome = await def.run();
    const actualOutcome = outcome.allowed ? 'ALLOWED' : 'BLOCKED';
    const passed =
      actualOutcome === def.expectedOutcome &&
      (!def.expectedReason || outcome.reason === def.expectedReason);

    const res: TestCaseResult = {
      id: def.id,
      title: def.title,
      category: def.category,
      attackDescription: def.attackDescription,
      expectedOutcome: def.expectedOutcome,
      actualOutcome,
      expectedReason: def.expectedReason,
      actualReason: outcome.reason,
      processingTimeMs: outcome.checkResult.details.processingTimeMs,
      passed,
      executedAt: new Date().toLocaleTimeString(),
    };

    results.push(res);
    if (onProgress) {
      onProgress(i + 1, total, res);
    }
  }

  return results;
}

/**
 * Executes 200 consecutive scans to measure server processing time
 * Directly validating the research paper's findings: "averaged 4.4 ms per scan over 200 scans"
 */
export async function run200ScanBenchmark(
  env: TestRunnerEnvironment,
  onProgress?: (count: number, currentAvg: number) => void
): Promise<{ stats: BenchmarkStats; latencies: number[] }> {
  const latencies: number[] = [];
  const tokenObj = await generateRotatingToken(
    env.session.id,
    env.course.id,
    env.session.secretKey
  );

  let successCount = 0;
  let blockedCount = 0;

  for (let i = 0; i < 200; i++) {
    const outcome = await verifyScanAttempt({
      tokenRaw: tokenObj.tokenString,
      student: env.validStudent,
      deviceId: env.validStudent.boundDeviceId!,
      deviceModel: 'Samsung Galaxy A54',
      studentLatitude: env.venue.latitude + 0.00001,
      studentLongitude: env.venue.longitude + 0.00001,
      session: env.session,
      course: env.course,
      venue: env.venue,
      existingRecords: [], // Clear duplicate check for synthetic benchmarking
    });

    const lat = outcome.checkResult.details.processingTimeMs;
    latencies.push(lat);

    if (outcome.allowed) successCount++;
    else blockedCount++;

    if ((i + 1) % 20 === 0 && onProgress) {
      const currentAvg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      onProgress(i + 1, Math.round(currentAvg * 10) / 10);
    }
  }

  latencies.sort((a, b) => a - b);
  const minLatencyMs = latencies[0];
  const maxLatencyMs = latencies[latencies.length - 1];
  const meanLatencyMs =
    Math.round((latencies.reduce((a, b) => a + b, 0) / latencies.length) * 10) / 10;
  const medianLatencyMs = latencies[Math.floor(latencies.length / 2)];
  const p95LatencyMs = latencies[Math.floor(latencies.length * 0.95)];

  const stats: BenchmarkStats = {
    totalScans: 200,
    successfulScans: successCount,
    blockedScans: blockedCount,
    minLatencyMs,
    maxLatencyMs,
    meanLatencyMs,
    medianLatencyMs,
    p95LatencyMs,
  };

  return { stats, latencies };
}
