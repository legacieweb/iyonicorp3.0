import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { smsAPI } from './smsApi';
import SmsAuthLayout from './SmsAuthLayout';
import { useAuth } from '../../../../context/AuthContext';

const SmsLogin: React.FC = () => {
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useAuth();
  const [searchParams] = useSearchParams();
  const schoolCode = searchParams.get('school') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user, token } = await smsAPI.auth.login({ email, password, schoolCode: schoolCode || undefined });
      setAuthenticatedUser(user, token);
      const destination = user.role === 'teacher'
        ? '/sms/teacher'
        : user.role === 'customer'
          ? '/sms/parent'
          : user.role === 'school_staff'
            ? '/sms/admin'
            : user.role === 'manager_admin'
              ? '/sms/owner'
              : user.role === 'seller'
                ? '/sms/owner'
              : '/sms';
      navigate(destination, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SmsAuthLayout
      title="Sign in to your school"
      subtitle="Enter your school email and password to access your account."
      showBack={false}
    >
      {schoolCode && (
        <div className="mb-4 rounded-lg bg-[var(--sms-soft-2)] p-3 text-sm">
          <span className="font-medium sms-text">School code:</span> {schoolCode}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium sms-text mb-1">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="sms-input"
            placeholder="you@school.edu"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium sms-text mb-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="sms-input pr-10"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm sms-text-muted"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="sms-btn w-full justify-center py-2.5"
        >
          {loading ? 'Signing in…' : <>Sign in</>}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        <Link
          to={`/sms/register/school${schoolCode ? `?school=${schoolCode}` : ''}`}
          className="sms-btn-ghost w-full justify-center"
        >
          Need a school account? Register here
        </Link>
        <Link
          to={`/sms/register/teacher${schoolCode ? `?school=${schoolCode}` : ''}`}
          className="sms-btn-ghost w-full justify-center"
        >
          Join as a teacher
        </Link>
        <Link
          to={`/sms/register/parent${schoolCode ? `?school=${schoolCode}` : ''}`}
          className="sms-btn-ghost w-full justify-center"
        >
          Join as a parent/guardian
        </Link>
      </div>
    </SmsAuthLayout>
  );
};

export default SmsLogin;
