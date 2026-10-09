import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  FileText,
  BarChart3,
  ClipboardCheck,
  MessageSquare,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { smsAPI } from './smsApi';
import type { ColumnDef } from './SmsSectionPage';
import SmsLayout from './SmsLayout';
import SmsSectionPage from './SmsSectionPage';
import GlobalPreloader from '../../../../components/GlobalPreloader';
import { TeacherAssignment, TimetableEntry, SchoolAssignment, AssignmentSubmission, Exam, ExamResult } from './smsTypes';

const teacherAssignmentColumns: ColumnDef[] = [
  { key: 'classId', label: 'Class' },
  { key: 'subjectId', label: 'Subject' },
  { key: 'sectionId', label: 'Section' },
  { key: 'academicYearId', label: 'Academic Year' },
];

const attendanceColumns: ColumnDef[] = [
  { key: 'date', label: 'Date' },
  { key: 'status', label: 'Status' },
  { key: 'studentId', label: 'Student' },
  { key: 'classId', label: 'Class' },
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

const assignmentColumns: ColumnDef[] = [
  { key: 'title', label: 'Title' },
  { key: 'classId', label: 'Class' },
  { key: 'subjectId', label: 'Subject' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'maxMarks', label: 'Max Marks' },
  { key: 'isActive', label: 'Active' },
];

const messageColumns: ColumnDef[] = [
  { key: 'subject', label: 'Subject' },
  { key: 'senderId', label: 'Sender' },
  { key: 'sentAt', label: 'Sent At' },
  { key: 'isRead', label: 'Read' },
];

const SmsTeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [pendingExams, setPendingExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teacherId = user?.id;
        if (!teacherId) return;

        const [teacherData, schedule] = await Promise.all([
          smsAPI.teacherAssignments.getAll({ teacherId }),
          smsAPI.timetable.getByTeacher(teacherId),
        ]);

        setAssignments(teacherData);
        setTimetable(schedule);
        setPendingExams([]);
        setSubmissions([]);
      } catch (err: any) {
        setError(err.message || 'Failed to load teacher dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const dashboardContent = (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sms-text">
          Teacher Dashboard
        </h1>
        <p className="text-sm sms-text-muted">
          {user?.firstName || user?.name || 'Welcome'} • Manage your classes and schedule
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="inline mr-2" size={16} />
          {error}
        </div>
      )}

      <div className="sms-card p-6">
        <h3 className="text-lg font-semibold sms-text mb-4">My Classes & Subjects</h3>
        {assignments.length === 0 ? (
          <p className="text-sm sms-text-muted">No classes assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between rounded-lg bg-[var(--sms-soft)] p-3">
                <div>
                  <p className="font-medium sms-text">{assignment.subjectId || 'Subject'}</p>
                  <p className="text-sm sms-text-muted">
                    {assignment.classId ? `Class: ${assignment.classId}` : ''}
                    {assignment.sectionId ? ` • Section: ${assignment.sectionId}` : ''}
                  </p>
                </div>
                <button className="sms-btn-ghost text-xs">View</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sms-card p-6">
        <h3 className="text-lg font-semibold sms-text mb-4">Today's Schedule</h3>
        {timetable.length === 0 ? (
          <p className="text-sm sms-text-muted">No classes scheduled for today.</p>
        ) : (
          <div className="space-y-3">
            {timetable.slice(0, 6).map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 rounded-lg bg-[var(--sms-soft)] p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--sms-primary-light)] text-[var(--sms-primary-deep)]">
                  <span className="text-xs font-bold">{entry.dayOfWeek || '?'}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium sms-text">{entry.subjectId || 'Subject'}</p>
                  <p className="text-sm sms-text-muted">
                    {entry.startTime} – {entry.endTime}
                    {entry.room ? ` • Room: ${entry.room}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sms-card p-6">
        <h3 className="text-lg font-semibold sms-text mb-4">Quick Links</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <button className="sms-btn-ghost flex flex-col items-center gap-2 py-3">
            <ClipboardCheck size={20} />
            <span className="text-xs">Mark Attendance</span>
          </button>
          <button className="sms-btn-ghost flex flex-col items-center gap-2 py-3">
            <FileText size={20} />
            <span className="text-xs">Record Grades</span>
          </button>
          <button className="sms-btn-ghost flex flex-col items-center gap-2 py-3">
            <Calendar size={20} />
            <span className="text-xs">My Timetable</span>
          </button>
          <button className="sms-btn-ghost flex flex-col items-center gap-2 py-3">
            <MessageSquare size={20} />
            <span className="text-xs">Messages</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) return <GlobalPreloader message="Loading teacher dashboard…" />;

  return (
    <Routes>
      <Route
        path=""
        element={
          <SmsLayout role="teacher">
            {dashboardContent}
          </SmsLayout>
        }
      />
      <Route
        path="classes"
        element={
          <SmsSectionPage
            role="teacher"
            title="My Classes"
            description="Classes and subjects you are assigned to"
            apiSection="teacherAssignments"
            columns={teacherAssignmentColumns}
            searchKeys={['classId', 'subjectId']}
          />
        }
      />
      <Route
        path="attendance"
        element={
          <SmsSectionPage
            role="teacher"
            title="Attendance"
            description="Attendance records for your classes"
            apiSection="attendance"
            columns={attendanceColumns}
            searchKeys={['status', 'studentId']}
          />
        }
      />
      <Route
        path="timetable"
        element={
          <SmsSectionPage
            role="teacher"
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
            role="teacher"
            title="Exams"
            description="Examinations for your classes"
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
            role="teacher"
            title="Assignments"
            description="Assignments you have created for your classes"
            apiSection="assignments"
            columns={assignmentColumns}
            searchKeys={['title']}
          />
        }
      />
      <Route
        path="messages"
        element={
          <SmsSectionPage
            role="teacher"
            title="Messages"
            description="Inbox messages"
            apiSection="messages"
            columns={messageColumns}
            searchKeys={['subject', 'senderId']}
          />
        }
      />
    </Routes>
  );
};

export default SmsTeacherDashboard;