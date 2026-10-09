import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  ClipboardCheck,
  Calendar,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  MessageSquare,
  Shield,
  Banknote,
  Briefcase,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import './sms.css';

interface SmsLayoutProps {
  children: React.ReactNode;
  role: 'owner' | 'admin' | 'teacher' | 'student' | 'parent';
}

const navItems: Record<string, { label: string; icon: React.ReactNode; href: string }[]> = {
  owner: [
    { label: 'Owner overview', icon: <LayoutDashboard size={18} />, href: '/sms/owner' },
  ],
  admin: [
    { label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/sms/admin' },
    { label: 'Students', icon: <Users size={18} />, href: '/sms/admin/students' },
    { label: 'Staff', icon: <Briefcase size={18} />, href: '/sms/admin/staff' },
    { label: 'Classes', icon: <GraduationCap size={18} />, href: '/sms/admin/classes' },
    { label: 'Subjects', icon: <BookOpen size={18} />, href: '/sms/admin/subjects' },
    { label: 'Attendance', icon: <ClipboardCheck size={18} />, href: '/sms/admin/attendance' },
    { label: 'Timetable', icon: <Calendar size={18} />, href: '/sms/admin/timetable' },
    { label: 'Exams', icon: <FileText size={18} />, href: '/sms/admin/exams' },
    { label: 'Grades', icon: <BarChart3 size={18} />, href: '/sms/admin/grades' },
    { label: 'Assignments', icon: <BookOpen size={18} />, href: '/sms/admin/assignments' },
    { label: 'Fees', icon: <Banknote size={18} />, href: '/sms/admin/fees' },
    { label: 'Announcements', icon: <Bell size={18} />, href: '/sms/admin/announcements' },
    { label: 'Documents', icon: <FileText size={18} />, href: '/sms/admin/documents' },
    { label: 'Audit Log', icon: <Shield size={18} />, href: '/sms/admin/audit-log' },
    { label: 'Settings', icon: <Settings size={18} />, href: '/sms/admin/settings' },
  ],
  teacher: [
    { label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/sms/teacher' },
    { label: 'My Classes', icon: <GraduationCap size={18} />, href: '/sms/teacher/classes' },
    { label: 'Attendance', icon: <ClipboardCheck size={18} />, href: '/sms/teacher/attendance' },
    { label: 'Timetable', icon: <Calendar size={18} />, href: '/sms/teacher/timetable' },
    { label: 'Exams', icon: <FileText size={18} />, href: '/sms/teacher/exams' },
    { label: 'Assignments', icon: <BookOpen size={18} />, href: '/sms/teacher/assignments' },
    { label: 'Messages', icon: <MessageSquare size={18} />, href: '/sms/teacher/messages' },
  ],
  student: [
    { label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/sms/student' },
    { label: 'My Attendance', icon: <ClipboardCheck size={18} />, href: '/sms/student/attendance' },
    { label: 'Timetable', icon: <Calendar size={18} />, href: '/sms/student/timetable' },
    { label: 'Exams', icon: <FileText size={18} />, href: '/sms/student/exams' },
    { label: 'Assignments', icon: <BookOpen size={18} />, href: '/sms/student/assignments' },
    { label: 'Grades', icon: <BarChart3 size={18} />, href: '/sms/student/grades' },
    { label: 'Messages', icon: <MessageSquare size={18} />, href: '/sms/student/messages' },
    { label: 'Documents', icon: <FileText size={18} />, href: '/sms/student/documents' },
    { label: 'Fees', icon: <Banknote size={18} />, href: '/sms/student/fees' },
  ],
  parent: [
    { label: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/sms/parent' },
    { label: 'Attendance', icon: <ClipboardCheck size={18} />, href: '/sms/parent/attendance' },
    { label: 'Timetable', icon: <Calendar size={18} />, href: '/sms/parent/timetable' },
    { label: 'Exams', icon: <FileText size={18} />, href: '/sms/parent/exams' },
    { label: 'Assignments', icon: <BookOpen size={18} />, href: '/sms/parent/assignments' },
    { label: 'Grades', icon: <BarChart3 size={18} />, href: '/sms/parent/grades' },
    { label: 'Messages', icon: <MessageSquare size={18} />, href: '/sms/parent/messages' },
    { label: 'Fees', icon: <Banknote size={18} />, href: '/sms/parent/fees' },
  ],
};

const roleLabels = {
  owner: 'Platform Owner',
  admin: 'School Admin',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent/Guardian',
};

const SmsLayout: React.FC<SmsLayoutProps> = ({ children, role }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const items = navItems[role];
  const isActive = (href: string) => location.pathname.startsWith(href.split('?')[0]);

  return (
    <div className="sms-bg min-h-screen">
      {/* Header */}
      <header className="sms-bg-card border-b sms-border sticky top-0 z-20">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden rounded-lg p-2 text-sm hover:bg-[var(--sms-soft-2] sms-text-muted"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <Link to={`/sms/${role === 'admin' ? 'admin' : role}`} className="flex items-center gap-3">
              <span className="text-2xl">🎓</span>
              <span className="hidden font-bold text-xl sms-text md:inline-block">
                Iyonicorp SMS
              </span>
            </Link>
            <span className="sms-badge sms-badge-soft text-xs">
              {roleLabels[role]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-sm sms-text-muted hover:bg-[var(--sms-soft)]">
              <Bell size={18} />
            </button>
            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sms-primary-light)] text-[var(--sms-primary-deep)]">
                <span className="text-xs font-bold">
                  {user?.firstName?.[0] || user?.name?.[0] || 'U'}
                </span>
              </div>
              <span className="hidden text-sm font-medium sms-text md:inline-block">
                {user?.firstName || user?.name || 'User'}
              </span>
            </div>
            <button
              className="rounded-lg p-2 text-sm sms-text-muted hover:bg-[var(--sms-soft)]"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-none gap-0 px-3 py-4 sm:px-5 sm:py-6">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 top-16 z-40 w-64 overflow-y-auto overflow-x-hidden transition-transform lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } sms-bg-card border-r sms-border h-[calc(100vh-4rem)]`}
        >
          <nav className="space-y-1.5 p-3">
            {items.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={
                  isActive(item.href) ? 'sms-nav-item-active' : 'sms-nav-item'
                }
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t sms-border p-3">
            <button
              className="sms-nav-item w-full"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 overflow-x-hidden lg:ml-64">{children}</main>
      </div>
    </div>
  );
};

export default SmsLayout;
