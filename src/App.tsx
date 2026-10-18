/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { LecturerDashboard } from './components/LecturerDashboard';
import { StudentPortal } from './components/StudentPortal';
import { AdminConsole } from './components/AdminConsole';
import { SecurityTestSuite } from './components/SecurityTestSuite';
import { DualSimMode } from './components/DualSimMode';
import {
  INITIAL_USERS,
  INITIAL_COURSES,
  INITIAL_VENUES,
  INITIAL_SESSIONS,
  INITIAL_ATTENDANCE,
  PAST_ATTENDANCE_COUNTS,
  INITIAL_AUDIT_LOGS,
} from './data/initialData';
import {
  AttendanceRecord,
  LectureSession,
  SecurityAuditLog,
  User,
  Venue,
} from './types/attendance';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('lecturer');

  // Core institutional state
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [session, setSession] = useState<LectureSession>(INITIAL_SESSIONS[0]);
  const [courses] = useState(INITIAL_COURSES);
  const [venues, setVenues] = useState<Venue[]>(INITIAL_VENUES);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>(INITIAL_AUDIT_LOGS);
  const [pastAttendanceCounts] = useState<Record<string, number>>(PAST_ATTENDANCE_COUNTS);

  // Active student for student portal
  const [currentStudent, setCurrentStudent] = useState<User>(
    users.find((u) => u.matricOrStaffId === '2021/CSC/042') || users[2]
  );

  const activeCourse = courses.find((c) => c.id === session.courseId) || courses[0];
  const activeVenue = venues.find((v) => v.id === session.venueId) || venues[0];

  // Handler: When a scan passes verification
  const handleRecordAdded = (record: AttendanceRecord) => {
    setAttendanceRecords((prev) => [record, ...prev]);

    // Also append to audit log
    const audit: SecurityAuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: record.timestamp,
      sessionId: record.sessionId,
      courseCode: activeCourse.code,
      studentMatric: record.studentMatric,
      studentName: record.studentName,
      action: 'SCAN_ATTEMPT',
      outcome: 'ALLOWED',
      checksFailed: [],
      clientIp: '192.168.1.105',
      deviceId: record.deviceId,
      distanceMeters: record.distanceMeters,
      processingTimeMs: record.processingTimeMs,
    };
    setAuditLogs((prev) => [audit, ...prev]);
  };

  // Handler: Lecturer Manual Override with reason
  const handleManualOverride = (studentId: string, reason: string) => {
    const student = users.find((u) => u.id === studentId);
    if (!student) return;

    const newRecord: AttendanceRecord = {
      id: `att-manual-${Date.now()}`,
      sessionId: session.id,
      courseId: activeCourse.id,
      studentId: student.id,
      studentMatric: student.matricOrStaffId,
      studentName: student.name,
      timestamp: new Date().toISOString(),
      status: 'manual_override',
      deviceId: student.boundDeviceId || 'MANUAL-OVERRIDE',
      deviceModel: 'Lecturer Manual Override',
      processingTimeMs: 1.5,
      isManualOverride: true,
      overrideReason: reason,
      overrideByLecturerId: session.lecturerId,
    };

    setAttendanceRecords((prev) => [newRecord, ...prev]);

    const audit: SecurityAuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      sessionId: session.id,
      courseCode: activeCourse.code,
      studentMatric: student.matricOrStaffId,
      studentName: student.name,
      action: 'MANUAL_OVERRIDE',
      outcome: 'ALLOWED',
      reason,
      checksFailed: [],
      clientIp: '192.168.1.1',
      deviceId: 'LECTURER_STATION',
      processingTimeMs: 1.5,
    };
    setAuditLogs((prev) => [audit, ...prev]);
  };

  // Handler: Update active lecture session (pause, resume, rollover key)
  const handleUpdateSession = (updated: LectureSession) => {
    setSession(updated);

    if (updated.secretKey !== session.secretKey) {
      // Log rollover in audit trail
      const audit: SecurityAuditLog = {
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        sessionId: updated.id,
        courseCode: activeCourse.code,
        studentMatric: 'N/A',
        studentName: 'Lecturer (Dr. Sarah Okonjo)',
        action: 'SESSION_SECRET_ROLLOVER',
        outcome: 'ALLOWED',
        reason: 'Lecturer rotated cryptographic session secret',
        checksFailed: [],
        clientIp: '192.168.1.1',
        deviceId: 'LECTURER_CONSOLE',
        processingTimeMs: 0.8,
      };
      setAuditLogs((prev) => [audit, ...prev]);
    }
  };

  // Handler: Reset Student Device Binding
  const handleResetDeviceBinding = (studentId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === studentId) {
          return {
            ...u,
            boundDeviceId: undefined,
            deviceModel: undefined,
          };
        }
        return u;
      })
    );

    const targetUser = users.find((u) => u.id === studentId);
    if (targetUser) {
      const audit: SecurityAuditLog = {
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString(),
        sessionId: session.id,
        courseCode: activeCourse.code,
        studentMatric: targetUser.matricOrStaffId,
        studentName: targetUser.name,
        action: 'DEVICE_RESET',
        outcome: 'ALLOWED',
        reason: 'Administrator cleared device hardware binding upon student request',
        checksFailed: [],
        clientIp: '192.168.1.2',
        deviceId: 'ADMIN_CONSOLE',
        processingTimeMs: 1.1,
      };
      setAuditLogs((prev) => [audit, ...prev]);
    }
  };

  // Handler: Update Venue Geofence Radius
  const handleUpdateVenueRadius = (venueId: string, radiusMeters: number) => {
    setVenues((prev) =>
      prev.map((v) => (v.id === venueId ? { ...v, radiusMeters } : v))
    );
  };

  const validEnrolledStudent = users.find((u) => u.id === 'usr-stu-1') || users[2];
  const unregisteredStudent = users.find((u) => u.id === 'usr-stu-8') || users[7];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Universal 3-zone Header */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeSessionTopic={session.topic}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'lecturer' && (
          <LecturerDashboard
            session={session}
            course={activeCourse}
            venue={activeVenue}
            allStudents={users}
            attendanceRecords={attendanceRecords}
            pastAttendanceCounts={pastAttendanceCounts}
            onManualOverride={handleManualOverride}
            onUpdateSession={handleUpdateSession}
          />
        )}

        {activeTab === 'student' && (
          <StudentPortal
            currentStudent={currentStudent}
            allStudents={users}
            onSelectStudent={setCurrentStudent}
            session={session}
            course={activeCourse}
            venue={activeVenue}
            attendanceRecords={attendanceRecords}
            onRecordAdded={handleRecordAdded}
            pastAttendanceCounts={pastAttendanceCounts}
          />
        )}

        {activeTab === 'admin' && (
          <AdminConsole
            users={users}
            courses={courses}
            venues={venues}
            auditLogs={auditLogs}
            onResetDeviceBinding={handleResetDeviceBinding}
            onUpdateVenueRadius={handleUpdateVenueRadius}
          />
        )}

        {activeTab === 'tests' && (
          <SecurityTestSuite
            session={session}
            course={activeCourse}
            venue={activeVenue}
            validStudent={validEnrolledStudent}
            unregisteredStudent={unregisteredStudent}
            existingRecords={attendanceRecords}
          />
        )}

        {activeTab === 'dualsim' && (
          <DualSimMode
            session={session}
            course={activeCourse}
            venue={activeVenue}
            allStudents={users}
            attendanceRecords={attendanceRecords}
            onRecordAdded={handleRecordAdded}
          />
        )}
      </main>

      {/* Quiet Academic Institutional Footer adhering to design constitution */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>Apex Institute of Science & Technology</span>
            <span aria-hidden="true">·</span>
            <span>QR-Code Student Attendance Management System</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">75% Threshold Enforced</span>
          </div>
          <div className="text-slate-400">
            <span>Verified 4.4 ms Processing Latency</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
