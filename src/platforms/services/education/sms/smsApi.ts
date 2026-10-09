import { api } from '../../../../services/api';
import type {
  AcademicYear,
  AssignmentSubmission,
  AttendanceRecord,
  FeeConcession,
  FeePayment,
  FeeStructure,
  FeeStructureItem,
  Exam,
  ExamResult,
  GradeScheme,
  SchoolAnnouncement,
  SchoolAssignment,
  SchoolClass,
  SchoolDocument,
  SchoolEvent,
  SchoolGuardian,
  SchoolEnrollment,
  SchoolMessage,
  SchoolSection,
  SchoolStudent,
  SchoolSubject,
  SmsOwnerDashboardStats,
  SmsPlatformOwnerAnalytics,
  SmsSubscriptionPlan,
  TeacherAssignment,
  TeachingStaff,
  TimetableEntry,
} from './smsTypes';

export const smsAPI = {
  academicYears: {
    getAll: async (): Promise<AcademicYear[]> => {
      const response = await api.get('/sms/academic-years');
      return response.data;
    },

    getById: async (id: string): Promise<AcademicYear> => {
      const response = await api.get(`/sms/academic-years/${id}`);
      return response.data;
    },

    create: async (data: Partial<AcademicYear>): Promise<AcademicYear> => {
      const response = await api.post('/sms/academic-years', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<AcademicYear>): Promise<AcademicYear> => {
      const response = await api.patch(`/sms/academic-years/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/academic-years/${id}`);
    },
  },

  classes: {
    getAll: async (params?: { academicYearId?: string; schoolId?: string }): Promise<SchoolClass[]> => {
      const response = await api.get('/sms/classes', { params });
      return response.data;
    },

    getById: async (id: string): Promise<SchoolClass> => {
      const response = await api.get(`/sms/classes/${id}`);
      return response.data;
    },

    create: async (data: Partial<SchoolClass>): Promise<SchoolClass> => {
      const response = await api.post('/sms/classes', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<SchoolClass>): Promise<SchoolClass> => {
      const response = await api.patch(`/sms/classes/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/classes/${id}`);
    },
  },

  sections: {
    getAll: async (params?: { classId?: string }): Promise<SchoolSection[]> => {
      const response = await api.get('/sms/sections', { params });
      return response.data;
    },

    getById: async (id: string): Promise<SchoolSection> => {
      const response = await api.get(`/sms/sections/${id}`);
      return response.data;
    },

    create: async (data: Partial<SchoolSection>): Promise<SchoolSection> => {
      const response = await api.post('/sms/sections', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<SchoolSection>): Promise<SchoolSection> => {
      const response = await api.patch(`/sms/sections/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/sections/${id}`);
    },

    getClassSections: async (classId: string): Promise<SchoolSection[]> => {
      const response = await api.get(`/sms/classes/${classId}/sections`);
      return response.data;
    },
  },

  subjects: {
    getAll: async (params?: { classId?: string }): Promise<SchoolSubject[]> => {
      const response = await api.get('/sms/subjects', { params });
      return response.data;
    },

    getById: async (id: string): Promise<SchoolSubject> => {
      const response = await api.get(`/sms/subjects/${id}`);
      return response.data;
    },

    create: async (data: Partial<SchoolSubject>): Promise<SchoolSubject> => {
      const response = await api.post('/sms/subjects', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<SchoolSubject>): Promise<SchoolSubject> => {
      const response = await api.patch(`/sms/subjects/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/subjects/${id}`);
    },
  },

  students: {
    getAll: async (params?: { classId?: string; sectionId?: string; status?: string }): Promise<SchoolStudent[]> => {
      const response = await api.get('/sms/students', { params });
      return response.data;
    },

    getById: async (id: string): Promise<SchoolStudent> => {
      const response = await api.get(`/sms/students/${id}`);
      return response.data;
    },

    create: async (data: Partial<SchoolStudent>): Promise<SchoolStudent> => {
      const response = await api.post('/sms/students', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<SchoolStudent>): Promise<SchoolStudent> => {
      const response = await api.patch(`/sms/students/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/students/${id}`);
    },

    getByGuardian: async (guardianId: string): Promise<SchoolStudent[]> => {
      const response = await api.get(`/sms/guardians/${guardianId}/students`);
      return response.data;
    },
  },

  guardians: {
    getAll: async (): Promise<SchoolGuardian[]> => {
      const response = await api.get('/sms/guardians');
      return response.data;
    },

    getById: async (id: string): Promise<SchoolGuardian> => {
      const response = await api.get(`/sms/guardians/${id}`);
      return response.data;
    },

    create: async (data: Partial<SchoolGuardian>): Promise<SchoolGuardian> => {
      const response = await api.post('/sms/guardians', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<SchoolGuardian>): Promise<SchoolGuardian> => {
      const response = await api.patch(`/sms/guardians/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/guardians/${id}`);
    },
  },

  enrollments: {
    getAll: async (params?: { classId?: string; academicYearId?: string }): Promise<SchoolEnrollment[]> => {
      const response = await api.get('/sms/enrollments', { params });
      return response.data;
    },

    getById: async (id: string): Promise<SchoolEnrollment> => {
      const response = await api.get(`/sms/enrollments/${id}`);
      return response.data;
    },

    create: async (data: Partial<SchoolEnrollment>): Promise<SchoolEnrollment> => {
      const response = await api.post('/sms/enrollments', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<SchoolEnrollment>): Promise<SchoolEnrollment> => {
      const response = await api.patch(`/sms/enrollments/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/enrollments/${id}`);
    },
  },

  staff: {
    getAll: async (params?: { department?: string; status?: string }): Promise<TeachingStaff[]> => {
      const response = await api.get('/sms/staff', { params });
      return response.data;
    },

    getById: async (id: string): Promise<TeachingStaff> => {
      const response = await api.get(`/sms/staff/${id}`);
      return response.data;
    },

    create: async (data: Partial<TeachingStaff>): Promise<TeachingStaff> => {
      const response = await api.post('/sms/staff', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<TeachingStaff>): Promise<TeachingStaff> => {
      const response = await api.patch(`/sms/staff/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/staff/${id}`);
    },
  },

  teacherAssignments: {
    getAll: async (params?: { teacherId?: string; classId?: string }): Promise<TeacherAssignment[]> => {
      const response = await api.get('/sms/teacher-assignments', { params });
      return response.data;
    },

    getById: async (id: string): Promise<TeacherAssignment> => {
      const response = await api.get(`/sms/teacher-assignments/${id}`);
      return response.data;
    },

    create: async (data: Partial<TeacherAssignment>): Promise<TeacherAssignment> => {
      const response = await api.post('/sms/teacher-assignments', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<TeacherAssignment>): Promise<TeacherAssignment> => {
      const response = await api.patch(`/sms/teacher-assignments/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/teacher-assignments/${id}`);
    },
  },

  attendance: {
    getAll: async (params?: { classId?: string; date?: string }): Promise<AttendanceRecord[]> => {
      const response = await api.get('/sms/attendance', { params });
      return response.data;
    },

    getByStudent: async (studentId: string, params?: { startDate?: string; endDate?: string }): Promise<AttendanceRecord[]> => {
      const response = await api.get(`/sms/students/${studentId}/attendance`, { params });
      return response.data;
    },

    getById: async (id: string): Promise<AttendanceRecord> => {
      const response = await api.get(`/sms/attendance/${id}`);
      return response.data;
    },

    create: async (data: Partial<AttendanceRecord>): Promise<AttendanceRecord> => {
      const response = await api.post('/sms/attendance', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord> => {
      const response = await api.patch(`/sms/attendance/${id}`, updates);
      return response.data;
    },

    bulkCreate: async (records: Partial<AttendanceRecord>[]): Promise<AttendanceRecord[]> => {
      const response = await api.post('/sms/attendance/bulk', records);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/attendance/${id}`);
    },
  },

  gradeSchemes: {
    getAll: async (): Promise<GradeScheme[]> => {
      const response = await api.get('/sms/grade-schemes');
      return response.data;
    },

    getById: async (id: string): Promise<GradeScheme> => {
      const response = await api.get(`/sms/grade-schemes/${id}`);
      return response.data;
    },

    create: async (data: Partial<GradeScheme>): Promise<GradeScheme> => {
      const response = await api.post('/sms/grade-schemes', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<GradeScheme>): Promise<GradeScheme> => {
      const response = await api.patch(`/sms/grade-schemes/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/grade-schemes/${id}`);
    },
  },

  exams: {
    getAll: async (params?: { classId?: string; subjectId?: string; term?: string }): Promise<Exam[]> => {
      const response = await api.get('/sms/exams', { params });
      return response.data;
    },

    getById: async (id: string): Promise<Exam> => {
      const response = await api.get(`/sms/exams/${id}`);
      return response.data;
    },

    create: async (data: Partial<Exam>): Promise<Exam> => {
      const response = await api.post('/sms/exams', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<Exam>): Promise<Exam> => {
      const response = await api.patch(`/sms/exams/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/exams/${id}`);
    },
  },

  examResults: {
    getAll: async (params?: { examId?: string; studentId?: string }): Promise<ExamResult[]> => {
      const response = await api.get('/sms/exam-results', { params });
      return response.data;
    },

    getByStudent: async (studentId: string): Promise<ExamResult[]> => {
      const response = await api.get(`/sms/students/${studentId}/exam-results`);
      return response.data;
    },

    getById: async (id: string): Promise<ExamResult> => {
      const response = await api.get(`/sms/exam-results/${id}`);
      return response.data;
    },

    create: async (data: Partial<ExamResult>): Promise<ExamResult> => {
      const response = await api.post('/sms/exam-results', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<ExamResult>): Promise<ExamResult> => {
      const response = await api.patch(`/sms/exam-results/${id}`, updates);
      return response.data;
    },

    bulkCreate: async (results: Partial<ExamResult>[]): Promise<ExamResult[]> => {
      const response = await api.post('/sms/exam-results/bulk', results);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/exam-results/${id}`);
    },
  },

  assignments: {
    getAll: async (params?: { classId?: string; subjectId?: string; teacherId?: string }): Promise<SchoolAssignment[]> => {
      const response = await api.get('/sms/assignments', { params });
      return response.data;
    },

    getById: async (id: string): Promise<SchoolAssignment> => {
      const response = await api.get(`/sms/assignments/${id}`);
      return response.data;
    },

    create: async (data: Partial<SchoolAssignment>): Promise<SchoolAssignment> => {
      const response = await api.post('/sms/assignments', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<SchoolAssignment>): Promise<SchoolAssignment> => {
      const response = await api.patch(`/sms/assignments/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/assignments/${id}`);
    },
  },

  assignmentSubmissions: {
    getAll: async (params?: { assignmentId?: string; studentId?: string }): Promise<AssignmentSubmission[]> => {
      const response = await api.get('/sms/assignment-submissions', { params });
      return response.data;
    },

    getByAssignment: async (assignmentId: string): Promise<AssignmentSubmission[]> => {
      const response = await api.get(`/sms/assignments/${assignmentId}/submissions`);
      return response.data;
    },

    getByStudent: async (studentId: string): Promise<AssignmentSubmission[]> => {
      const response = await api.get(`/sms/students/${studentId}/assignments`);
      return response.data;
    },

    getById: async (id: string): Promise<AssignmentSubmission> => {
      const response = await api.get(`/sms/assignment-submissions/${id}`);
      return response.data;
    },

    create: async (data: Partial<AssignmentSubmission>): Promise<AssignmentSubmission> => {
      const response = await api.post('/sms/assignment-submissions', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<AssignmentSubmission>): Promise<AssignmentSubmission> => {
      const response = await api.patch(`/sms/assignment-submissions/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/assignment-submissions/${id}`);
    },
  },

  timetable: {
    getAll: async (params?: { classId?: string; teacherId?: string }): Promise<TimetableEntry[]> => {
      const response = await api.get('/sms/timetable', { params });
      return response.data;
    },

    getByClass: async (classId: string, params?: { academicYearId?: string }): Promise<TimetableEntry[]> => {
      const response = await api.get(`/sms/classes/${classId}/timetable`, { params });
      return response.data;
    },

    getByTeacher: async (teacherId: string, params?: { dayOfWeek?: number }): Promise<TimetableEntry[]> => {
      const response = await api.get(`/sms/teachers/${teacherId}/timetable`, { params });
      return response.data;
    },

    getById: async (id: string): Promise<TimetableEntry> => {
      const response = await api.get(`/sms/timetable/${id}`);
      return response.data;
    },

    create: async (data: Partial<TimetableEntry>): Promise<TimetableEntry> => {
      const response = await api.post('/sms/timetable', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<TimetableEntry>): Promise<TimetableEntry> => {
      const response = await api.patch(`/sms/timetable/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/timetable/${id}`);
    },
  },

  feeStructures: {
    getAll: async (params?: { academicYearId?: string }): Promise<FeeStructure[]> => {
      const response = await api.get('/sms/fee-structures', { params });
      return response.data;
    },

    getById: async (id: string): Promise<FeeStructure> => {
      const response = await api.get(`/sms/fee-structures/${id}`);
      return response.data;
    },

    getItems: async (feeStructureId: string): Promise<FeeStructureItem[]> => {
      const response = await api.get(`/sms/fee-structures/${feeStructureId}/items`);
      return response.data;
    },

    create: async (data: Partial<FeeStructure>): Promise<FeeStructure> => {
      const response = await api.post('/sms/fee-structures', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<FeeStructure>): Promise<FeeStructure> => {
      const response = await api.patch(`/sms/fee-structures/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/fee-structures/${id}`);
    },
  },

  feeStructureItems: {
    getAll: async (params?: { feeStructureId?: string }): Promise<FeeStructureItem[]> => {
      const response = await api.get('/sms/fee-structure-items', { params });
      return response.data;
    },

    getById: async (id: string): Promise<FeeStructureItem> => {
      const response = await api.get(`/sms/fee-structure-items/${id}`);
      return response.data;
    },

    create: async (data: Partial<FeeStructureItem>): Promise<FeeStructureItem> => {
      const response = await api.post('/sms/fee-structure-items', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<FeeStructureItem>): Promise<FeeStructureItem> => {
      const response = await api.patch(`/sms/fee-structure-items/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/fee-structure-items/${id}`);
    },
  },

  feePayments: {
    getAll: async (params?: { studentId?: string; status?: string }): Promise<FeePayment[]> => {
      const response = await api.get('/sms/fee-payments', { params });
      return response.data;
    },

    getByStudent: async (studentId: string, params?: { academicYearId?: string }): Promise<FeePayment[]> => {
      const response = await api.get(`/sms/students/${studentId}/fee-payments`, { params });
      return response.data;
    },

    getById: async (id: string): Promise<FeePayment> => {
      const response = await api.get(`/sms/fee-payments/${id}`);
      return response.data;
    },

    create: async (data: Partial<FeePayment>): Promise<FeePayment> => {
      const response = await api.post('/sms/fee-payments', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<FeePayment>): Promise<FeePayment> => {
      const response = await api.patch(`/sms/fee-payments/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/fee-payments/${id}`);
    },
  },

  feeConcessions: {
    getAll: async (params?: { studentId?: string; status?: string }): Promise<FeeConcession[]> => {
      const response = await api.get('/sms/fee-concessions', { params });
      return response.data;
    },

    getByStudent: async (studentId: string): Promise<FeeConcession[]> => {
      const response = await api.get(`/sms/students/${studentId}/fee-concessions`);
      return response.data;
    },

    getById: async (id: string): Promise<FeeConcession> => {
      const response = await api.get(`/sms/fee-concessions/${id}`);
      return response.data;
    },

    create: async (data: Partial<FeeConcession>): Promise<FeeConcession> => {
      const response = await api.post('/sms/fee-concessions', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<FeeConcession>): Promise<FeeConcession> => {
      const response = await api.patch(`/sms/fee-concessions/${id}`, updates);
      return response.data;
    },

    approve: async (id: string, approvedBy: string): Promise<FeeConcession> => {
      const response = await api.patch(`/sms/fee-concessions/${id}/approve`, { approvedBy });
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/fee-concessions/${id}`);
    },
  },

  messages: {
    getAll: async (params?: { isRead?: boolean }): Promise<SchoolMessage[]> => {
      const response = await api.get('/sms/messages', { params });
      return response.data;
    },

    getInbox: async (params?: { unreadOnly?: boolean }): Promise<SchoolMessage[]> => {
      const response = await api.get('/sms/messages/inbox', { params });
      return response.data;
    },

    getById: async (id: string): Promise<SchoolMessage> => {
      const response = await api.get(`/sms/messages/${id}`);
      return response.data;
    },

    create: async (data: Partial<SchoolMessage>): Promise<SchoolMessage> => {
      const response = await api.post('/sms/messages', data);
      return response.data;
    },

    markRead: async (id: string): Promise<SchoolMessage> => {
      const response = await api.patch(`/sms/messages/${id}/read`);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/messages/${id}`);
    },
  },

  announcements: {
    getAll: async (params?: { isPublished?: boolean }): Promise<SchoolAnnouncement[]> => {
      const response = await api.get('/sms/announcements', { params });
      return response.data;
    },

    getById: async (id: string): Promise<SchoolAnnouncement> => {
      const response = await api.get(`/sms/announcements/${id}`);
      return response.data;
    },

    create: async (data: Partial<SchoolAnnouncement>): Promise<SchoolAnnouncement> => {
      const response = await api.post('/sms/announcements', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<SchoolAnnouncement>): Promise<SchoolAnnouncement> => {
      const response = await api.patch(`/sms/announcements/${id}`, updates);
      return response.data;
    },

    publish: async (id: string): Promise<SchoolAnnouncement> => {
      const response = await api.patch(`/sms/announcements/${id}/publish`);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/announcements/${id}`);
    },
  },

  documents: {
    getAll: async (params?: { category?: string; classId?: string }): Promise<SchoolDocument[]> => {
      const response = await api.get('/sms/documents', { params });
      return response.data;
    },

    getById: async (id: string): Promise<SchoolDocument> => {
      const response = await api.get(`/sms/documents/${id}`);
      return response.data;
    },

    upload: async (data: FormData): Promise<SchoolDocument> => {
      const response = await api.post('/sms/documents', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },

    update: async (id: string, updates: Partial<SchoolDocument>): Promise<SchoolDocument> => {
      const response = await api.patch(`/sms/documents/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/documents/${id}`);
    },
  },

  events: {
    getAll: async (params?: { startDate?: string; endDate?: string }): Promise<SchoolEvent[]> => {
      const response = await api.get('/sms/events', { params });
      return response.data;
    },

    getById: async (id: string): Promise<SchoolEvent> => {
      const response = await api.get(`/sms/events/${id}`);
      return response.data;
    },

    create: async (data: Partial<SchoolEvent>): Promise<SchoolEvent> => {
      const response = await api.post('/sms/events', data);
      return response.data;
    },

    update: async (id: string, updates: Partial<SchoolEvent>): Promise<SchoolEvent> => {
      const response = await api.patch(`/sms/events/${id}`, updates);
      return response.data;
    },

    delete: async (id: string): Promise<void> => {
      await api.delete(`/sms/events/${id}`);
    },
  },

  auditLog: {
    getAll: async (): Promise<any[]> => {
      const response = await api.get('/sms/audit-log');
      return response.data;
    },
  },

  dashboard: {
    getStats: async (): Promise<SmsOwnerDashboardStats> => {
      const response = await api.get('/sms/dashboard/stats');
      return response.data;
    },

    getPlatformOwnerAnalytics: async (): Promise<SmsPlatformOwnerAnalytics> => {
      const response = await api.get('/sms/owner/analytics');
      return response.data;
    },

    getPlans: async (): Promise<SmsSubscriptionPlan[]> => {
      const response = await api.get('/sms/plans');
      return response.data;
    },

    getOwnerPlans: async (): Promise<SmsSubscriptionPlan[]> => {
      const response = await api.get('/sms/owner/plans');
      return response.data;
    },

    createPlan: async (data: Partial<SmsSubscriptionPlan>): Promise<SmsSubscriptionPlan> => {
      const response = await api.post('/sms/owner/plans', data);
      return response.data;
    },

    updatePlan: async (id: string, updates: Partial<SmsSubscriptionPlan>): Promise<SmsSubscriptionPlan> => {
      const response = await api.put(`/sms/owner/plans/${id}`, updates);
      return response.data;
    },

    deletePlan: async (id: string): Promise<void> => {
      await api.delete(`/sms/owner/plans/${id}`);
    },

    getSubscription: async (): Promise<{ subscription: any; plans: SmsSubscriptionPlan[] }> => {
      const response = await api.get('/sms/subscription');
      return response.data;
    },

    changeSubscription: async (planId: string): Promise<any> => {
      const response = await api.post('/sms/subscription/change', { planId });
      return response.data;
    },
  },

  auth: {
    schoolRegister: async (data: {
      schoolName: string;
      subdomain: string;
      adminEmail: string;
      adminPassword: string;
      adminFirstName?: string;
      adminLastName?: string;
      adminPhone?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
      phone?: string;
      email?: string;
    }): Promise<{ user: any; token: string; schoolCode: string; subdomain: string }> => {
      const response = await api.post('/sms/auth/register/school', data);
      if (response.data.token) localStorage.setItem('iyonicorp_token', response.data.token);
      return response.data;
    },

    teacherRegister: async (data: {
      schoolCode: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phone?: string;
      qualification?: string;
      department?: string;
    }): Promise<{ user: any; token: string; schoolName: string }> => {
      const response = await api.post('/sms/auth/register/teacher', data);
      if (response.data.token) localStorage.setItem('iyonicorp_token', response.data.token);
      return response.data;
    },

    parentRegister: async (data: {
      schoolCode: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phone?: string;
      relationship?: string;
      childAdmissionNumbers?: string[];
    }): Promise<{ user: any; token: string; schoolName: string; guardianId: string }> => {
      const response = await api.post('/sms/auth/register/parent', data);
      if (response.data.token) localStorage.setItem('iyonicorp_token', response.data.token);
      return response.data;
    },

    login: async (data: { email: string; password: string; schoolCode?: string }): Promise<{ user: any; token: string }> => {
      const response = await api.post('/sms/auth/login', data);
      if (response.data.token) localStorage.setItem('iyonicorp_token', response.data.token);
      return response.data;
    },

    me: async (): Promise<{ user: any; smsData: any }> => {
      const response = await api.get('/sms/auth/me');
      return response.data;
    },

    createInvite: async (data: { role: 'teacher' | 'parent' | 'admin'; maxUses?: number; expiresAt?: string }): Promise<any> => {
      const response = await api.post('/sms/auth/invite', data);
      return response.data;
    },

    listInvites: async (): Promise<any[]> => {
      const response = await api.get('/sms/auth/invites');
      return response.data;
    },
  },
};

export default smsAPI;
