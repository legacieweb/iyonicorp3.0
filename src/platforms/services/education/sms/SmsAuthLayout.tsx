import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap } from 'lucide-react';
import './sms.css';

interface SmsAuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showBack?: boolean;
}

const SmsAuthLayout: React.FC<SmsAuthLayoutProps> = ({ children, title, subtitle, showBack = true }) => {
  const navigate = useNavigate();

  return (
    <div className="sms-bg min-h-screen">
      <div className="container mx-auto flex min-h-screen flex-col justify-center px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg p-2 text-sm sms-text-muted hover:bg-[var(--sms-soft)]"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <Link to="/sms" className="flex items-center gap-3">
            <GraduationCap size={24} className="text-[var(--sms-primary)]" />
            <span className="font-bold text-xl sms-text">Iyonicorp School Manager</span>
          </Link>
        </div>

        {/* Auth card */}
        <div className="mx-auto w-full max-w-md">
          <div className="sms-card p-8">
            <h1 className="text-2xl font-bold sms-text mb-2">{title}</h1>
            {subtitle && <p className="text-sm sms-text-muted mb-6">{subtitle}</p>}
            {children}
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs sms-text-muted">
            <p>By continuing, you agree to the Iyonicorp Terms of Service and Privacy Policy.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmsAuthLayout;
