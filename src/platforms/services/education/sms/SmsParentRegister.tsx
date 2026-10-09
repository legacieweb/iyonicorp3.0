import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PlusCircle, Trash2 } from 'lucide-react';
import { smsAPI } from './smsApi';
import SmsAuthLayout from './SmsAuthLayout';

const SmsParentRegister: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [schoolCode, setSchoolCode] = useState(searchParams.get('school') || '');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [childAdmissionNumbers, setChildAdmissionNumbers] = useState<string>('');
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

    const admissionList = childAdmissionNumbers
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setLoading(true);
    setError(null);
    try {
      await smsAPI.auth.parentRegister({
        schoolCode: schoolCode.toUpperCase(),
        firstName,
        lastName,
        email,
        password,
        phone: phone || undefined,
        relationship: relationship || undefined,
        childAdmissionNumbers: admissionList.length ? admissionList : undefined,
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
      title="Parent / Guardian registration"
      subtitle="Enter your school code to register as a parent or guardian."
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
            placeholder="you@example.com"
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
          <label className="block text-sm font-medium sms-text mb-1">Relationship</label>
          <select
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="sms-input cursor-pointer"
          >
            <option value="Parent">Parent</option>
            <option value="Guardian">Guardian</option>
            <option value="Father">Father</option>
            <option value="Mother">Mother</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium sms-text mb-1">
            Child admission number(s)
          </label>
          <input
            type="text"
            value={childAdmissionNumbers}
            onChange={(e) => setChildAdmissionNumbers(e.target.value)}
            className="sms-input"
            placeholder="e.g. ADM001, ADM002 (comma-separated, optional)"
          />
          <p className="mt-1 text-xs sms-text-muted">
            Link your children by entering their admission numbers. You can separate multiple children with commas.
          </p>
        </div>

        <button type="submit" className="sms-btn w-full justify-center py-2.5" disabled={loading}>
          {loading ? 'Creating account…' : 'Register as parent/guardian'}
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

export default SmsParentRegister;
