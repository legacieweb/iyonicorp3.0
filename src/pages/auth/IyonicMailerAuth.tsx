import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle,
  Sparkles,
  BarChart3,
  Send,
  Shield,
} from 'lucide-react';
import { authAPI } from '../../services/api';
import { getAuthErrorDetails } from '../../utils/authErrors';
import SEO from '../../components/SEO';

interface IyonicMailerAuthProps {
  mode?: 'login' | 'register';
  onSwitchMode?: () => void;
}

interface FormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  confirmPassword: string;
}

export const IyonicMailerAuth: React.FC<IyonicMailerAuthProps> = ({
  mode = 'login',
  onSwitchMode,
}) => {
  const { login, register, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (mode === 'register') {
          if (value.length < 8) return 'Password must be at least 8 characters';
          if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter';
          if (!/[0-9]/.test(value)) return 'Password must contain a number';
        }
        return '';
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        return '';
      case 'firstName':
        if (mode === 'register' && !value.trim()) return 'First name is required';
        return '';
      case 'lastName':
        if (mode === 'register' && !value.trim()) return 'Last name is required';
        return '';
      default:
        return '';
    }
  };

  const validateForm = (): string | null => {
    const fields = mode === 'register'
      ? ['firstName', 'lastName', 'email', 'password', 'confirmPassword']
      : ['email', 'password'];
    for (const field of fields) {
      const err = validateField(field, formData[field as keyof FormData]);
      if (err) return err;
    }
    if (mode === 'register' && !agreed) return 'Please agree to the Terms of Service and Privacy Policy';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(formData.email.trim(), formData.password);
      } else {
        await register({
          email: formData.email.trim(),
          password: formData.password,
          name: `${formData.firstName} ${formData.lastName}`,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: '',
          role: 'seller',
        });
      }

      const from = (location.state as any)?.from?.pathname || '/seller/dashboard?tab=marketing';
      navigate(from);
    } catch (err: any) {
      const details = getAuthErrorDetails(err, mode === 'login' ? 'Login failed.' : 'Registration failed.');
      setError(`${details.title}: ${details.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: Send,
      title: 'Campaign Management',
      description: 'Design, schedule, and send email campaigns with automation.',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reporting',
      description: 'Real-time insights on opens, clicks, bounces, and conversions.',
    },
    {
      icon: Shield,
      title: 'API Access',
      description: 'Send emails programmatically with RESTful endpoints and webhooks.',
    },
    {
      icon: Sparkles,
      title: 'Custom Branding',
      description: 'Use your own domain, logo, and SMTP provider for fully branded emails.',
    },
  ];

  return (
    <>
      <SEO
        title={mode === 'login' ? 'Sign In to IyonicMailer' : 'Create IyonicMailer Account'}
        description="Sign in to IyonicMailer email marketing platform or create a new account. Manage campaigns, track analytics, and grow your business."
      />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Benefits */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Mail className="w-10 h-10 text-indigo-600" />
                <span className="text-2xl font-bold text-gray-900">IyonicMailer</span>
              </div>
              <h1 className="text-4xl font-extrabold text-gray-900 leading-tight">
                {mode === 'login' ? 'Welcome back' : 'Start sending better email'}
              </h1>
              <p className="text-lg text-gray-600 max-w-md">
                {mode === 'login'
                  ? 'Sign in to continue creating and managing your email campaigns.'
                  : 'Join thousands of businesses using IyonicMailer to create, send, and track professional email campaigns.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="flex items-start space-x-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <benefit.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{benefit.title}</h3>
                    <p className="text-xs text-gray-600 mt-1">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="font-medium text-gray-900">What you get:</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <ArrowRight className="w-4 h-4 mr-2 text-indigo-600" />
                  SMTP integration & campaign management
                </li>
                <li className="flex items-center">
                  <ArrowRight className="w-4 h-4 mr-2 text-indigo-600" />
                  REST API & webhook access
                </li>
                <li className="flex items-center">
                  <ArrowRight className="w-4 h-4 mr-2 text-indigo-600" />
                  Real-time analytics dashboard
                </li>
              </ul>
            </div>
          </div>

          {/* Right side - Auth form */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <Input
                      type="text"
                      placeholder="Jane"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <Input
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="jane@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pr-10"
                    required
                    minLength={mode === 'register' ? 8 : undefined}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full"
                    required
                  />
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {mode === 'register' && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 pt-0.5">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <label htmlFor="terms" className="text-sm text-gray-600">
                    I agree to the <a href="#" className="text-indigo-600 hover:underline">Terms of Service</a> and{' '}
                    <a href="#" className="text-indigo-600 hover:underline">Privacy Policy</a>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>
                  {isSubmitting || isLoading
                    ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
                    : mode === 'login'
                      ? 'Sign In to IyonicMailer'
                      : 'Start Free Trial'}
                </span>
                {!(isSubmitting || isLoading) && <ArrowRight className="w-4 h-4" />}
              </button>

              <div className="text-center pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600">
                  {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                  <button
                    type="button"
                    onClick={onSwitchMode}
                    className="ml-2 text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {mode === 'login' ? 'Create Account' : 'Sign In'}
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};
