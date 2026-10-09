import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  Calendar,
  FileText,
  BarChart3,
  ClipboardCheck,
  Banknote,
  MessageSquare,
  TrendingUp,
  Download,
  AlertCircle,
  Users,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { smsAPI } from './smsApi';
import type { ColumnDef } from './SmsSectionPage';
import SmsLayout from './SmsLayout';
import SmsSectionPage from './SmsSectionPage';
import GlobalPreloader from '../../../../components/GlobalPreloader';
import { AttendanceRecord, ExamResult, AssignmentSubmission } from './smsTypes';

const attendanceColumns: ColumnDef[] = [
  { key: 'date', label: 'Date' },
  { key: 'status', label: 'Status' },
  { key: 'classId', label: 'Class' },
  { key: 'remarks', label: 'Remarks' },
];

const timetableColumns: ColumnDef[] = [
  { key: 'dayOfWeek', label: 'Day' },
  { key: 'startTime', label: 'Start Time' },
  { key: 'endTime', label: 'End Time' },
  { key: 'subjectId', label: 'Subject' },
  { key: 'room', label: 'Room' },
];

const examColumns: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'endDate', label: 'End Date' },
  { key: 'maxMarks', label: 'Max Marks' },
  { key: 'isActive', label: 'Active' },
];

const assignmentSubmissionColumns: ColumnDef[] = [
  { key: 'assignmentId', label: 'Assignment' },
  { key: 'submittedAt', label: 'Submitted' },
  { key: 'status', label: 'Status' },
  { key: 'score', label: 'Score' },
];

const gradeSchemeColumns: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'minScore', label: 'Min Score' },
  { key: 'maxScore', label: 'Max Score' },
  { key: 'gradeLetter', label: 'Grade' },
  { key: 'points', label: 'Points' },
];

const messageColumns: ColumnDef[] = [
  { key: 'subject', label: 'Subject' },
  { key: 'senderId', label: 'Sender' },
  { key: 'sentAt', label: 'Sent At' },
  { key: 'isRead', label: 'Read' },
];

const documentColumns: ColumnDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'documentType', label: 'Type' },
  { key: 'fileSize', label: 'Size' },
  { key: 'uploadedBy', label: 'Uploaded By' },
];

const feePaymentColumns: ColumnDef[] = [
  { key: 'studentId', label: 'Student' },
  { key: 'feeStructureId', label: 'Fee Structure' },
  { key: 'amount', label: 'Amount' },
  { key: 'paymentDate', label: 'Payment Date' },
  { key: 'paymentMethod', label: 'Method' },
  { key: 'status', label: 'Status' },
];

const SmsStudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [assignments, setAssignments] = useState<AssignmentSubmission[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const studentId = user?.id;
        if (!studentId) return;

        const [attData, examData, assignData] = await Promise.all([
          smsAPI.attendance.getByStudent(studentId).catch(() => []),
          smsAPI.examResults.getByStudent(studentId).catch(() => []),
          smsAPI.assignmentSubmissions.getByStudent(studentId).catch(() => []),
        ]);

        setAttendance(attData);
        setResults(examData);
        setAssignments(assignData);
      } catch (err: any) {
        setError(err.message || 'Failed to load student dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const attendanceSummary = React.useMemo(() => {
    const present = attendance.filter((a) => a.status === 'present').length;
    const absent = attendance.filter((a) => a.status === 'absent').length;
    const late = attendance.filter((a) => a.status === 'late').length;
    const total = attendance.length;
    const attendanceRate = total > 0 ? Math.round(((total - absent) / total) * 100) : 0;
    return { present, absent, late, total, attendanceRate };
  }, [attendance]);

  const dashboardContent = (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sms-text">
          Student Dashboard
        </h1>
        <p className="text-sm sms-text-muted">
          {user?.firstName || user?.name || 'Welcome'} • Track your academic progress
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="inline mr-2" size={16} />
          {error}
        </div>
      )}

      <div className="sms-card p-6">
        <h3 className="text-lg font-semibold sms-text mb-4">Attendance Overview</h3>
        <div className="flex items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--sms-primary-light)] text-[var(--sms-primary-deep)]">
            <div className="text-center">
              <p className="text-2xl font-bold">{attendanceSummary.attendanceRate}%</p>
              <p className="text-xs">attendance</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-[var(--sms-success)]">{attendanceSummary.present}</p>
              <p className="text-xs sms-text-muted">Present</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--sms-danger)]">{attendanceSummary.absent}</p>
              <p className="text-xs sms-text-muted">Absent</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--sms-warning)]">{attendanceSummary.late}</p>
              <p className="text-xs sms-text-muted">Late</p>
            </div>
            <div>
              <p className="text-2xl font-bold sms-text">{attendanceSummary.total}</p>
              <p className="text-xs sms-text-muted">Total</p>
            </div>
          </div>
        </div>
      </div>

      <div className="sms-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold sms-text">My Grades</h3>
          <button className="sms-btn-ghost text-xs">
            <Download size={14} className="mr-1" />
            Download Report
          </button>
        </div>
        {results.length === 0 ? (
          <p className="text-sm sms-text-muted">No exam results available yet.</p>
        ) : (
          <div className="space-y-3">
            {results.slice(0, 5).map((result) => (
              <div key={result.id} className="flex items-center justify-between rounded-lg bg-[var(--sms-soft)] p-3">
                <div>
                  <p className="font-medium sms-text">{result.examId || 'Exam'}</p>
                  <p className="text-sm sms-text-muted">
                    Score: {result.score} / {result.maxScore}
                    {result.percentage && ` (${result.percentage}%)`}
                  </p>
                </div>
                <span className="sms-badge sms-badge-success">{result.grade || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sms-card p-6">
        <h3 className="text-lg font-semibold sms-text mb-4">My Assignments</h3>
        {assignments.length === 0 ? (
          <p className="text-sm sms-text-muted">No assignments yet.</p>
        ) : (
          <div className="space-y-3">
            {assignments.slice(0, 5).map((submission) => (
              <div key={submission.id} className="flex items-center justify-between rounded-lg bg-[var(--sms-soft)] p-3">
                <div>
                  <p className="font-medium sms-text">{submission.assignmentId || 'Assignment'}</p>
                  <p className="text-sm sms-text-muted">
                    Status: {submission.status}
                  </p>
                </div>
                <span className={`sms-badge ${
                  submission.status === 'submitted' ? 'sms-badge-success' :
                  submission.status === 'late' ? 'sms-badge-warning' : 'sms-badge-soft'
                }`}>
                  {submission.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sms-card p-6">
        <h3 className="text-lg font-semibold sms-text mb-4">Quick Links</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <button className="sms-btn-ghost flex flex-col items-center gap-2 py-3">
            <Calendar size={20} />
            <span className="text-xs">My Timetable</span>
          </button>
          <button className="sms-btn-ghost flex flex-col items-center gap-2 py-3">
            <BarChart3 size={20} />
            <span className="text-xs">Report Card</span>
          </button>
          <button className="sms-btn-ghost flex flex-col items-center gap-2 py-3">
            <FileText size={20} />
            <span className="text-xs">Documents</span>
          </button>
          <button className="sms-btn-ghost flex flex-col items-center gap-2 py-3">
            <Banknote size={20} />
            <span className="text-xs">Fee Payments</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) return <GlobalPreloader message="Loading student dashboard…" />;

  return (
    <Routes>
      <Route
        path=""
        element={
          <SmsLayout role="student">
            {dashboardContent}
          </SmsLayout>
        }
      />
      <Route
        path="attendance"
        element={
          <SmsSectionPage
            role="student"
            title="My Attendance"
            description="Your attendance history"
            apiSection="attendance"
            columns={attendanceColumns}
            searchKeys={['status', 'classId']}
          />
        }
      />
      <Route
        path="timetable"
        element={
          <SmsSectionPage
            role="student"
            title="My Timetable"
            description="Your daily class schedule"
            apiSection="timetable"
            columns={timetableColumns}
            searchKeys={['subjectId', 'room']}
          />
        }
      />
      <Route
        path="exams"
        element={
          <SmsSectionPage
            role="student"
            title="Exams"
            description="Upcoming and past examinations"
            apiSection="exams"
            columns={examColumns}
            searchKeys={['name', 'type']}
          />
        }
      />
      <Route
        path="assignments"
        element={
          <SmsSectionPage
            role="student"
            title="My Assignments"
            description="Your submitted and pending assignments"
            apiSection="assignmentSubmissions"
            columns={assignmentSubmissionColumns}
            searchKeys={['assignmentId', 'status']}
          />
        }
      />
      <Route
        path="grades"
        element={
          <SmsSectionPage
            role="student"
            title="My Grades"
            description="Your exam results and grade history"
            apiSection="examResults"
            columns={gradeSchemeColumns}
            searchKeys={['grade', 'examId']}
          />
        }
      />
      <Route
        path="messages"
        element={
          <SmsSectionPage
            role="student"
            title="Messages"
            description="Inbox messages"
            apiSection="messages"
            columns={messageColumns}
            searchKeys={['subject', 'senderId']}
          />
        }
      />
      <Route
        path="documents"
        element={
          <SmsSectionPage
            role="student"
            title="Documents"
            description="School documents and resources"
            apiSection="documents"
            columns={documentColumns}
            searchKeys={['name', 'documentType']}
          />
        }
      />
      <Route
        path="fees"
        element={
          <SmsSectionPage
            role="student"
            title="Fee Payments"
            description="Your fee payment history"
            apiSection="feePayments"
            columns={feePaymentColumns}
            searchKeys={['studentId', 'status', 'paymentMethod']}
          />
        }
      />
    </Routes>
  );
};

export default SmsStudentDashboard;