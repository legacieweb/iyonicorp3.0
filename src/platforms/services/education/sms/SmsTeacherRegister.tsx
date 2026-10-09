import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserCheck } from 'lucide-react';
import { smsAPI } from './smsApi';
import SmsAuthLayout from './SmsAuthLayout';

const SmsTeacherRegister: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [schoolCode, setSchoolCode] = useState(searchParams.get('school') || '');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolCode || !firstName || !lastName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await smsAPI.auth.teacherRegister({
        schoolCode: schoolCode.toUpperCase(),
        firstName,
        lastName,
        email,
        password,
        phone: phone || undefined,
        qualification: qualification || undefined,
        department: department || undefined,
      });
      window.location.reload();
      navigate('/sms');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SmsAuthLayout
      title="Teacher registration"
      subtitle="Enter your school code to join your school as a teacher."
    >
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium sms-text mb-1">School code *</label>
          <input
            type="text"
            value={schoolCode}
            onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
            className="sms-input font-mono text-center text-2xl tracking-wider"
            placeholder="Enter school code"
            maxLength={20}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium sms-text mb-1">First name *</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="sms-input"
              placeholder="Jane"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium sms-text mb-1">Last name *</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="sms-input"
              placeholder="Smith"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium sms-text mb-1">Email address *</label>
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
          <label className="block text-sm font-medium sms-text mb-1">Password *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sms-input"
            placeholder="At least 8 characters"
            required
            minLength={8}
          />
        </div>

        <div>
          <label className="block text-sm font-medium sms-text mb-1">Phone number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="sms-input"
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium sms-text mb-1">Qualification</label>
          <input
            type="text"
            value={qualification}
            onChange={(e) => setQualification(e.target.value)}
            className="sms-input"
            placeholder="e.g. B.Ed, M.Sc"
          />
        </div>

        <div>
          <label className="block text-sm font-medium sms-text mb-1">Department</label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="sms-input"
            placeholder="e.g. Mathematics"
          />
        </div>

        <button type="submit" className="sms-btn w-full justify-center py-2.5" disabled={loading}>
          {loading ? 'Creating account…' : 'Register as teacher'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm sms-text-muted">
        Already have an account?{' '}
        <Link to="/sms/login" className="font-medium text-[var(--sms-primary)] hover:underline">
          Sign in
        </Link>
      </div>
    </SmsAuthLayout>
  );
};

export default SmsTeacherRegister;
