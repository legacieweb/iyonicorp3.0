import { User } from '../../../../services/api';

export type UserRole = 'admin' | 'teacher' | 'student' | 'guardian' | 'staff' | 'super_admin';

export interface UserRoleMapping {
  role: UserRole;
  userId: string;
  permissions: string[];
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isCurrent: boolean;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  grade: string;
  academicYearId: string;
  schoolId: string;
  classTeacherId?: string;
  sectionIds?: string[];
  subjectIds?: string[];
  studentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolSection {
  id: string;
  name: string;
  classId: string;
  classTeacherId?: string;
  capacity?: number;
  room?: string;
  studentIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SchoolSubject {
  id: string;
  name: string;
  code: string;
  description?: string;
  classIds?: string[];
  teacherIds?: string[];
  creditHours?: number;
  isElective: boolean;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolStudent {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
   studentId: string;
  classId?: string;
  sectionId?: string;
  enrollmentDate: string;
  status: 'active' | 'inactive' | 'graduated' | 'transferred' | 'suspended';
  academicYearId?: string;
  guardianIds?: string[];
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolGuardian {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  relationship: string;
  address?: string;
  students?: SchoolStudent[];
  studentIds?: string[];
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolEnrollment {
  id: string;
  studentId: string;
  classId: string;
  sectionId?: string;
  academicYearId: string;
  enrollmentDate: string;
  status: 'active' | 'inactive' | 'completed' | 'dropped';
  previousClassId?: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingStaff {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  qualification?: string;
  department?: string;
  subjectIds?: string[];
  isClassTeacher: boolean;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  hireDate: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherAssignment {
  id: string;
  teacherId: string;
  classId?: string;
  sectionId?: string;
  subjectId: string;
  academicYearId: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  classId: string;
  sectionId?: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
  markedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GradeScheme {
  id: string;
  name: string;
  type: 'percentage' | 'letter' | 'points' | 'descriptive';
  isDefault: boolean;
  schoolId: string;
  grades?: GradeThreshold[];
  createdAt: string;
  updatedAt: string;
}

export interface GradeThreshold {
  name: string;
  minScore: number;
  maxScore: number;
  grade: string;
  remarks?: string;
}

export interface Exam {
  id: string;
  name: string;
  description?: string;
  classId?: string;
  sectionId?: string;
  subjectId: string;
  academicYearId: string;
  term: string;
  startDate: string;
  endDate: string;
  maxScore: number;
  gradeSchemeId?: string;
  status: 'scheduled' | 'conducted' | 'cancelled' | 'results_published';
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  score: number;
  maxScore: number;
  percentage?: number;
  grade?: string;
  remarks?: string;
  evaluatedBy?: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolAssignment {
  id: string;
  title: string;
  description?: string;
  classId?: string;
  sectionId?: string;
  subjectId: string;
  teacherId: string;
  academicYearId: string;
  dueDate: string;
  totalMarks: number;
  fileUrl?: string;
  fileType?: string;
  status: 'draft' | 'published' | 'archived';
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  submissionDate: string;
  content?: string;
  fileUrl?: string;
  fileType?: string;
  score?: number;
  feedback?: string;
  status: 'submitted' | 'late' | 'draft' | 'not_submitted';
  gradedBy?: string;
  gradedAt?: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableEntry {
  id: string;
  classId: string;
  sectionId?: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string;
  academicYearId: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  isAllDay: boolean;
  targetType: 'all' | 'class' | 'section' | 'staff' | 'specific';
  targetIds?: string[];
  academicYearId: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeeStructure {
  id: string;
  name: string;
  description?: string;
  academicYearId: string;
  classIds?: string[];
  totalAmount: number;
  frequency: 'one_time' | 'termly' | 'annual' | 'monthly' | 'custom';
  dueDate?: string;
  isMandatory: boolean;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeeStructureItem {
  id: string;
  feeStructureId: string;
  name: string;
  description?: string;
  amount: number;
  isMandatory: boolean;
  term?: string;
  dueDate?: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeePayment {
  id: string;
  studentId: string;
  feeStructureId: string;
  amountPaid: number;
  amountDue: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'bank' | 'mobile_money' | 'card' | 'wallet' | 'check';
  reference?: string;
  receiptNumber?: string;
  status: 'paid' | 'partial' | 'pending' | 'overdue' | 'cancelled';
  collectedBy?: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeeConcession {
  id: string;
  studentId: string;
  feeStructureId: string;
  reason: string;
  type: 'fixed_amount' | 'percentage';
  amount?: number;
  percentage?: number;
  approvedBy?: string;
  approvedAt?: string;
  startDate?: string;
  endDate?: string;
  status: 'active' | 'expired' | 'revoked';
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolMessage {
  id: string;
  senderId: string;
  senderType: 'admin' | 'teacher' | 'guardian' | 'staff' | 'student';
  recipientIds: string[];
  subject: string;
  message: string;
  isRead: boolean;
  sentAt: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolAnnouncement {
  id: string;
  title: string;
  content: string;
  targetType: 'all' | 'class' | 'section' | 'staff' | 'specific';
  targetIds?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isPublished: boolean;
  publishAt?: string;
  expiresAt?: string;
  publishedBy?: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolDocument {
  id: string;
  title: string;
  description?: string;
  category: 'admission' | 'result' | 'attendance' | 'fee_receipt' | 'circular' | 'syllabus' | 'other';
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy: string;
  accessLevel: 'public' | 'private' | 'restricted';
  academicYearId?: string;
  classId?: string;
  sectionId?: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmsDashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSections: number;
  totalSubjects: number;
  totalEnrollments: number;
  totalExams: number;
  totalAssignments: number;
  attendanceToday: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  feeCollection: {
    totalCollected: number;
    totalPending: number;
    totalOverdue: number;
  };
  recentMessages: number;
  unreadAnnouncements: number;
}

export interface SmsOwnerDashboardStats extends SmsDashboardStats {
  attendanceTrend: {
    date: string;
    present: number;
    absent: number;
    late: number;
  }[];
  feeTrend: {
    month: string;
    collected: number;
  }[];
  classEnrollment: {
    id: string;
    name: string;
    studentCount: number;
  }[];
  school: {
    storeName: string;
    subdomain: string;
    isLive: boolean;
    createdAt: string;
    contactDetails?: {
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      phone?: string;
      email?: string;
    } | null;
    academicYear?: string;
    academicYearStart?: string;
    academicYearEnd?: string;
  };
}

export interface SmsSubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  intervalType: 'month' | 'year';
  features?: string[];
  maxStudents?: number | null;
  maxTeachers?: number | null;
  maxClasses?: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SmsPlatformOwnerAnalytics {
  totalSchools: number;
  liveSchools: number;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  attendanceRecordsToday: number;
  studentsPresentToday: number;
  licenseRevenueUsd: number;
  subscriptionRevenueUsd: number;
  totalPlatformRevenue: number;
  paidLicenses: number;
  schoolFeeCollection: number;
  schools: {
    id: string;
    storeName: string;
    subdomain: string;
    isLive: boolean;
    createdAt: string;
    contactDetails?: {
      city?: string;
      state?: string;
      country?: string;
    } | null;
    ownerEmail?: string;
    academicYear?: string;
    plan?: string;
    subscriptionStatus?: string;
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    attendanceToday: number;
    paidLicenseCount: number;
    licenseRevenueUsd: number;
  }[];
  planDistribution: Record<string, number>;
  revenueTrend: {
    month: string;
    revenueUsd: number;
    purchases: number;
  }[];
}

export type { User };
