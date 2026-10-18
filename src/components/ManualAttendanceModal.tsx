import React, { useState } from 'react';
import { User, Course, LectureSession } from '../types/attendance';
import { X, UserCheck, ShieldAlert } from 'lucide-react';

interface ManualAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: LectureSession;
  course: Course;
  students: User[];
  alreadyMarkedStudentIds: string[];
  onSubmitOverride: (studentId: string, reason: string) => void;
}

const PRESET_REASONS = [
  'Device battery depleted - physically confirmed in seat',
  'Camera optical hardware fault - student presented phone',
  'Carrier network cellular blackout at venue',
  'Official university debate/sports representation approved',
  'Medical clinic referral card presented to lecturer',
];

export const ManualAttendanceModal: React.FC<ManualAttendanceModalProps> = ({
  isOpen,
  onClose,
  session,
  course,
  students,
  alreadyMarkedStudentIds,
  onSubmitOverride,
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [reasonCategory, setReasonCategory] = useState(PRESET_REASONS[0]);
  const [customNote, setCustomNote] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Enrolled students who haven't been marked yet
  const eligibleStudents = students.filter(
    (s) =>
      course.enrolledStudentIds.includes(s.id) &&
      !alreadyMarkedStudentIds.includes(s.id)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setError('Please select an enrolled student.');
      return;
    }
    const finalReason = customNote.trim()
      ? `${reasonCategory} — Note: ${customNote.trim()}`
      : reasonCategory;

    onSubmitOverride(selectedStudentId, finalReason);
    setSelectedStudentId('');
    setCustomNote('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Manual Attendance Record
            </h3>
            <div className="text-xs text-slate-500 mt-0.5">
              <span>{course.code}</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>{session.venueName}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="p-4 bg-amber-50/70 border-b border-amber-200/50 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Manual overrides are flagged in institutional audit reports with your staff ID and timestamp. Enter a verified justification.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 rounded-md border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Enrolled Student ({eligibleStudents.length} unmarked)
            </label>
            {eligibleStudents.length === 0 ? (
              <div className="p-3 text-xs text-slate-500 bg-slate-100 rounded-md">
                All enrolled students for this course are already recorded as present.
              </div>
            ) : (
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">-- Choose student --</option>
                {eligibleStudents.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.matricOrStaffId} — {stu.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Recorded Reason (Mandatory Institutional Policy)
            </label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {PRESET_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Additional Details / Verification Note (Optional)
            </label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g., Student was present in row 3, seat 14. Inspected phone battery dead at 10:15."
              rows={2}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={eligibleStudents.length === 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              Record Manual Attendance
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
