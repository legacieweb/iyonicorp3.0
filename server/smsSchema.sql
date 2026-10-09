-- School Management System Schema
-- All tables are scoped by seller_id (a school is represented by a seller)

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- Academic Years
-- ============================================
CREATE TABLE IF NOT EXISTS sms_academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    year VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_academic_years_seller ON sms_academic_years(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_academic_years_seller_current ON sms_academic_years(seller_id, is_current) WHERE is_current = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_academic_years_seller_year ON sms_academic_years(seller_id, year);

DROP TRIGGER IF EXISTS update_sms_academic_years_updated_at ON sms_academic_years;
CREATE TRIGGER update_sms_academic_years_updated_at BEFORE UPDATE ON sms_academic_years FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Teaching Staff (must be before classes/sections that reference class_teacher_id)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_teaching_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    employee_id VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    qualification VARCHAR(255),
    department VARCHAR(100),
    hire_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_teaching_staff_seller ON sms_teaching_staff(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_teaching_staff_seller_user ON sms_teaching_staff(seller_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_teaching_staff_seller_employee ON sms_teaching_staff(seller_id, employee_id);

DROP TRIGGER IF EXISTS update_sms_teaching_staff_updated_at ON sms_teaching_staff;
CREATE TRIGGER update_sms_teaching_staff_updated_at BEFORE UPDATE ON sms_teaching_staff FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Classes (Grades/Standards)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES sms_academic_years(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    class_teacher_id UUID REFERENCES sms_teaching_staff(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_classes_seller ON sms_classes(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_classes_seller_year ON sms_classes(seller_id, academic_year_id);

DROP TRIGGER IF EXISTS update_sms_classes_updated_at ON sms_classes;
CREATE TRIGGER update_sms_classes_updated_at BEFORE UPDATE ON sms_classes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Sections (within a class)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES sms_classes(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    section_code VARCHAR(50),
    description TEXT,
    class_teacher_id UUID REFERENCES sms_teaching_staff(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_sections_seller ON sms_sections(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_sections_class ON sms_sections(class_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_sections_seller_class_name ON sms_sections(seller_id, class_id, name);

DROP TRIGGER IF EXISTS update_sms_sections_updated_at ON sms_sections;
CREATE TRIGGER update_sms_sections_updated_at BEFORE UPDATE ON sms_sections FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Subjects
-- ============================================
CREATE TABLE IF NOT EXISTS sms_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    class_id UUID REFERENCES sms_classes(id) ON DELETE SET NULL,
    credits DECIMAL(5,2) DEFAULT 0,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_subjects_seller ON sms_subjects(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_subjects_seller_class ON sms_subjects(seller_id, class_id);

DROP TRIGGER IF EXISTS update_sms_subjects_updated_at ON sms_subjects;
CREATE TRIGGER update_sms_subjects_updated_at BEFORE UPDATE ON sms_subjects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Guardians (Parents/Guardians)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    alternate_phone VARCHAR(50),
    address TEXT,
    relationship VARCHAR(100),
    is_emergency_contact BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_guardians_seller ON sms_guardians(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_guardians_seller_email ON sms_guardians(seller_id, email);

DROP TRIGGER IF EXISTS update_sms_guardians_updated_at ON sms_guardians;
CREATE TRIGGER update_sms_guardians_updated_at BEFORE UPDATE ON sms_guardians FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Students
-- ============================================
CREATE TABLE IF NOT EXISTS sms_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    student_id VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    address TEXT,
    guardian_id UUID REFERENCES sms_guardians(id) ON DELETE SET NULL,
    enrollment_date DATE,
    class_id UUID REFERENCES sms_classes(id) ON DELETE SET NULL,
    section_id UUID REFERENCES sms_sections(id) ON DELETE SET NULL,
    academic_year_id UUID REFERENCES sms_academic_years(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_students_seller ON sms_students(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_students_seller_class ON sms_students(seller_id, class_id);
CREATE INDEX IF NOT EXISTS idx_sms_students_seller_section ON sms_students(seller_id, section_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_students_seller_student_id ON sms_students(seller_id, student_id);

DROP TRIGGER IF EXISTS update_sms_students_updated_at ON sms_students;
CREATE TRIGGER update_sms_students_updated_at BEFORE UPDATE ON sms_students FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Enrollments (student -> class/section)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES sms_students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES sms_classes(id),
    section_id UUID REFERENCES sms_sections(id) ON DELETE SET NULL,
    academic_year_id UUID REFERENCES sms_academic_years(id) ON DELETE SET NULL,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'dropped', 'transferred')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, class_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_sms_enrollments_seller ON sms_enrollments(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_enrollments_student ON sms_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_sms_enrollments_class ON sms_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_sms_enrollments_year ON sms_enrollments(academic_year_id);

DROP TRIGGER IF EXISTS update_sms_enrollments_updated_at ON sms_enrollments;
CREATE TRIGGER update_sms_enrollments_updated_at BEFORE UPDATE ON sms_enrollments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Teacher Assignments (teacher -> class/section/subject)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES sms_teaching_staff(id),
    class_id UUID NOT NULL REFERENCES sms_classes(id),
    section_id UUID REFERENCES sms_sections(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES sms_subjects(id) ON DELETE SET NULL,
    academic_year_id UUID REFERENCES sms_academic_years(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, class_id, section_id, subject_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_sms_teacher_assignments_seller ON sms_teacher_assignments(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_teacher_assignments_teacher ON sms_teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sms_teacher_assignments_class_subject ON sms_teacher_assignments(class_id, subject_id);

DROP TRIGGER IF EXISTS update_sms_teacher_assignments_updated_at ON sms_teacher_assignments;
CREATE TRIGGER update_sms_teacher_assignments_updated_at BEFORE UPDATE ON sms_teacher_assignments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Grade Schemes (grading scale)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_grade_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    min_score DECIMAL(6,2) NOT NULL,
    max_score DECIMAL(6,2) NOT NULL,
    grade_letter VARCHAR(10) NOT NULL,
    points DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_grade_schemes_seller ON sms_grade_schemes(seller_id);

DROP TRIGGER IF EXISTS update_sms_grade_schemes_updated_at ON sms_grade_schemes;
CREATE TRIGGER update_sms_grade_schemes_updated_at BEFORE UPDATE ON sms_grade_schemes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Exams
-- ============================================
CREATE TABLE IF NOT EXISTS sms_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'exam' CHECK (type IN ('exam', 'quiz', 'assignment', 'midterm', 'final', 'project')),
    class_id UUID NOT NULL REFERENCES sms_classes(id),
    subject_id UUID REFERENCES sms_subjects(id) ON DELETE SET NULL,
    academic_year_id UUID REFERENCES sms_academic_years(id) ON DELETE SET NULL,
    max_marks DECIMAL(7,2) NOT NULL DEFAULT 100,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_exams_seller ON sms_exams(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_exams_seller_class ON sms_exams(seller_id, class_id);
CREATE INDEX IF NOT EXISTS idx_sms_exams_seller_subject ON sms_exams(seller_id, subject_id);

DROP TRIGGER IF EXISTS update_sms_exams_updated_at ON sms_exams;
CREATE TRIGGER update_sms_exams_updated_at BEFORE UPDATE ON sms_exams FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Exam Results
-- ============================================
CREATE TABLE IF NOT EXISTS sms_exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES sms_exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES sms_students(id) ON DELETE CASCADE,
    marks_obtained DECIMAL(7,2) NOT NULL,
    max_marks DECIMAL(7,2) NOT NULL,
    grade VARCHAR(10),
    remarks TEXT,
    recorded_by UUID REFERENCES sms_teaching_staff(id) ON DELETE SET NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_sms_exam_results_seller ON sms_exam_results(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_exam_results_exam ON sms_exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_sms_exam_results_student ON sms_exam_results(student_id);

DROP TRIGGER IF EXISTS update_sms_exam_results_updated_at ON sms_exam_results;
CREATE TRIGGER update_sms_exam_results_updated_at BEFORE UPDATE ON sms_exam_results FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Assignments
-- ============================================
CREATE TABLE IF NOT EXISTS sms_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    class_id UUID NOT NULL REFERENCES sms_classes(id),
    subject_id UUID REFERENCES sms_subjects(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES sms_teaching_staff(id) ON DELETE SET NULL,
    academic_year_id UUID REFERENCES sms_academic_years(id) ON DELETE SET NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    max_marks DECIMAL(7,2) NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_assignments_seller ON sms_assignments(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_assignments_seller_class ON sms_assignments(seller_id, class_id);
CREATE INDEX IF NOT EXISTS idx_sms_assignments_teacher ON sms_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sms_assignments_due ON sms_assignments(due_date);

DROP TRIGGER IF EXISTS update_sms_assignments_updated_at ON sms_assignments;
CREATE TRIGGER update_sms_assignments_updated_at BEFORE UPDATE ON sms_assignments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Submissions
-- ============================================
CREATE TABLE IF NOT EXISTS sms_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES sms_assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES sms_students(id) ON DELETE CASCADE,
    content TEXT,
    file_url TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'late')),
    marks_obtained DECIMAL(7,2) DEFAULT 0,
    feedback TEXT,
    graded_by UUID REFERENCES sms_teaching_staff(id) ON DELETE SET NULL,
    graded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_sms_submissions_seller ON sms_submissions(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_submissions_assignment ON sms_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_sms_submissions_student ON sms_submissions(student_id);

DROP TRIGGER IF EXISTS update_sms_submissions_updated_at ON sms_submissions;
CREATE TRIGGER update_sms_submissions_updated_at BEFORE UPDATE ON sms_submissions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Timetable
-- ============================================
CREATE TABLE IF NOT EXISTS sms_timetable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES sms_classes(id),
    section_id UUID REFERENCES sms_sections(id) ON DELETE SET NULL,
    subject_id UUID NOT NULL REFERENCES sms_subjects(id),
    teacher_id UUID REFERENCES sms_teaching_staff(id) ON DELETE SET NULL,
    academic_year_id UUID REFERENCES sms_academic_years(id) ON DELETE SET NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    period_number INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_timetable_seller ON sms_timetable(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_timetable_class_section ON sms_timetable(class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_sms_timetable_teacher ON sms_timetable(teacher_id);
CREATE INDEX IF NOT EXISTS idx_sms_timetable_day_period ON sms_timetable(day_of_week, period_number);

DROP TRIGGER IF EXISTS update_sms_timetable_updated_at ON sms_timetable;
CREATE TRIGGER update_sms_timetable_updated_at BEFORE UPDATE ON sms_timetable FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Attendance
-- ============================================
CREATE TABLE IF NOT EXISTS sms_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES sms_students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES sms_classes(id),
    section_id UUID REFERENCES sms_sections(id) ON DELETE SET NULL,
    academic_year_id UUID REFERENCES sms_academic_years(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day')),
    remarks TEXT,
    recorded_by UUID REFERENCES sms_teaching_staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sms_attendance_seller ON sms_attendance(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_attendance_student_date ON sms_attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_sms_attendance_class_date ON sms_attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_sms_attendance_section_date ON sms_attendance(section_id, date);

DROP TRIGGER IF EXISTS update_sms_attendance_updated_at ON sms_attendance;
CREATE TRIGGER update_sms_attendance_updated_at BEFORE UPDATE ON sms_attendance FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Events
-- ============================================
CREATE TABLE IF NOT EXISTS sms_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
    location TEXT,
    audience VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'students', 'teachers', 'classes')),
    class_ids UUID[] DEFAULT '{}',
    section_ids UUID[] DEFAULT '{}',
    academic_year_id UUID REFERENCES sms_academic_years(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    color VARCHAR(20) DEFAULT '#3b82f6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_events_seller ON sms_events(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_events_seller_start ON sms_events(seller_id, start_date);

DROP TRIGGER IF EXISTS update_sms_events_updated_at ON sms_events;
CREATE TRIGGER update_sms_events_updated_at BEFORE UPDATE ON sms_events FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Fee Structures
-- ============================================
CREATE TABLE IF NOT EXISTS sms_fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    class_id UUID REFERENCES sms_classes(id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    frequency VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly', 'quarterly', 'annual', 'one_time')),
    due_date_day INTEGER CHECK (due_date_day BETWEEN 1 AND 31),
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    academic_year_id UUID REFERENCES sms_academic_years(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_fee_structures_seller ON sms_fee_structures(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_fee_structures_seller_class ON sms_fee_structures(seller_id, class_id);

DROP TRIGGER IF EXISTS update_sms_fee_structures_updated_at ON sms_fee_structures;
CREATE TRIGGER update_sms_fee_structures_updated_at BEFORE UPDATE ON sms_fee_structures FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Fee Structure Items
-- ============================================
CREATE TABLE IF NOT EXISTS sms_fee_structure_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    fee_structure_id UUID NOT NULL REFERENCES sms_fee_structures(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(12,2) NOT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_fee_structure_items_seller ON sms_fee_structure_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_fee_structure_items_fee_structure ON sms_fee_structure_items(fee_structure_id);

DROP TRIGGER IF EXISTS update_sms_fee_structure_items_updated_at ON sms_fee_structure_items;
CREATE TRIGGER update_sms_fee_structure_items_updated_at BEFORE UPDATE ON sms_fee_structure_items FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Fee Payments
-- ============================================
CREATE TABLE IF NOT EXISTS sms_fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES sms_students(id),
    fee_structure_id UUID NOT NULL REFERENCES sms_fee_structures(id),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'mobile_money', 'cheque')),
    reference VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    academic_year_id UUID REFERENCES sms_academic_years(id) ON DELETE SET NULL,
    recorded_by UUID REFERENCES sms_teaching_staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_fee_payments_seller ON sms_fee_payments(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_fee_payments_student ON sms_fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_sms_fee_payments_fee_structure ON sms_fee_payments(fee_structure_id);

DROP TRIGGER IF EXISTS update_sms_fee_payments_updated_at ON sms_fee_payments;
CREATE TRIGGER update_sms_fee_payments_updated_at BEFORE UPDATE ON sms_fee_payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Concessions (Scholarships/Discounts)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_concessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES sms_students(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('scholarship', 'discount')),
    amount DECIMAL(12,2) DEFAULT 0,
    percentage DECIMAL(5,2) CHECK (percentage >= 0 AND percentage <= 100),
    reason TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    approved_by UUID REFERENCES sms_teaching_staff(id) ON DELETE SET NULL,
    academic_year_id UUID REFERENCES sms_academic_years(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_concessions_seller ON sms_concessions(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_concessions_student ON sms_concessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sms_concessions_active ON sms_concessions(seller_id, is_active) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS update_sms_concessions_updated_at ON sms_concessions;
CREATE TRIGGER update_sms_concessions_updated_at BEFORE UPDATE ON sms_concessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Announcements
-- ============================================
CREATE TABLE IF NOT EXISTS sms_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    audience VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'students', 'teachers', 'classes')),
    class_ids UUID[] DEFAULT '{}',
    section_ids UUID[] DEFAULT '{}',
    academic_year_id UUID REFERENCES sms_academic_years(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_announcements_seller ON sms_announcements(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_announcements_seller_active ON sms_announcements(seller_id, is_active) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS update_sms_announcements_updated_at ON sms_announcements;
CREATE TRIGGER update_sms_announcements_updated_at BEFORE UPDATE ON sms_announcements FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Messages (internal school communications)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES sms_teaching_staff(id) ON DELETE SET NULL,
    recipient_type VARCHAR(50) NOT NULL CHECK (recipient_type IN ('all', 'student', 'guardian', 'teacher', 'class', 'section')),
    recipient_ids UUID[] DEFAULT '{}',
    subject VARCHAR(255),
    message TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_seller ON sms_messages(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_seller_read ON sms_messages(seller_id, is_read);
CREATE INDEX IF NOT EXISTS idx_sms_messages_sender ON sms_messages(sender_id);

DROP TRIGGER IF EXISTS update_sms_messages_updated_at ON sms_messages;
CREATE TRIGGER update_sms_messages_updated_at BEFORE UPDATE ON sms_messages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Documents
-- ============================================
CREATE TABLE IF NOT EXISTS sms_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('report_card', 'transfer_certificate', 'id_card', 'admission_letter', 'fee_receipt', 'other')),
    accessible_by VARCHAR(50) NOT NULL DEFAULT 'student' CHECK (accessible_by IN ('student', 'guardian', 'teacher', 'all')),
    related_to_id UUID,
    related_to_type VARCHAR(50) CHECK (related_to_type IN ('student', 'teacher', 'exam', 'class', 'subject')),
    academic_year_id UUID REFERENCES sms_academic_years(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES sms_teaching_staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_documents_seller ON sms_documents(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_documents_seller_type ON sms_documents(seller_id, document_type);
CREATE INDEX IF NOT EXISTS idx_sms_documents_related ON sms_documents(related_to_type, related_to_id);

DROP TRIGGER IF EXISTS update_sms_documents_updated_at ON sms_documents;
CREATE TRIGGER update_sms_documents_updated_at BEFORE UPDATE ON sms_documents FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- Audit Log
-- ============================================
CREATE TABLE IF NOT EXISTS sms_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(50),
    description TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    ip_address VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_audit_log_seller ON sms_audit_log(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_audit_log_seller_action ON sms_audit_log(seller_id, action);
CREATE INDEX IF NOT EXISTS idx_sms_audit_log_entity ON sms_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sms_audit_log_created ON sms_audit_log(created_at DESC);

-- ============================================
-- School Invites (school_code for teacher/parent registration)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_school_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('teacher', 'parent', 'admin')),
    expires_at TIMESTAMP WITH TIME ZONE,
    max_uses INTEGER DEFAULT 0,
    used_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_school_invites_seller ON sms_school_invites(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_school_invites_code ON sms_school_invites(code);
CREATE INDEX IF NOT EXISTS idx_sms_school_invites_active ON sms_school_invites(is_active) WHERE is_active = TRUE;

-- ============================================
-- Subscription Plans (school-level pricing tiers)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    interval_type VARCHAR(20) NOT NULL DEFAULT 'month' CHECK (interval_type IN ('month', 'year')),
    features JSONB DEFAULT '[]'::JSONB,
    max_students INTEGER,
    max_teachers INTEGER,
    max_classes INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_subscription_plans_active ON sms_subscription_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_sms_subscription_plans_sort ON sms_subscription_plans(sort_order);

DROP TRIGGER IF EXISTS update_sms_subscription_plans_updated_at ON sms_subscription_plans;
CREATE TRIGGER update_sms_subscription_plans_updated_at BEFORE UPDATE ON sms_subscription_plans FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- School Subscriptions (tracks which plan a school is on)
-- ============================================
CREATE TABLE IF NOT EXISTS sms_school_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL UNIQUE REFERENCES sellers(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES sms_subscription_plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_school_subscriptions_seller ON sms_school_subscriptions(seller_id);
CREATE INDEX IF NOT EXISTS idx_sms_school_subscriptions_plan ON sms_school_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_sms_school_subscriptions_status ON sms_school_subscriptions(status);
