# School Management System (SMS) — Rebuild Specification

> Pivot of the TPP (Iyonicorp) multi-tenant platform into a specialized **School Management System**.

---

## 1. Executive Summary

The TPP platform is rebuilt into **EduCore SMS** — a multi-tenant SaaS school management system that serves K-12 private schools, charter schools, and district networks. The existing multi-tenant architecture (sellers → schools, JWT auth, PostgreSQL, React + TypeScript + Vite, Express.js) is repurposed and extended with education-specific data models and workflows.

**Core mapping:**
| TPP concept         | SMS equivalent            |
|---------------------|---------------------------|
| `seller`            | School                    |
| `seller_manager`    | School Owner / District   |
| `manager_admin`     | Platform Super Admin      |
| `customer`          | Extended to Student/Parent/Teacher (per-school role) |
| Theme / platform    | SMS module set            |

---

## 2. Feature Roadmap & Functional Requirements

### Phase 1 — Core Foundation (MVP)
| # | Feature                | Module              | Description |
|---|------------------------|---------------------|-------------|
| 1 | Multi-tenant schools   | School              | School on-boarding, subdomain branding, academic year config, term setup |
| 2 | Student Information    | SIS                 | Add/edit students, guardians, demographics, enrollment to classes/sections |
| 3 | Faculty Management     | HR                  | Staff directory, role-based permissions (admin/teacher/staff), employment details |
| 4 | Class & Section Mgmt   | SIS                 | Classes (Grade 1), sections (A/B/C), promote students between terms |
| 5 | Subject Management     | Curriculum          | Subject catalogue, class-subject mapping, credit hours |
| 6 | Authentication         | Core                | Role-based login, password reset, session management |

### Phase 2 — Academic Operations
| # | Feature                | Module              | Description |
|---|------------------------|---------------------|-------------|
| 7 | Attendance             | Attendance          | Daily mark-in/out, status (present/absent/late/excused), bulk upload, reports |
| 8 | Grading                | Academics           | Score entry (CA + Exam), grade schemes, GPA calculation, report card generation |
| 9 | Exams & Assessment     | Academics           | Exam scheduling, paper management, result processing |
| 10| Timetable/Scheduling   | Scheduling          | Period-wise timetable, teacher-room-subject allocation, conflict detection |
| 11| Assignments             | Academics           | Homework/issue assignments, submission tracking, grading |

### Phase 3 — Financial Operations
| # | Feature                | Module              | Description |
|---|------------------------|---------------------|-------------|
| 12| Fee Structure          | Finance             | Fee heads (tuition, labs, transport, activities), installment plans |
| 13| Fee Collection         | Finance             | Payment gateway integration (Paystack), receipt generation, partial payments |
| 14| Concessions & Discounts| Finance             | Student-level fee waivers, sibling discounts |
| 15| Financial Reports      | Finance             | Dues outstanding, payment history, profit & loss |

### Phase 4 — Communication & Engagement
| # | Feature                | Module              | Description |
|---|------------------------|---------------------|-------------|
| 16| Parent Portal          | Communication       | View child's progress, fees, reports, messages |
| 17| Teacher Portal         | Communication       | Attendance entry, grade entry, message parents |
| 18| In-App Messaging        | Communication       | Staff ↔ Parent ↔ Teacher messaging threads |
| 19| Announcements/Notices  | Communication       | School-wide announcements, targeted by class/grade |
| 20| Push/SMS/Email        | Communication       | Automated notifications for attendance, fees, results |

### Phase 5 — Advanced & Scalability
| # | Feature                | Module              | Description |
|---|------------------------|---------------------|-------------|
| 21| Multi-Academic-Year     | SIS                  | Historical data retention, archival, year rollover |
| 22| Analytics Dashboard    | Reports             | Enrollment trends, attendance heatmaps, grade distributions |
| 23| Data Import/Export     | Admin               | CSV bulk upload for students/staff, export reports |
| 24| Mobile-First Design    | UX                  | PWA support, offline attendance caching |
| 25| API & Integrations     | Admin               | REST API, webhook subscriptions, third-party integrations |

---

## 3. Functional Requirements Detail

### 3.1 Student Information System (SIS)

**FR-SIS-01:** Student records must include: full name, admission number (unique), date of birth, gender, blood group, nationality, religion, caste, previous school, address, emergency contact, and photo.

**FR-SIS-02:** Each student is linked to one guardian/parent account. A guardian can be linked to multiple students.

**FR-SIS-03:** Students must be enrolled to a class (Grade Level) and a section within that class. Enrollment includes the academic year and enrollment date.

**FR-SIS-04:** Students can be promoted to the next class at the end of an academic year. The system must retain historical enrollment records.

**FR-SIS-05:** Search and filter students by admission number, name, class, section, and enrollment status (active/inactive/transferred).

**FR-SIS-06:** Student profiles must display: academic history, attendance summary, grade summary, fee payment status, and disciplinary records (if enabled in Phase 5).

### 3.2 Faculty Management (HR)

**FR-HR-01:** Staff records include: name, employee ID (unique), designation, department, qualifications, experience, contact details, employment date, and photo.

**FR-HR-02:** Role-based access control within a school:
  - `school_admin` — full access
  - `teacher` — attendance, grades, assignments for assigned classes
  - `staff` — limited access (reception/admin support)

**FR-HR-03:** Teachers are assigned to specific classes and subjects. A teacher can be assigned to multiple classes and multiple subjects.

**FR-HR-04:** View and manage active/inactive staff. Filter by department and designation.

### 3.3 Grading & Academic Tracking

**FR-GRA-01:** Define grade schemes per school (e.g., A=90-100, B=80-89). Support configurable passing marks per subject.

**FR-GRA-02:** Enter two assessment components per subject: Continuous Assessment (CA) and Final Exam. Weightage is configurable.

**FR-GRA-03:** Auto-calculate final grades and GPA/CGPA based on the grade scheme.

**FR-GRA-04:** Generate report cards per student per term, including: subject-wise grades, GPA, attendance percentage, class teacher remarks, and principal remarks.

**FR-GRA-05:** View gradebooks per class, per subject — see all students' scores at a glance.

### 3.4 Attendance Monitoring

**FR-ATT-01:** Mark daily attendance per class/section with status: Present, Absent, Late, Excused.

**FR-ATT-02:** Bulk-select students for attendance marking (all present, then edit exceptions).

**FR-ATT-03:** Add remarks per absent student (optional).

**FR-ATT-04:** View attendance reports: daily summary, student-wise, class-wise monthly summary, and low-attendance alerts (<75%).

**FR-ATT-05:** Attendance data is tied to the academic calendar (terms/weeks).

### 3.5 Scheduling (Timetable)

**FR-SCH-01:** Create weekly timetables per class: day-of-week, period number, subject, teacher, room.

**FR-SCH-02:** Detect and prevent scheduling conflicts (same teacher/class/room at the same time).

**FR-SCH-03:** Print/export timetables for individual classes, teachers, and rooms.

**FR-SCH-04:** Configure academic calendar: terms, holidays, start/end dates.

### 3.6 Fee Management

**FR-FEE-01:** Define fee structures: fee heads (tuition, registration, lab, transport, activities), amounts, term-wise allocation.

**FR-FEE-02:** Assign fee structures to students (optionally with concessions/discounts per student).

**FR-FEE-03:** Collect payments via Paystack (card, bank transfer, mobile money). Record partial payments. Generate receipts.

**FR-FEE-04:** View fee dashboard: total dues, collected, outstanding, concessions given.

**FR-FEE-05:** Send automated reminders for overdue fees via email/SMS.

### 3.7 Parent-Teacher Communication Portal

**FR-COM-01:** Parents can log in to see their children's: grades, attendance, fees, report cards, and announcements.

**FR-COM-02:** Teachers can send messages to parents of their students (per student or per class broadcast).

**FR-COM-03:** In-app messaging between parents and teachers; conversation threads per student.

**FR-COM-04:** School can post announcements targeted to: all, specific classes, specific sections, or specific parents.

**FR-COM-05:** Real-time notifications (WebSocket) for new messages, announcements, and fee reminders.

### 3.8 Platform Admin (District/School Owner)

**FR-ADM-01:** Create and manage schools (sub-accounts), view platform-wide analytics.

**FR-ADM-02:** Configure school-wide settings: academic year, grading scheme defaults, fee heads, notification templates.

**FR-ADM-03:** Manage billing/subscriptions for schools (integrate with Paystack).

**FR-ADM-04:** Audit log of all administrative actions.

---

## 4. Scalable System Architecture

```
                      ┌─────────────────────────────────────────────┐
                      │                   Clients                     │
                      │  ┌───────────┐ ┌──────────┐  ┌─────────────┐ │
                      │  │ Web (PWA) │ │  Parent   │  │    Teacher   │ │
                      │  │  Browser  │ │   Portal  │  │    Portal    │ │
                      │  └──────┬────┘ └─────┬─────┘  └──────┬──────┘ │
                      └────────┼────────────┼────────────────┼────────┘
                               │            │                │
                    ┌──────────▼────────────▼────────────────▼────────┐
                    │          API Gateway / Load Balancer             │
                    │          (Traefik / Nginx)                      │
                    └─────────────────────┬───────────────────────────┘
                                          │
                    ┌─────────────────────┼───────────────────────────┐
                    │              Application Layer                 │
                    │  ┌──────────────┐  ┌──────────────┐              │
                    │  │  Frontend    │  │  Backend     │              │
                    │  │  (Vite)      │  │  (Express)   │              │
                    │  │  CDN / S3    │  │  Node.js     │              │
                    │  └──────┬───────┘  └──────┬───────┘              │
                    └─────────┼────────────────┼──────────────────────┘
                              │                │
                    ┌─────────▼────────────────▼────────┐
                    │    Shared Services Layer          │
                    │  ┌────────────┐ ┌────────────┐   │
                    │  │ Auth / JWT │ │ WebSocket  │   │
                    │  │ Redis      │ │ Socket.IO  │   │
                    │  └────────────┘ └────────────┘   │
                    │  ┌────────────┐ ┌────────────┐  │
                    │  │ Email/SMS  │ │ File Store │  │
                    │  │ (Nodemailer│ │ (Multer)   │  │
                    │  └────────────┘ └────────────┘  │
                    └────────────────┬───────────────┘
                                     │
                    ┌────────────────▼──────────────────┐
                    │     Data Layer                    │
                    │  ┌────────────┐ ┌─────────────┐   │
                    │  │ PostgreSQL │ │ Redis Cache │   │
                    │  │  (Primary) │ │ (optional)  │   │
                    │  └────────────┘ └─────────────┘   │
                    │  ┌────────────┐ ┌─────────────┐   │
                    │  │ PgBouncer  │ │Read Replica │   │
                    │  │ (pooling)  │ │ (optional)  │   │
                    │  └────────────┘ └─────────────┘   │
                    └───────────────────────────────────┘
```

### Key Scalability Decisions

1. **Multi-tenant via Row-Level Security (RLS)** — Each query is scoped by `seller_id` (school UUID) to ensure data isolation.
2. **Connection pooling** — `pg` Pool with configurable limits; PgBouncer in production.
3. **Horizontal scaling** — Stateless Node.js backend; multiple instances behind a load balancer.
4. **Caching** — Redis for session store, frequently accessed config, and real-time WebSocket presence.
5. **Event-driven background jobs** — `node-cron` for scheduled tasks (fee reminders, report generation, data archival).
6. **File storage** — Local disk during dev; S3-compatible object storage in production for uploaded photos/documents.
7. **WebSocket** — Socket.IO namespace per school for real-time messaging and notifications.
8. **Database partitioning** — Large tables (`attendance`, `messages`, `audit_logs`) partitioned by month/year.

### Data Isolation Strategy

- Every SMS table includes a `seller_id` foreign key referencing `sellers(id)`.
- A `requireSchool` middleware injects `req.schoolId` and scopes all queries.
- Platform super-admin (`manager_admin` role) can access cross-school data with explicit scoping.

---

## 5. Recommended Technology Stack

### Existing (Reused from TPP)
| Layer        | Tech |
|-------------|------|
| Backend runtime | Node.js 18+ |
| Web framework | Express.js 5 |
| Database | PostgreSQL 16 |
| ORM/Query  | pg (raw queries, same as existing) |
| Frontend | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| Auth | JWT + bcrypt |
| File upload | Multer |
| Email | Nodemailer |
| Payments | Paystack |
| State management | Zustand (existing) / React Context (existing) |
| UI icons | Lucide React |
| Charts | Recharts |
| Real-time | Socket.IO |
| Containerisation | Docker + Docker Compose |
| Reverse proxy | Caddy (existing) |

### New Additions
| Layer | Tech | Rationale |
|-------|------|-----------|
| Background jobs | `node-cron` | Recurring tasks (fee reminders, reports, archival) |
| CSV import/export | `papaparse` / `json2csv` | Bulk data operations |
| PDF report generation | `jspdf` + `jspdf-autotable` (already in use) | Report cards, fee receipts |
| Redis (optional) | `ioredis` | Session store + real-time presence |

### Development Tooling
| Tool | Purpose |
|------|---------|
| ESLint + TypeScript ESLint | Code quality |
| Prettier | Formatting (optional, not currently present) |
| Jest + React Testing Library | Unit/integration tests |
| Playwright | E2E tests |

---

## 6. User Experience (UX) Strategy

### 6.1 User Personas

| Persona | Key Goals | Pain Points |
|---------|-----------|-------------|
| School Admin (Principal) | Manage all operations from one dashboard, run reports | Tool overload, scattered data |
| Teacher | Take attendance, enter grades, message parents | Switching between apps |
| Parent | Track child's progress, pay fees, receive updates | Lack of visibility |
| Staff (Receptionist) | Enroll students, manage inquiries, basic data entry | Duplicate data entry |
| District Owner | Oversee multiple schools, analytics, billing | Limited oversight across schools |

### 6.2 Information Architecture

```
/sms                                — School admin dashboard (default)
/sms/classes                        — Classes & sections
/sms/classes/:id                    — Class detail (students, timetable)
/sms/students                       — Student directory
/sms/students/:id                   — Student profile (academics, fees, attendance)
/sms/staff                          — Staff directory
/sms/staff/:id                      — Staff profile
/sms/subjects                       — Subject catalogue
/sms/attendance                     — Attendance marking
/sms/attendance/:classId            — Mark attendance for a class
/sms/attendance/report            — Attendance reports
/sms/grades                         — Gradebook
/sms/grades/:classId/:subjectId     — Enter/view grades
/sms/exams                          — Exam management
/sms/timetable                      — Timetable management
/sms/fees                           — Fee dashboard
/sms/fees/structures                — Fee structure definition
/sms/fees/payments                  — Payment collection
/sms/fees/reports                   — Fee reports
/sms/messages                       — Messaging center
/sms/messages/:threadId             — Conversation view
/sms/announcements                  — Announcements
/sms/reports                        — Analytics & reports
/sms/settings                       — School settings
/sms/settings/academic-year         — Academic year config
/sms/settings/grade-scheme          — Grading config
/sms/settings/notifications         — Notification templates
```

Parent / Teacher portals are accessible via:
```
/parent                             — Parent portal home
/parent/children                    — List of linked children
/parent/child/:id                   — Child's overview (grades, attendance, fees)
/parent/messages                    — Parent messaging
/teacher                            — Teacher dashboard
/teacher/classes                    — Assigned classes
/teacher/attendance/:classId        — Take attendance
/teacher/grades/:classId            — Enter grades
/teacher/messages                   — Teacher messaging
```

### 6.3 UX Design Principles

1. **Role-based dashboards** — Each persona sees a dashboard tailored to their needs with relevant KPIs.
2. **Progressive disclosure** — Complex forms (fee structures, timetables) use step-by-step wizards.
3. **Bulk operations** — Attendance, grade entry, and fee collection support bulk actions to reduce clicks.
4. **Mobile-first** — All views are responsive. Touch targets are ≥44px. Offline-capable PWA for attendance.
5. **Consistent navigation** — Sidebar with grouped sections, breadcrumb navigation, quick search (Cmd+K).
6. **Real-time feedback** — WebSocket-powered notifications, optimistic UI updates.
7. **Accessibility** — WCAG 2.1 AA compliance (keyboard nav, ARIA labels, sufficient contrast).

### 6.4 Visual Design

| Element | Specification |
|---------|---------------|
| Color palette | Primary: `#1E40AF` (indigo), Secondary: `#047857` (emerald), Accent: `#D97706` (amber) |
| Typography | Inter (system fallback) |
| Spacing | 4px grid system (Tailwind default) |
| Icons | Lucide React (consistent with existing codebase) |
| Components | Reuse existing `Button`, `Card`, `Modal`, `Table`, `Input` UI components |

### 6.5 Interaction Patterns

- **Quick actions FAB** on dashboards for common actions (add student, take attendance).
- **Data tables** with sorting, filtering, pagination, and row selection.
- **Modals** for create/edit forms with validation.
- **Tabs** for switching between views within a section.
- **Toast notifications** for success/error feedback.
- **Search everywhere** — global search with keyboard shortcut (Cmd/Ctrl + K).

---

## 7. Database Schema (SMS Tables)

All SMS tables are scoped by `seller_id` (school). Key tables:

| Table | Purpose |
|-------|---------|
| `school_classes` | Class definitions (Grade 1, Grade 2, etc.) |
| `school_sections` | Sections within a class (A, B, C) |
| `school_subjects` | Subject catalogue |
| `school_class_subjects` | Many-to-many: classes ↔ subjects |
| `school_students` | Student records |
| `school_guardians` | Parent/guardian accounts |
| `school_student_guardians` | Many-to-many: students ↔ guardians |
| `school_enrollments` | Student-class-section enrollment |
| `school_teaching_staff` | Teacher/staff records |
| `school_teacher_assignments` | Teachers ↔ classes/subjects |
| `school_attendance` | Daily attendance records |
| `school_grade_schemes` | Grading scales |
| `school_exams` | Exam definitions |
| `school_exam_results` | Student exam scores |
| `school_assignments` | Assignment definitions |
| `school_assignment_submissions` | Student assignment submissions |
| `school_timetable` | Weekly schedule |
| `school_academic_years` | Academic year config |
| `school_events` | Calendar events (holidays, exams) |
| `school_fee_structures` | Fee definitions |
| `school_fee_payments` | Payment records |
| `school_fee_concessions` | Student fee discounts |
| `school_messages` | Messaging threads |
| `school_message_recipients` | Message participants |
| `school_announcements` | School announcements |
| `school_documents` | School documents/resources |
| `school_audit_log` | Audit trail |

---

## 8. API Endpoints (REST)

All routes are prefixed with `/api/sms` and require JWT authentication + school scoping.

```
GET    /api/sms/config          — School config (year, terms, settings)
GET    /api/sms/classes          — List classes (with sections)
POST   /api/sms/classes          — Create class
PUT    /api/sms/classes/:id      — Update class
DELETE /api/sms/classes/:id      — Delete class
GET    /api/sms/subjects         — List subjects
POST   /api/sms/subjects         — Create subject
PUT    /api/sms/subjects/:id     — Update subject
DELETE /api/sms/subjects/:id     — Delete subject
GET    /api/sms/students         — List/filter students
POST   /api/sms/students         — Create student
PUT    /api/sms/students/:id     — Update student
DELETE /api/sms/students/:id     — Delete student
GET    /api/sms/students/:id/profile — Detailed profile
GET    /api/sms/staff            — List staff
POST   /api/sms/staff            — Create staff
PUT    /api/sms/staff/:id        — Update staff
GET    /api/sms/teachers         — List teachers (for assignment)
GET    /api/sms/enrollments      — List enrollments
POST   /api/sms/enrollments      — Enroll student
DELETE /api/sms/enrollments/:id  — Remove enrollment
GET    /api/sms/attendance       — List attendance (query: date, classId)
POST   /api/sms/attendance       — Record attendance (bulk)
GET    /api/sms/attendance/report — Attendance analytics
GET    /api/sms/grades           — List grade entries (query: classId, subjectId)
POST   /api/sms/grades           — Record/update grades
GET    /api/sms/grades/student/:id — Student's grade summary
GET    /api/sms/exams            — List exams
POST   /api/sms/exams            — Create exam
PUT    /api/sms/exams/:id        — Update exam
GET    /api/sms/exams/:id/results — Exam results
GET    /api/sms/assignments      — List assignments
POST   /api/sms/assignments      — Create assignment
GET    /api/sms/assignments/:id/submissions — View submissions
POST   /api/sms/submissions/:id/grade — Grade submission
GET    /api/sms/timetable        — Get timetable (query: classId)
POST   /api/sms/timetable        — Create/update timetable entry
GET    /api/sms/fees/structures  — Fee structures
POST   /api/sms/fees/structures  — Create fee structure
GET    /api/sms/fees/payments    — Payment records (query: studentId)
POST   /api/sms/fees/payments/initialize — Initialize Paystack payment
POST   /api/sms/fees/payments/verify — Verify payment
GET    /api/sms/fees/reports     — Fee analytics
GET    /api/sms/messages         — Message threads
POST   /api/sms/messages         — Send message
GET    /api/sms/messages/:id     — Thread detail
GET    /api/sms/announcements    — List announcements
POST   /api/sms/announcements    — Create announcement
PUT    /api/sms/announcements/:id — Update
DELETE /api/sms/announcements/:id — Delete
GET    /api/sms/documents        — List school documents
POST   /api/sms/documents        — Upload document
GET    /api/sms/dashboard/stats  — Dashboard KPIs
GET    /api/sms/audit-log        — Audit trail (admin only)
GET    /api/sms/teachers/:id/students — Teacher's assigned students
GET    /api/sms/students/:id/fees — Student's fee summary
GET    /api/sms/students/:id/reports — Student's report card (PDF)
```

### WebSocket Events (Socket.IO, namespace: `/sms`)
| Event | Direction | Payload |
|-------|-----------|---------|
| `join:school` | Client→Server | `{ schoolId }` — joins room |
| `attendance:marked` | Server→Client | `{ classId, date, markedBy }` |
| `grade:updated` | Server→Client | `{ studentId, subjectId }` |
| `message:new` | Server→Client | `{ threadId, message }` |
| `announcement:posted` | Server→Client | `{ announcement }` |
| `fee:payment` | Server→Client | `{ studentId, amount }` |

---

## 9. Implementation Phases & Timeline

| Phase | Duration (est.) | Deliverables |
|-------|-----------------|--------------|
| Phase 1 — Foundation | 3 days | DB schema, auth extension, SIS, HR, subjects, classes |
| Phase 2 — Academics | 3 days | Attendance, grading, exams, timetable |
| Phase 3 — Finance | 2 days | Fee structures, payments, concessions |
| Phase 4 — Communication | 2 days | Messaging, announcements, parent/teacher portals |
| Phase 5 — Polish & Scale | 2 days | Analytics, audit log, responsive design, docs |
| **Total** | **~12 days** | Production-ready SMS MVP |

---

## 10. Migration Strategy from TPP → SMS

1. **Schema extension** — New `*_school*` tables are added alongside existing tables; no destructive migrations.
2. **Role mapping** — The `seller` role becomes `school_admin` conceptually; existing routes continue to work. New `school_staff` role is added to the users table role CHECK constraint.
3. **Theme registration** — `sms` is added to `VIP_THEME_IDS` and `THEME_DASHBOARD_ROUTES`.
4. **API routes** — New routes are mounted via a dedicated `smsRoutes.js` module, imported and mounted in `server.js`.
5. **Frontend** — New `src/platforms/services/education/sms/` module with its own routes in `App.tsx`, styled with the existing Tailwind config and UI component library.
