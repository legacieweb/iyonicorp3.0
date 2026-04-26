import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, Button, Badge, Input, Select } from '../ui';
import type { EmailSettings } from '../../services/api';
import {
  Mail,
  Settings,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  AtSign,
  User,
  Shield,
  Server,
  Key,
  TestTube
} from 'lucide-react';

const providerConfig = {
  smtp: {
    name: 'SMTP Server',
    description: 'Use your own SMTP server or email provider',
    fields: ['host', 'port', 'username', 'password'],
    port: 587
  },
  sendgrid: {
    name: 'SendGrid',
    description: 'Twilio SendGrid API integration',
    fields: ['apiKey'],
    port: undefined
  },
  mailgun: {
    name: 'Mailgun',
    description: 'Mailgun email service API',
    fields: ['apiKey'],
    port: undefined
  },
  'aws-ses': {
    name: 'Amazon SES',
    description: 'Amazon Simple Email Service',
    fields: ['apiKey', 'secretKey', 'region'],
    port: undefined
  },
  sendinblue: {
    name: 'Brevo (Sendinblue)',
    description: 'Brevo email marketing platform',
    fields: ['apiKey'],
    port: undefined
  },
  postmark: {
    name: 'Postmark',
    description: 'Fast and reliable email delivery service',
    fields: ['apiKey'],
    port: undefined
  }
};

export const EmailSettingsManager: React.FC = () => {
  const { emailSettings, saveEmailSettings, verifyEmailSettings, sendTestEmail, sellers, user } = useData();
  const { showToast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [form, setForm] = useState({
    provider: 'smtp' as EmailSettings['provider'],
    fromEmail: '',
    fromName: '',
    replyTo: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    apiKey: ''
  });

  useEffect(() => {
    if (emailSettings) {
      setForm({
        provider: emailSettings.provider,
        fromEmail: emailSettings.fromEmail || '',
        fromName: emailSettings.fromName || '',
        replyTo: emailSettings.replyTo || '',
        smtpHost: emailSettings.smtpHost || '',
        smtpPort: emailSettings.smtpPort || 587,
        smtpUser: emailSettings.smtpUser || '',
        smtpPassword: emailSettings.smtpPassword || '',
        apiKey: emailSettings.apiKey || ''
      });
    } else {
      setForm(prev => ({ ...prev, fromEmail: sellers[0]?.contactInfo?.email || '' }));
    }
  }, [emailSettings, sellers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const settingsData = {
        sellerId: sellers[0]?.id,
        ...form,
        isActive: true
      };
      await saveEmailSettings(settingsData);
      showToast('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save email settings:', error);
      showToast('Failed to save settings. Please try again.', 'error');
    }
  };

  const handleVerify = async () => {
    // Find the settings ID
    if (!emailSettings?.id) {
      showToast('Please save settings first before verifying.', 'warning');
      return;
    }
    try {
      const result = await verifyEmailSettings(emailSettings.id);
      showToast(result.message, result.verified ? 'success' : 'error');
    } catch (error) {
      showToast('Verification failed. Please check your configuration.', 'error');
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await sendTestEmail(
        form.fromEmail || (user as any)?.contactInfo?.email || '',
        'Test Email - ShopRight',
        `<h1>Test Email Successful!</h1><p>Your email configuration is working correctly. You can now send transactional and promotional emails.</p>`
      );
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to send test email.' });
    } finally {
      setIsTesting(false);
    }
  };

  const currentProvider = providerConfig[form.provider];
  const isConfigured = emailSettings?.isVerified || false;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Email Marketing</h2>
          <p className="text-gray-500 font-medium">Configure email settings for transactional and promotional emails</p>
        </div>
        {isConfigured && (
          <Badge variant="success" className="font-bold py-2 px-4">
            <CheckCircle className="w-4 h-4 mr-2" />
            Verified & Active
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Card */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Email Provider Configuration"
            subtitle="Set up your email service to send order confirmations, promotions, and notifications."
            action={
              emailSettings?.id && (
                <Button size="sm" variant="outline" onClick={handleVerify} disabled={isTesting}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Verify Settings
                </Button>
              )
            }
          />

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Email Provider</label>
              <Select
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value as any })}
                options={Object.entries(providerConfig).map(([key, config]) => ({
                  value: key,
                  label: `${config.name} - ${config.description}`
                }))}
                className="font-bold"
              />
            </div>

            {/* From Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">From Name</label>
                <Input
                  value={form.fromName}
                  onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                  placeholder={sellers[0]?.storeName || 'Your Store'}
                  prefix={<User className="w-5 h-5 text-gray-400" />}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">From Email</label>
                <Input
                  type="email"
                  value={form.fromEmail}
                  onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
                  placeholder="noreply@yourstore.com"
                  prefix={<AtSign className="w-5 h-5 text-gray-400" />}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Reply-To Email (optional)</label>
              <Input
                type="email"
                value={form.replyTo}
                onChange={(e) => setForm({ ...form, replyTo: e.target.value })}
                placeholder="support@yourstore.com"
                prefix={<Mail className="w-5 h-5 text-gray-400" />}
              />
            </div>

            {/* SMTP Settings */}
            {form.provider === 'smtp' && (
              <div className="bg-gray-50 rounded-xl p-6 space-y-4 border border-gray-200">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  SMTP Server Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">SMTP Host</label>
                    <Input
                      value={form.smtpHost}
                      onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">SMTP Port</label>
                    <Input
                      type="number"
                      value={form.smtpPort}
                      onChange={(e) => setForm({ ...form, smtpPort: parseInt(e.target.value) || 587 })}
                      placeholder="587"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Username</label>
                    <Input
                      value={form.smtpUser}
                      onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
                      placeholder="your-email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Password / App Password</label>
                    <Input
                      type="password"
                      value={form.smtpPassword}
                      onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })}
                      placeholder="••••••••••••••••"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* API Key Settings */}
            {form.provider !== 'smtp' && (
              <div className="bg-gray-50 rounded-xl p-6 space-y-4 border border-gray-200">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  API Credentials
                </h4>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">API Key</label>
                  <Input
                    type="password"
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    placeholder="Enter your API key"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get your API key from your {providerConfig[form.provider].name} dashboard.
                  </p>
                </div>
              </div>
            )}

            {/* Test Result */}
            {testResult && (
              <div className={`p-4 rounded-xl border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <p className={`text-sm font-bold ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {testResult.message}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="ghost" onClick={() => {
                if (emailSettings) {
                  setForm({
                    provider: emailSettings.provider,
                    fromEmail: emailSettings.fromEmail || '',
                    fromName: emailSettings.fromName || '',
                    replyTo: emailSettings.replyTo || '',
                    smtpHost: emailSettings.smtpHost || '',
                    smtpPort: emailSettings.smtpPort || 587,
                    smtpUser: emailSettings.smtpUser || '',
                    smtpPassword: emailSettings.smtpPassword || '',
                    apiKey: emailSettings.apiKey || ''
                  });
                }
              }}>Reset</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isTesting}>
                <Settings className="w-5 h-5 mr-2" />
                Save Settings
              </Button>
            </div>
          </form>
        </Card>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-none">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold">Email Statistics</h3>
                  <p className="text-blue-100 text-sm">Your email activity</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-blue-100 text-sm">Emails Sent</span>
                  <span className="font-bold">{emailSettings?.sentCount || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-100 text-sm">Status</span>
                  <Badge className={isConfigured ? 'bg-white/20 text-white' : 'bg-red-400/30 text-white'}>
                    {isConfigured ? 'Active' : 'Not Configured'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-100 text-sm">Last Used</span>
                  <span className="font-bold text-sm">
                    {emailSettings?.lastUsedAt
                      ? new Date(emailSettings.lastUsedAt).toLocaleDateString()
                      : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleTest}
                  disabled={isTesting || !emailSettings?.id}
                >
                  {isTesting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  Send Test Email
                </Button>
                <p className="text-xs text-gray-500 italic">
                  Test your email configuration by sending a sample email to your configured from address.
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-blue-100 bg-blue-50/50">
            <div className="p-6">
              <h3 className="font-bold text-gray-900 mb-3">Supported Providers</h3>
              <div className="space-y-2">
                {Object.entries(providerConfig).map(([key, config]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-medium">{config.name}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4">
                All credentials are securely encrypted and stored. We never share your API keys.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
