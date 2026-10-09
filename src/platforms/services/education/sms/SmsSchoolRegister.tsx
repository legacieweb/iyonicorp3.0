import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { smsAPI } from './smsApi';
import SmsAuthLayout from './SmsAuthLayout';

const SmsSchoolRegister: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillSchoolCode = searchParams.get('school') || '';

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    schoolName: '',
    subdomain: '',
    adminEmail: '',
    adminPassword: '',
    adminConfirmPassword: '',
    adminFirstName: '',
    adminLastName: '',
    adminPhone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    phone: '',
    email: '',
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const nextStep = () => {
    if (step === 1 && (!formData.schoolName || !formData.subdomain)) {
      setError('Please provide the school name and URL.');
      return;
    }
    if (step === 2 && (!formData.adminEmail || !formData.adminPassword)) {
      setError('Please provide admin email and password.');
      return;
    }
    if (step === 2 && formData.adminPassword !== formData.adminConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.schoolName || !formData.adminEmail || !formData.adminPassword || !formData.subdomain) return;

    setLoading(true);
    setError(null);
    try {
      const response = await smsAPI.auth.schoolRegister({
        schoolName: formData.schoolName,
        subdomain: formData.subdomain,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        adminFirstName: formData.adminFirstName,
        adminLastName: formData.adminLastName,
        adminPhone: formData.adminPhone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postalCode: formData.postalCode,
        phone: formData.phone,
        email: formData.email,
      });
      setSuccessCode(response.schoolCode);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, label: 'School info' },
    { number: 2, label: 'Admin account' },
    { number: 3, label: 'Contact details' },
  ];

  if (successCode) {
    return (
      <SmsAuthLayout title="School registered!" subtitle="Your school has been created." showBack={false}>
        <div className="text-center">
          <CheckCircle size={48} className="text-[var(--sms-primary)] mx-auto mb-4" />
          <p className="mb-4 sms-text">
            Your school code is: <span className="font-bold text-xl">{successCode}</span>
          </p>
          <p className="text-sm sms-text-muted mb-6">
            Share this code with teachers and parents so they can join your school.
          </p>
          <Link to={`/sms/login?school=${successCode}`} className="sms-btn w-full justify-center">
            Continue to login
          </Link>
        </div>
      </SmsAuthLayout>
    );
  }

  return (
    <SmsAuthLayout
      title="Register your school"
      subtitle="Create your school account in three simple steps."
      showBack
    >
      {/* Step indicator */}
      <div className="mb-6 flex items-center justify-between">
        {steps.map((s) => (
          <div key={s.number} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                step >= s.number
                  ? 'bg-[var(--sms-primary)] text-white'
                  : 'bg-[var(--sms-soft-2)] sms-text-muted'
              }`}
            >
              {s.number}
            </div>
            <span className="ml-2 text-xs font-medium sms-text-muted">{s.label}</span>
            {s.number < steps.length && <ArrowRight size={14} className="mx-2 sms-text-muted" />}
          </div>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: School info */}
        {step === 1 && (
          <>
            <div>
              <label className="block text-sm font-medium sms-text mb-1">School name</label>
              <input
                type="text"
                value={formData.schoolName}
                onChange={(e) => updateField('schoolName', e.target.value)}
                className="sms-input"
                placeholder="e.g. Lincoln Elementary School"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium sms-text mb-1">School URL (subdomain)</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.subdomain}
                  onChange={(e) => updateField('subdomain', e.target.value)}
                  className="sms-input pr-16"
                  placeholder="lincolnelementary"
                  required
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm sms-text-muted">
                  .sms.iyonicorp.com
                </span>
              </div>
              <p className="mt-1 text-xs sms-text-muted">
                This will be your school's unique URL. Use letters, numbers, and hyphens.
              </p>
            </div>
          </>
        )}

        {/* Step 2: Admin account */}
        {step === 2 && (
          <>
            <div>
              <label className="block text-sm font-medium sms-text mb-1">Admin first name</label>
              <input
                type="text"
                value={formData.adminFirstName}
                onChange={(e) => updateField('adminFirstName', e.target.value)}
                className="sms-input"
                placeholder="Jane"
              />
            </div>

            <div>
              <label className="block text-sm font-medium sms-text mb-1">Admin last name</label>
              <input
                type="text"
                value={formData.adminLastName}
                onChange={(e) => updateField('adminLastName', e.target.value)}
                className="sms-input"
                placeholder="Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium sms-text mb-1">Admin email address</label>
              <input
                type="email"
                value={formData.adminEmail}
                onChange={(e) => updateField('adminEmail', e.target.value)}
                className="sms-input"
                placeholder="admin@your-school.edu"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium sms-text mb-1">Password</label>
              <input
                type="password"
                value={formData.adminPassword}
                onChange={(e) => updateField('adminPassword', e.target.value)}
                className="sms-input"
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-medium sms-text mb-1">Confirm password</label>
              <input
                type="password"
                value={formData.adminConfirmPassword}
                onChange={(e) => updateField('adminConfirmPassword', e.target.value)}
                className="sms-input"
                placeholder="Re-type password"
                required
              />
            </div>
          </>
        )}

        {/* Step 3: Contact details */}
        {step === 3 && (
          <>
            <div>
              <label className="block text-sm font-medium sms-text mb-1">School address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                className="sms-input"
                placeholder="123 School Street"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium sms-text mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  className="sms-input"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium sms-text mb-1">State / Province</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  className="sms-input"
                  placeholder="State"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium sms-text mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  className="sms-input"
                  placeholder="Country"
                />
              </div>
              <div>
                <label className="block text-sm font-medium sms-text mb-1">Postal code</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => updateField('postalCode', e.target.value)}
                  className="sms-input"
                  placeholder="ZIP / PIN"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium sms-text mb-1">School phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="sms-input"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium sms-text mb-1">School email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="sms-input"
                placeholder="info@your-school.edu"
              />
            </div>
          </>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-4">
          {step > 1 && (
            <button type="button" onClick={prevStep} className="sms-btn-ghost flex-1" disabled={loading}>
              Back
            </button>
          )}
          {step < 3 && (
            <button type="button" onClick={nextStep} className={`sms-btn flex-1 ${!step || step === 1 ? 'flex-1' : ''}`} disabled={loading}>
              Continue
            </button>
          )}
          {step === 3 && (
            <button type="submit" className="sms-btn flex-1" disabled={loading}>
              {loading ? 'Creating school…' : 'Create school'}
            </button>
          )}
        </div>
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

export default SmsSchoolRegister;
