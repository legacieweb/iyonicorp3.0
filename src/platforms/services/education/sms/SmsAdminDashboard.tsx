import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  Calendar,
  FileText,
  BarChart3,
  Banknote,
  Bell,
  TrendingUp,
  AlertCircle,
  Shield,
  Settings,
  User,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { smsAPI } from './smsApi';
import type { SmsDashboardStats } from './smsTypes';
import type { ColumnDef } from './SmsSectionPage';
import SmsLayout from './SmsLayout';
import SmsSectionPage from './SmsSectionPage';
import GlobalPreloader from '../../../../components/GlobalPreloader';

const statCards: { label: string; icon: React.ReactNode; getValue: (s: SmsDashboardStats) => string | number }[] = [
  { label: 'Students', icon: <Users size={20} />, getValue: (s) => s.totalStudents },
  { label: 'Teachers', icon: <GraduationCap size={20} />, getValue: (s) => s.totalTeachers },
  { label: 'Classes', icon: <BookOpen size={20} />, getValue: (s) => s.totalClasses },
  { label: 'Exams', icon: <FileText size={20} />, getValue: (s) => s.totalExams },
];

const studentColumns: ColumnDef[] = [
  { key: 'studentId', label: 'Admission No.', sortable: true },
  { key: 'firstName', label: 'First Name', sortable: true },
  { key: 'lastName', label: 'Last Name', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'classId', label: 'Class' },
  { key: 'isActive', label: 'Status', sortable: true },
];

const studentCreateFields = [
  { key: 'firstName', label: 'First Name', type: 'text' as const },
  { key: 'lastName', label: 'Last Name', type: 'text' as const },
  { key: 'email', label: 'Email', type: 'text' as const },
  { key: 'phone', label: 'Phone', type: 'text' as const },
  { key: 'dateOfBirth', label: 'Date of Birth', type: 'text' as const },
  { key: 'gender', label: 'Gender', type: 'select' as const, options: ['male', 'female', 'other'] },
  { key: 'address', label: 'Address', type: 'textarea' as const },
  { key: 'guardianId', label: 'Guardian ID', type: 'text' as const },
  { key: 'classId', label: 'Class ID', type: 'text' as const },
  { key: 'sectionId', label: 'Section ID', type: 'text' as const },
  { key: 'academicYearId', label: 'Academic Year ID', type: 'text' as const },
  { key: 'enrollmentDate', label: 'Enrollment Date', type: 'text' as const },
];

const staffColumns: ColumnDef[] = [
  { key: 'employeeId', label: 'Employee ID', sortable: true },
  { key: 'firstName', label: 'First Name', sortable: true },
  { key: 'lastName', label: 'Last Name', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'department', label: 'Department', sortable: true },
  { key: 'isActive', label: 'Active', sortable: true },
];

const staffCreateFields = [
  { key: 'firstName', label: 'First Name', type: 'text' as const },
  { key: 'lastName', label: 'Last Name', type: 'text' as const },
  { key: 'email', label: 'Email', type: 'text' as const },
  { key: 'phone', label: 'Phone', type: 'text' as const },
  { key: 'qualification', label: 'Qualification', type: 'text' as const },
  { key: 'department', label: 'Department', type: 'text' as const },
];

const classColumns: ColumnDef[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'code', label: 'Code', sortable: true },
  { key: 'academicYearId', label: 'Academic Year' },
  { key: 'isActive', label: 'Active', sortable: true },
];

const classCreateFields = [
  { key: 'name', label: 'Name', type: 'text' as const },
  { key: 'code', label: 'Code', type: 'text' as const },
  { key: 'academicYearId', label: 'Academic Year', type: 'text' as const },
];

const subjectColumns: ColumnDef[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'code', label: 'Code', sortable: true },
  { key: 'credits', label: 'Credits', sortable: true },
  { key: 'isMandatory', label: 'Mandatory', sortable: true },
];

const subjectCreateFields = [
  { key: 'name', label: 'Name', type: 'text' as const },
  { key: 'code', label: 'Code', type: 'text' as const },
  { key: 'classId', label: 'Class', type: 'text' as const },
  { key: 'credits', label: 'Credits', type: 'number' as const },
];

const attendanceColumns: ColumnDef[] = [
  { key: 'date', label: 'Date', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'studentId', label: 'Student', sortable: true },
  { key: 'classId', label: 'Class' },
];

const timetableColumns: ColumnDef[] = [
  { key: 'dayOfWeek', label: 'Day', sortable: true },
  { key: 'startTime', label: 'Start Time', sortable: true },
  { key: 'endTime', label: 'End Time', sortable: true },
  { key: 'subjectId', label: 'Subject' },
  { key: 'teacherId', label: 'Teacher' },
  { key: 'room', label: 'Room' },
];

const examColumns: ColumnDef[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'type', label: 'Type', sortable: true },
  { key: 'startDate', label: 'Start Date', sortable: true },
  { key: 'endDate', label: 'End Date', sortable: true },
  { key: 'maxMarks', label: 'Max Marks', sortable: true },
  { key: 'isActive', label: 'Active', sortable: true },
];

const examCreateFields = [
  { key: 'name', label: 'Name', type: 'text' as const },
  { key: 'type', label: 'Type', type: 'select' as const, options: ['quiz', 'midterm', 'final', 'other'] },
  { key: 'classId', label: 'Class', type: 'text' as const },
  { key: 'subjectId', label: 'Subject', type: 'text' as const },
  { key: 'maxMarks', label: 'Max Marks', type: 'number' as const },
];

const gradeSchemeColumns: ColumnDef[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'minScore', label: 'Min Score', sortable: true },
  { key: 'maxScore', label: 'Max Score', sortable: true },
  { key: 'gradeLetter', label: 'Grade', sortable: true },
  { key: 'points', label: 'Points', sortable: true },
];

const gradeCreateFields = [
  { key: 'name', label: 'Name', type: 'text' as const },
  { key: 'minScore', label: 'Min Score', type: 'number' as const },
  { key: 'maxScore', label: 'Max Score', type: 'number' as const },
  { key: 'gradeLetter', label: 'Grade Letter', type: 'text' as const },
];

const assignmentColumns: ColumnDef[] = [
  { key: 'title', label: 'Title', sortable: true },
  { key: 'classId', label: 'Class' },
  { key: 'subjectId', label: 'Subject' },
  { key: 'dueDate', label: 'Due Date', sortable: true },
  { key: 'maxMarks', label: 'Max Marks', sortable: true },
  { key: 'isActive', label: 'Active', sortable: true },
];

const assignmentCreateFields = [
  { key: 'title', label: 'Title', type: 'text' as const },
  { key: 'classId', label: 'Class', type: 'text' as const },
  { key: 'subjectId', label: 'Subject', type: 'text' as const },
  { key: 'dueDate', label: 'Due Date', type: 'text' as const },
  { key: 'maxMarks', label: 'Max Marks', type: 'number' as const },
];

const feePaymentColumns: ColumnDef[] = [
  { key: 'studentId', label: 'Student', sortable: true },
  { key: 'feeStructureId', label: 'Fee Structure' },
  { key: 'amount', label: 'Amount', sortable: true },
  { key: 'paymentDate', label: 'Payment Date', sortable: true },
  { key: 'paymentMethod', label: 'Method', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
];

const announcementColumns: ColumnDef[] = [
  { key: 'title', label: 'Title', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: 'isActive', label: 'Active', sortable: true },
  { key: 'sentAt', label: 'Sent At', sortable: true },
];

const announcementCreateFields = [
  { key: 'title', label: 'Title', type: 'text' as const },
  { key: 'content', label: 'Content', type: 'textarea' as const },
  { key: 'priority', label: 'Priority', type: 'select' as const, options: ['low', 'medium', 'high', 'urgent'] },
];

const documentColumns: ColumnDef[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'documentType', label: 'Type', sortable: true },
  { key: 'fileName', label: 'File Name' },
  { key: 'fileSize', label: 'Size', sortable: true },
  { key: 'uploadedBy', label: 'Uploaded By' },
];

const documentCreateFields = [
  { key: 'name', label: 'Name', type: 'text' as const },
  { key: 'documentType', label: 'Type', type: 'select' as const, options: ['admission', 'result', 'attendance', 'fee_receipt', 'circular', 'syllabus', 'other'] },
  { key: 'fileUrl', label: 'File URL', type: 'text' as const },
  { key: 'fileName', label: 'File Name', type: 'text' as const },
];

const auditLogColumns: ColumnDef[] = [
  { key: 'action', label: 'Action' },
  { key: 'entityType', label: 'Entity Type' },
  { key: 'entityId', label: 'Entity ID' },
  { key: 'userId', label: 'User ID' },
  { key: 'userRole', label: 'User Role' },
  { key: 'createdAt', label: 'Created At' },
];

const SmsAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<SmsDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  const fetchStats = async () => {
      try {
        const data = await smsAPI.dashboard.getStats();
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const generateAdmissionNumber = (): string => {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `STU-${year}-${random}`;
  };

  const generateStudentEmail = (firstName: string, lastName: string, admissionNumber?: string): string => {
    const subdomain = (user as any)?.seller?.subdomain || 'school';
    const first = (firstName || 'student').toLowerCase().replace(/[^a-z0-9]/g, '');
    const last = (lastName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const suffix = admissionNumber || Math.floor(1000 + Math.random() * 9000).toString();
    const base = `${first}${last}${suffix}`;
    return `${base}@${subdomain}.schoolsms.com`;
  };

  const handleStudentCreate = async (formData: Record<string, any>) => {
    const payload: Record<string, any> = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      gender: formData.gender,
      address: formData.address,
      guardianId: formData.guardianId || null,
      classId: formData.classId || null,
      sectionId: formData.sectionId || null,
      academicYearId: formData.academicYearId || null,
      enrollmentDate: formData.enrollmentDate || new Date().toISOString().split('T')[0],
      isActive: true,
    };

    payload.admissionNumber = generateAdmissionNumber();

    if (formData.email) {
      payload.email = formData.email;
    } else {
      payload.email = generateStudentEmail(formData.firstName || '', formData.lastName || '', payload.admissionNumber);
    }

    if (formData.phone) {
      payload.phone = formData.phone;
    }

    if (formData.dateOfBirth) {
      payload.dateOfBirth = formData.dateOfBirth;
    }

    const created = await smsAPI.students.create(payload);

    if (formData.classId && created?.id) {
      await smsAPI.enrollments.create({
        studentId: created.id,
        classId: formData.classId,
        sectionId: formData.sectionId || null,
        academicYearId: formData.academicYearId || null,
        enrollmentDate: formData.enrollmentDate || new Date().toISOString().split('T')[0],
        status: 'enrolled' as 'active',
      });
    }
  };

  const dashboardContent = (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold sms-text">
          School Dashboard
        </h1>
        <p className="text-sm sms-text-muted">
          {user?.name || 'Welcome'} â€¢ Manage your school operations
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="inline mr-2" size={16} />
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => (
              <div key={card.label} className="sms-stat-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/80">{card.label}</p>
                    <p className="text-3xl font-bold text-white mt-1">
                      {stats ? String(card.getValue(stats)) : '0'}
                    </p>
                  </div>
                  {card.icon}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sms-card p-4">
              <p className="text-xs font-medium text-[var(--sms-ink-muted)]">Present today</p>
              <p className="text-2xl font-bold text-[var(--sms-success)] mt-1">
                {stats.attendanceToday?.present || 0}
              </p>
            </div>
            <div className="sms-card p-4">
              <p className="text-xs font-medium text-[var(--sms-ink-muted)]">Absent</p>
              <p className="text-2xl font-bold text-[var(--sms-danger)] mt-1">
                {stats.attendanceToday?.absent || 0}
              </p>
            </div>
            <div className="sms-card p-4">
              <p className="text-xs font-medium text-[var(--sms-ink-muted)]">Late</p>
              <p className="text-2xl font-bold text-[var(--sms-warning)] mt-1">
                {stats.attendanceToday?.late || 0}
              </p>
            </div>
            <div className="sms-card p-4">
              <p className="text-xs font-medium text-[var(--sms-ink-muted)]">Excused</p>
              <p className="text-2xl font-bold text-[var(--sms-info)] mt-1">
                {stats.attendanceToday?.excused || 0}
              </p>
            </div>
          </div>

          <div className="sms-card p-6">
            <h3 className="text-lg font-semibold sms-text mb-4">Fee Collection</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-[var(--sms-ink-muted)]">Collected</p>
                <p className="text-2xl font-bold text-[var(--sms-success)] mt-1">
                  ${stats.feeCollection?.totalCollected?.toLocaleString() || '0'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--sms-ink-muted)]">Pending</p>
                <p className="text-2xl font-bold text-[var(--sms-warning)] mt-1">
                  ${stats.feeCollection?.totalPending?.toLocaleString() || '0'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--sms-ink-muted)]">Overdue</p>
                <p className="text-2xl font-bold text-[var(--sms-danger)] mt-1">
                  ${stats.feeCollection?.totalOverdue?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="sms-card p-6">
            <h3 className="text-lg font-semibold sms-text mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <button className="sms-btn-ghost flex flex-col items-center gap-2 py-3">
                <Users size={20} />
                <span className="text-xs">Add Student</span>
              </button>
              <button className="sms-btn-ghost flex flex-col items-center gap-2 py-3">
                <GraduationCap size={20} />
                <span className="text-xs">Add Teacher</span>
              </button>
              <button className="sms-btn-ghost flex flex-col items-center gap-2 py-3">
                <ClipboardCheck size={20} />
                <span className="text-xs">Mark Attendance</span>
              </button>
              <button className="sms-btn-ghost flex flex-col items-center gap-2 py-3">
                <Bell size={20} />
                <span className="text-xs">Send Announcement</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );

  if (loading) return <GlobalPreloader message="Loading school dashboardâ€¦" />;

  return (
    <Routes>
      <Route
        path=""
        element={
          <SmsLayout role="admin">
            {dashboardContent}
          </SmsLayout>
        }
      />
      <Route
        path="students"
        element={
          <SmsSectionPage
            role="admin"
            title="Students"
            description="Manage all enrolled students in your school"
            apiSection="students"
            columns={studentColumns}
            searchKeys={['studentId', 'firstName', 'lastName', 'email', 'phone']}
            createFields={studentCreateFields}
            onCreateCustom={handleStudentCreate}
          />
        }
      />
      <Route
        path="staff"
        element={
          <SmsSectionPage
            role="admin"
            title="Staff"
            description="Manage teaching staff and administrative personnel"
            apiSection="staff"
            columns={staffColumns}
            searchKeys={['firstName', 'lastName', 'email', 'department']}
            createFields={staffCreateFields}
          />
        }
      />
      <Route
        path="classes"
        element={
          <SmsSectionPage
            role="admin"
            title="Classes"
            description="Manage school classes and sections"
            apiSection="classes"
            columns={classColumns}
            searchKeys={['name', 'code']}
            createFields={classCreateFields}
          />
        }
      />
      <Route
        path="subjects"
        element={
          <SmsSectionPage
            role="admin"
            title="Subjects"
            description="Manage academic subjects for each class"
            apiSection="subjects"
            columns={subjectColumns}
            searchKeys={['name', 'code']}
            createFields={subjectCreateFields}
          />
        }
      />
      <Route
        path="attendance"
        element={
          <SmsSectionPage
            role="admin"
            title="Attendance"
            description="View and manage student attendance records"
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
            role="admin"
            title="Timetable"
            description="Manage class schedules and time allocations"
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
            role="admin"
            title="Exams"
            description="Schedule and manage examinations"
            apiSection="exams"
            columns={examColumns}
            searchKeys={['name', 'type']}
            createFields={examCreateFields}
          />
        }
      />
      <Route
        path="grades"
        element={
          <SmsSectionPage
            role="admin"
            title="Grade Schemes"
            description="Define grading scales and evaluation criteria"
            apiSection="gradeSchemes"
            columns={gradeSchemeColumns}
            searchKeys={['name', 'gradeLetter']}
            createFields={gradeCreateFields}
          />
        }
      />
      <Route
        path="assignments"
        element={
          <SmsSectionPage
            role="admin"
            title="Assignments"
            description="Create and track student assignments"
            apiSection="assignments"
            columns={assignmentColumns}
            searchKeys={['title']}
            createFields={assignmentCreateFields}
          />
        }
      />
      <Route
        path="fees"
        element={
          <SmsSectionPage
            role="admin"
            title="Fee Payments"
            description="Track tuition and fee payments"
            apiSection="feePayments"
            columns={feePaymentColumns}
            searchKeys={['studentId', 'status', 'paymentMethod']}
          />
        }
      />
      <Route
        path="announcements"
        element={
          <SmsSectionPage
            role="admin"
            title="Announcements"
            description="Publish school announcements and notices"
            apiSection="announcements"
            columns={announcementColumns}
            searchKeys={['title', 'priority']}
            createFields={announcementCreateFields}
          />
        }
      />
      <Route
        path="documents"
        element={
          <SmsSectionPage
            role="admin"
            title="Documents"
            description="Manage school documents and resources"
            apiSection="documents"
            columns={documentColumns}
            searchKeys={['name', 'documentType']}
            createFields={documentCreateFields}
          />
        }
      />
      <Route
        path="audit-log"
        element={
          <SmsSectionPage
            role="admin"
            title="Audit Log"
            description="View system activity and changes"
            apiSection="auditLog"
            columns={auditLogColumns}
            searchKeys={['action', 'entityType', 'userRole']}
          />
        }
      />
      <Route
        path="settings"
        element={
          <SmsLayout role="admin">
            <div className="space-y-6">
              <h2 className="text-xl font-semibold sms-text">Settings</h2>
              <div className="sms-card p-6">
                <p className="sms-text-muted">Settings page is under construction.</p>
              </div>
            </div>
          </SmsLayout>
        }
      />
    </Routes>
  );
};

export default SmsAdminDashboard;
