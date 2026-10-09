import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  BarChart3,
  Banknote,
  MessageSquare,
  Bell,
  GraduationCap,
  ClipboardCheck,
  Download,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { smsAPI } from './smsApi';
import type { ColumnDef } from './SmsSectionPage';
import SmsLayout from './SmsLayout';
import SmsSectionPage from './SmsSectionPage';
import GlobalPreloader from '../../../../components/GlobalPreloader';
import { SchoolStudent, FeePayment, AttendanceRecord, ExamResult } from './smsTypes';

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

const gradeColumns: ColumnDef[] = [
  { key: 'examId', label: 'Exam' },
  { key: 'studentId', label: 'Student' },
  { key: 'score', label: 'Score' },
  { key: 'maxScore', label: 'Max Score' },
  { key: 'percentage', label: 'Percentage' },
  { key: 'grade', label: 'Grade' },
];

const messageColumns: ColumnDef[] = [
  { key: 'subject', label: 'Subject' },
  { key: 'senderId', label: 'Sender' },
  { key: 'sentAt', label: 'Sent At' },
  { key: 'isRead', label: 'Read' },
];

const feePaymentColumns: ColumnDef[] = [
  { key: 'studentId', label: 'Student' },
  { key: 'feeStructureId', label: 'Fee Structure' },
  { key: 'amount', label: 'Amount' },
  { key: 'paymentDate', label: 'Payment Date' },
  { key: 'paymentMethod', label: 'Method' },
  { key: 'status', label: 'Status' },
];

const SmsParentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<SchoolStudent[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const guardianId = user?.id;
        if (!guardianId) return;

        const studentsData = await smsAPI.students.getByGuardian(guardianId).catch(() => []);
        setChildren(studentsData);

        const payments: FeePayment[] = [];
        for (const child of studentsData) {
          try {
            const childPayments = await smsAPI.feePayments.getByStudent(child.id);
            payments.push(...childPayments);
          } catch {}
        }
        setFeePayments(payments);

        try {
          const announcementsData = await smsAPI.announcements.getAll({ isPublished: true });
          setAnnouncements(announcementsData);
        } catch {}
      } catch (err: any) {
        setError(err.message || 'Failed to load parent dashboard');
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
          Parent Dashboard
        </h1>
        <p className="text-sm sms-text-muted">
          {user?.firstName || user?.name || 'Welcome'} • Track your children's progress
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="inline mr-2" size={16} />
          {error}
        </div>
      )}

      <div className="sms-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold sms-text">My Children</h3>
        </div>
        {children.length === 0 ? (
          <p className="text-sm sms-text-muted">No children linked to this account.</p>
        ) : (
          <div className="space-y-4">
            {children.map((child) => (
              <div key={child.id} className="rounded-lg bg-[var(--sms-soft)] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--sms-primary-light)] text-[var(--sms-primary-deep)]">
                      <span className="font-bold">
                        {child.firstName?.[0]} {child.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold sms-text">{child.firstName} {child.lastName}</p>
                      <p className="text-sm sms-text-muted">
                        ID: {child.id} • {child.enrollmentDate ? `Enrolled: ${child.enrollmentDate}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sms-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold sms-text">Fee Payments</h3>
          <button className="sms-btn-ghost text-xs">
            <Download size={14} className="mr-1" />
            Download Receipt
          </button>
        </div>
        {feePayments.length === 0 ? (
          <p className="text-sm sms-text-muted">No fee payments found.</p>
        ) : (
          <div className="space-y-3">
            {feePayments.slice(0, 5).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-lg bg-[var(--sms-soft)] p-3">
                <div>
                  <p className="font-medium sms-text">{payment.feeStructureId || 'Fee Structure'}</p>
                  <p className="text-sm sms-text-muted">
                    {payment.paymentDate} • {payment.paymentMethod}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold sms-text">${payment.amountPaid}</p>
                  <span className={`sms-badge ${
                    payment.status === 'paid' ? 'sms-badge-success' :
                    payment.status === 'pending' ? 'sms-badge-warning' : 'sms-badge-soft'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sms-card p-6">
        <h3 className="text-lg font-semibold sms-text mb-4">Recent Announcements</h3>
        {announcements.length === 0 ? (
          <p className="text-sm sms-text-muted">No announcements.</p>
        ) : (
          <div className="space-y-3">
            {announcements.slice(0, 5).map((announcement) => (
              <div key={announcement.id} className="rounded-lg bg-[var(--sms-soft)] p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium sms-text">{announcement.title || 'Announcement'}</p>
                  <span className={`sms-badge ${
                    announcement.priority === 'high' || announcement.priority === 'urgent'
                      ? 'sms-badge-warning' : 'sms-badge-soft'
                  }`}>
                    {announcement.priority || 'normal'}
                  </span>
                </div>
                {announcement.content && (
                  <p className="mt-1 line-clamp-2 text-sm sms-text-muted">
                    {announcement.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sms-card p-6">
        <h3 className="text-lg font-semibold sms-text mb-4">Quick Links</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <button className="sms-btn-ghost flex flex-col items-center gap-2 py-3">
            <Users size={20} />
            <span className="text-xs">My Children</span>
          </button>
          <button className="sms-btn-ghost flex flex-col items-center gap-2 py-3">
            <BarChart3 size={20} />
            <span className="text-xs">Report Cards</span>
          </button>
          <button className="sms-btn-ghost flex flex-col items-center gap-2 py-3">
            <Bell size={20} />
            <span className="text-xs">Messaging</span>
          </button>
          <button className="sms-btn-ghost flex flex-col items-center gap-2 py-3">
            <Banknote size={20} />
            <span className="text-xs">Fee History</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) return <GlobalPreloader message="Loading parent dashboard…" />;

  return (
    <Routes>
      <Route
        path=""
        element={
          <SmsLayout role="parent">
            {dashboardContent}
          </SmsLayout>
        }
      />
      <Route
        path="attendance"
        element={
          <SmsSectionPage
            role="parent"
            title="Attendance"
            description="Your children's attendance records"
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
            role="parent"
            title="Timetable"
            description="Class schedules for your children"
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
            role="parent"
            title="Exams"
            description="Exam schedule for your children"
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
            role="parent"
            title="Assignments"
            description="Assignments for your children"
            apiSection="assignments"
            columns={assignmentColumns}
            searchKeys={['title']}
          />
        }
      />
      <Route
        path="grades"
        element={
          <SmsSectionPage
            role="parent"
            title="Grade Schemes"
            description="Grading scales and evaluation criteria"
            apiSection="gradeSchemes"
            columns={gradeColumns}
            searchKeys={['name', 'gradeLetter']}
          />
        }
      />
      <Route
        path="messages"
        element={
          <SmsSectionPage
            role="parent"
            title="Messages"
            description="Inbox messages"
            apiSection="messages"
            columns={messageColumns}
            searchKeys={['subject', 'senderId']}
          />
        }
      />
      <Route
        path="fees"
        element={
          <SmsSectionPage
            role="parent"
            title="Fee Payments"
            description="Payment history and outstanding fees"
            apiSection="feePayments"
            columns={feePaymentColumns}
            searchKeys={['studentId', 'status', 'paymentMethod']}
          />
        }
      />
    </Routes>
  );
};

export default SmsParentDashboard;