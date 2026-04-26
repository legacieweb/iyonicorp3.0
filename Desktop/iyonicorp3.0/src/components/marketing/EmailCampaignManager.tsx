import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, Button, Badge, Popup, ConfirmPopup, Input, Textarea, Select, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui';
import type { EmailCampaign, EmailSettings } from '../../services/api';
import {
  Mail,
  Plus,
  Send,
  Calendar,
  Eye,
  BarChart3,
  Trash2,
  Edit,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  FileText,
  RefreshCw,
  Save
} from 'lucide-react';

const categoryOptions = [
  { value: 'transactional', label: 'Transactional' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'notification', label: 'Notification' },
  { value: 'welcome', label: 'Welcome Series' },
  { value: 'abandoned_cart', label: 'Abandoned Cart' },
  { value: 'custom', label: 'Custom' }
];

const statusConfig: Record<string, { variant: any; icon: any; label: string }> = {
  draft: { variant: 'default', icon: FileText, label: 'Draft' },
  scheduled: { variant: 'warning', icon: Clock, label: 'Scheduled' },
  sending: { variant: 'info', icon: Send, label: 'Sending' },
  sent: { variant: 'success', icon: CheckCircle, label: 'Sent' },
  cancelled: { variant: 'danger', icon: XCircle, label: 'Cancelled' },
  failed: { variant: 'danger', icon: AlertCircle, label: 'Failed' }
};

export const EmailCampaignManager: React.FC = () => {
  const { emailCampaigns, customers, emailSettings, sellers, createCampaign, updateCampaign, deleteCampaign, sendCampaign, scheduleCampaign, getCampaignStats, refreshData } = useData();
  const { showToast } = useToast();
  
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isStatsPopupOpen, setIsStatsPopupOpen] = useState(false);
  const [isSchedulePopupOpen, setIsSchedulePopupOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  
  const [selectedCampaign, setSelectedCampaign] = useState<typeof emailCampaigns[0] | null>(null);
  const [campaignStats, setCampaignStats] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [scheduleDate, setScheduleDate] = useState('');

  const [form, setForm] = useState<Partial<EmailCampaign>>({
    name: '',
    subject: '',
    htmlContent: '',
    plainTextContent: '',
    templateId: undefined,
    recipientType: 'all',
    segmentFilter: undefined,
    customRecipients: [],
    scheduledAt: undefined,
    status: 'draft',
    totalRecipients: 0,
    deliveredCount: 0,
    openedCount: 0,
    clickedCount: 0,
    bouncedCount: 0,
    complaintCount: 0,
    unsubscribeCount: 0
  });

  const customerCount = customers.length;
  const sellerId = sellers[0]?.id;

  const resetForm = () => {
    setForm({
      name: '',
      subject: '',
      htmlContent: '',
      plainTextContent: '',
      templateId: undefined,
      recipientType: 'all',
      segmentFilter: undefined,
      customRecipients: [],
      scheduledAt: undefined,
      status: 'draft',
      totalRecipients: 0,
      deliveredCount: 0,
      openedCount: 0,
      clickedCount: 0,
      bouncedCount: 0,
      complaintCount: 0,
      unsubscribeCount: 0
    });
    setCurrentStep(1);
    setSelectedCustomerIds([]);
  };

  const handleOpenPopup = (campaign?: typeof emailCampaigns[0]) => {
    if (campaign) {
      setSelectedCampaign(campaign);
      setForm({
        ...campaign,
        scheduledAt: campaign.scheduledAt?.split('T')[0],
        templateId: campaign.templateId
      });
      
      // If custom recipients, try to map back to selected customer IDs
      if (campaign.recipientType === 'custom' && Array.isArray(campaign.customRecipients)) {
        const ids = customers
          .filter(c => campaign.customRecipients?.includes(c.email))
          .map(c => c.id);
        setSelectedCustomerIds(ids);
      }
    } else {
      setSelectedCampaign(null);
      resetForm();
    }
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setSelectedCampaign(null);
    resetForm();
  };

  const toggleCustomerSelection = (id: string) => {
    setSelectedCustomerIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllCustomers = () => {
    setSelectedCustomerIds(customers.map(c => c.id));
  };

  const clearCustomerSelection = () => {
    setSelectedCustomerIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.subject || !form.htmlContent) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    setIsCreating(true);
    try {
      // Map selected customer IDs back to emails if custom recipient type
      let customRecipients = form.customRecipients || [];
      if (form.recipientType === 'custom' && selectedCustomerIds.length > 0) {
        customRecipients = customers
          .filter(c => selectedCustomerIds.includes(c.id))
          .map(c => c.email);
      }

      const campaignData = {
        ...form,
        sellerId,
        customRecipients,
        scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined
      };

      if (selectedCampaign) {
        await updateCampaign(selectedCampaign.id, campaignData);
        showToast('Campaign updated successfully!', 'success');
      } else {
        await createCampaign(campaignData);
        showToast('Campaign created successfully!', 'success');
      }
      handleClosePopup();
    } catch (error) {
      console.error('Failed to save campaign:', error);
      showToast('Failed to save campaign. Please try again.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCampaign) return;
    setIsDeleting(selectedCampaign.id);
    try {
      await deleteCampaign(selectedCampaign.id);
      showToast('Campaign deleted successfully', 'success');
      setIsDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Error deleting campaign:', error);
      showToast('Failed to delete campaign', 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSend = async () => {
    if (!selectedCampaign) return;
    setIsSending(selectedCampaign.id);
    try {
      const result = await sendCampaign(selectedCampaign.id);
      if (result.queued) {
        showToast(result.message || 'Campaign sent successfully!', 'success');
        setIsSendConfirmOpen(false);
        // Refresh all data including dashboard stats immediately
        await refreshData();
      } else {
        showToast('Failed to send campaign: ' + result.message, 'error');
      }
    } catch (error) {
      showToast('Error sending campaign', 'error');
    } finally {
      setIsSending(null);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign || !scheduleDate) return;
    try {
      await scheduleCampaign(selectedCampaign.id, new Date(scheduleDate).toISOString());
      showToast('Campaign scheduled successfully!', 'success');
      setIsSchedulePopupOpen(false);
    } catch (error) {
      showToast('Failed to schedule campaign', 'error');
    }
  };

  const handleViewStats = async (campaign: typeof emailCampaigns[0]) => {
    setSelectedCampaign(campaign);
    try {
      const stats = await getCampaignStats(campaign.id);
      setCampaignStats(stats);
      setIsStatsPopupOpen(true);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      showToast('Failed to load campaign statistics', 'error');
    }
  };

  const getRecipientLabel = (type: string): string => {
    switch (type) {
      case 'all':
        return `All ${customerCount} customers`;
      case 'segment':
        return 'Filtered segment';
      case 'custom':
        return `${form.customRecipients?.length || 0} custom emails`;
      case 'manual':
        return 'Manual selection';
    }
  };

  if (!emailSettings) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Email Campaigns</h2>
            <p className="text-gray-500 font-medium">Create and send promotional emails to your customers</p>
          </div>
        </div>
        <Card className="p-12 text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-yellow-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Email Settings Required</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Please configure your email provider settings before creating campaigns.
            Go to the Email Settings section to set up SMTP or API credentials.
          </p>
          <Button onClick={() => window.location.href = '#/dashboard?tab=marketing'} variant="outline">
            Go to Email Settings
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Email Campaigns</h2>
          <p className="text-gray-500 font-medium">Create and send promotional emails to your customers</p>
        </div>
        <Button onClick={() => handleOpenPopup()} className="bg-blue-600 hover:bg-blue-700 font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-200 transition-all">
          <Plus className="w-5 h-5 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100 text-sm font-medium">Total Campaigns</span>
            <Mail className="w-5 h-5 text-white/70" />
          </div>
          <p className="text-3xl font-black">{emailCampaigns.length}</p>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-emerald-100 text-sm font-medium">Sent</span>
            <Send className="w-5 h-5 text-white/70" />
          </div>
          <p className="text-3xl font-black">{emailCampaigns.filter(c => c.status === 'sent').length}</p>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white border-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-100 text-sm font-medium">Scheduled</span>
            <Calendar className="w-5 h-5 text-white/70" />
          </div>
          <p className="text-3xl font-black">{emailCampaigns.filter(c => c.status === 'scheduled').length}</p>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orange-100 text-sm font-medium">Drafts</span>
            <FileText className="w-5 h-5 text-white/70" />
          </div>
          <p className="text-3xl font-black">{emailCampaigns.filter(c => c.status === 'draft').length}</p>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {emailCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Mail className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 mb-1">No campaigns yet</h4>
                    <p className="text-gray-500 max-w-xs mx-auto">Create your first email campaign to engage with your customers.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              emailCampaigns.map((campaign) => {
                const statusInfo = statusConfig[campaign.status] || { variant: 'default', icon: AlertCircle, label: campaign.status };
                const Icon = statusInfo.icon;

                return (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{campaign.name}</p>
                          <p className="text-sm text-gray-500 truncate max-w-xs">{campaign.subject}</p>
                          {campaign.scheduledAt && (
                            <p className="text-xs text-blue-600 font-medium mt-1">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {new Date(campaign.scheduledAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{campaign.totalRecipients} recipients</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant} className="font-bold">
                        <Icon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {campaign.status === 'sent' ? (
                        <div>
                          <p className="text-sm font-medium">{new Date(campaign.sentAt || '').toLocaleDateString()}</p>
                          <p className="text-xs text-gray-500">
                            {campaign.deliveredCount} delivered, {campaign.openedCount} opened
                          </p>
                        </div>
                      ) : campaign.status === 'scheduled' ? (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {campaign.status === 'sent' && (
                          <Button variant="ghost" size="sm" onClick={() => handleViewStats(campaign)} title="View Stats">
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                        )}
                        {campaign.status === 'draft' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setSelectedCampaign(campaign);
                              setIsSendConfirmOpen(true);
                            }} title="Send Now" disabled={isSending === campaign.id}>
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => {
                              setSelectedCampaign(campaign);
                              setScheduleDate(new Date().toISOString().slice(0, 16));
                              setIsSchedulePopupOpen(true);
                            }} title="Schedule">
                              <Calendar className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleOpenPopup(campaign)} title="Edit">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedCampaign(campaign);
                          setIsDeleteConfirmOpen(true);
                        }} title="Delete" className="text-red-500 hover:bg-red-50">
                          {isDeleting === campaign.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Modal */}
      <Popup isOpen={isPopupOpen} onClose={handleClosePopup} title={selectedCampaign ? 'Edit Campaign' : 'Create Campaign'} size="full">
        <div className="mb-8 mt-2">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -z-10"></div>
            {[
              { step: 1, label: 'Basics', icon: FileText },
              { step: 2, label: 'Recipients', icon: Users },
              { step: 3, label: 'Content', icon: Mail }
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-all ${
                  currentStep >= item.step ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-2 border-gray-100 text-gray-400'
                }`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider ${currentStep >= item.step ? 'text-blue-600' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 min-h-[400px]">
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Campaign Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Summer Sale 2024"
                  className="text-lg font-bold py-6 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                  required
                />
                <p className="text-xs text-gray-400 mt-2">Only you can see this name. Used for internal tracking.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Email Subject Line</label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g., 🔥 50% OFF Everything - Limited Time!"
                  className="text-lg font-bold py-6 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                  required
                />
                <p className="text-xs text-gray-400 mt-2">This is what your customers will see in their inbox.</p>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-bold mb-1">Pro Tip: Use emojis!</p>
                  <p>Subject lines with emojis often have higher open rates. Keep it catchy but relevant.</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Who should receive this email?</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: 'all', title: 'All Customers', desc: `Send to all ${customerCount} subscribers`, icon: Users },
                    { id: 'custom', title: 'Selected List', desc: 'Pick specific customers manually', icon: CheckCircle },
                    { id: 'manual', title: 'Manual Entry', desc: 'Type or paste email addresses', icon: Edit }
                  ].map((type) => (
                    <div 
                      key={type.id}
                      onClick={() => setForm({ ...form, recipientType: type.id as any })}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        form.recipientType === type.id 
                          ? 'border-blue-600 bg-blue-50' 
                          : 'border-gray-100 hover:border-gray-200 bg-white'
                      }`}
                    >
                      <type.icon className={`w-6 h-6 mb-2 ${form.recipientType === type.id ? 'text-blue-600' : 'text-gray-400'}`} />
                      <h4 className={`font-bold ${form.recipientType === type.id ? 'text-blue-900' : 'text-gray-900'}`}>{type.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{type.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {form.recipientType === 'custom' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-gray-900">Select Customers ({selectedCustomerIds.length})</h5>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={selectAllCustomers} className="text-xs font-bold text-blue-600">Select All</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={clearCustomerSelection} className="text-xs font-bold text-gray-500">Clear All</Button>
                    </div>
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                    {customers.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">No customers found</div>
                    ) : (
                      customers.map((customer) => (
                        <div 
                          key={customer.id} 
                          onClick={() => toggleCustomerSelection(customer.id)}
                          className="p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                              {customer.name?.charAt(0) || 'C'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{customer.name}</p>
                              <p className="text-xs text-gray-500">{customer.email}</p>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            selectedCustomerIds.includes(customer.id) 
                              ? 'bg-blue-600 border-blue-600 text-white' 
                              : 'border-gray-200'
                          }`}>
                            {selectedCustomerIds.includes(customer.id) && <CheckCircle className="w-3 h-3" />}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {form.recipientType === 'manual' && (
                <div className="animate-in fade-in duration-300">
                  <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Email Addresses (one per line)</label>
                  <Textarea
                    value={form.customRecipients?.join('\n') || ''}
                    onChange={(e) => setForm({ ...form, customRecipients: e.target.value.split('\n').filter(Boolean), recipientType: 'custom' })}
                    placeholder="e.g.\ncustomer1@example.com\ncustomer2@example.com"
                    className="min-h-[150px] border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl font-mono text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Email Content (HTML)</label>
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
                  <div className="bg-gray-50 p-3 border-b border-gray-200 flex gap-2">
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => setForm({...form, htmlContent: form.htmlContent + '<h1>Title</h1>'})}>H1</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => setForm({...form, htmlContent: form.htmlContent + '<b>Bold Text</b>'})}>B</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => setForm({...form, htmlContent: form.htmlContent + '<p>Paragraph</p>'})}>P</Button>
                  </div>
                  <Textarea
                    value={form.htmlContent}
                    onChange={(e) => setForm({ ...form, htmlContent: e.target.value })}
                    placeholder="<h1>Hello {{customerName}},</h1><p>Check out our new products!</p>"
                    className="min-h-[300px] border-none focus:ring-0 font-mono text-sm rounded-none"
                    required
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs text-gray-400 font-bold uppercase py-1">Placeholders:</span>
                  {['customerName', 'storeName', 'unsubscribeLink'].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm({...form, htmlContent: form.htmlContent + `{{${v}}}`})}
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-[10px] font-bold text-gray-600 transition-colors"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Scheduling</label>
                <div className="flex flex-col md:flex-row gap-4">
                  <div 
                    onClick={() => setForm({ ...form, scheduledAt: undefined })}
                    className={`flex-1 p-4 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                      !form.scheduledAt ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <Send className={`w-5 h-5 ${!form.scheduledAt ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`font-bold ${!form.scheduledAt ? 'text-blue-900' : 'text-gray-900'}`}>Send Immediately</span>
                  </div>
                  <div 
                    onClick={() => {
                      if (!form.scheduledAt) {
                        const date = new Date();
                        date.setHours(date.getHours() + 1);
                        setForm({ ...form, scheduledAt: date.toISOString().slice(0, 16) });
                      }
                    }}
                    className={`flex-1 p-4 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                      form.scheduledAt ? 'border-blue-600 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <Calendar className={`w-5 h-5 ${form.scheduledAt ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`font-bold ${form.scheduledAt ? 'text-blue-900' : 'text-gray-900'}`}>Schedule for later</span>
                  </div>
                </div>

                {form.scheduledAt && (
                  <div className="mt-4 animate-in zoom-in duration-200">
                    <Input
                      type="datetime-local"
                      value={form.scheduledAt}
                      onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                      className="text-lg font-bold py-6 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-8 border-t border-gray-100">
            <div>
              {currentStep > 1 && (
                <Button type="button" variant="ghost" onClick={() => setCurrentStep(prev => prev - 1)} className="font-bold text-gray-500">
                  Back
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={handleClosePopup} disabled={isCreating} className="font-bold text-gray-400">Cancel</Button>
              {currentStep < 3 ? (
                <Button 
                  type="button" 
                  onClick={() => setCurrentStep(prev => prev + 1)} 
                  className="bg-blue-600 hover:bg-blue-700 font-bold px-8 rounded-xl shadow-lg shadow-blue-200"
                  disabled={currentStep === 1 && (!form.name || !form.subject)}
                >
                  Next Step
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  className="bg-emerald-600 hover:bg-emerald-700 font-bold px-8 rounded-xl shadow-lg shadow-emerald-200" 
                  disabled={isCreating || !form.htmlContent}
                >
                  {isCreating ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                  {isCreating ? 'Saving...' : (selectedCampaign ? 'Update Campaign' : (form.scheduledAt ? 'Schedule Campaign' : 'Launch Campaign'))}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Popup>

      {/* Stats Modal */}
      <Popup isOpen={isStatsPopupOpen} onClose={() => setIsStatsPopupOpen(false)} title="Campaign Statistics" size="full">
        {campaignStats && selectedCampaign && (
          <div className="py-4 space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">{selectedCampaign.name}</h3>
              <p className="text-gray-500">{selectedCampaign.subject}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl text-center">
                <p className="text-sm text-blue-600 font-medium mb-1">Delivered</p>
                <p className="text-2xl font-black text-blue-900">{campaignStats.delivered || selectedCampaign.deliveredCount}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl text-center">
                <p className="text-sm text-emerald-600 font-medium mb-1">Opened</p>
                <p className="text-2xl font-black text-emerald-900">{campaignStats.opened || selectedCampaign.openedCount}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl text-center">
                <p className="text-sm text-purple-600 font-medium mb-1">Clicked</p>
                <p className="text-2xl font-black text-purple-900">{campaignStats.clicked || selectedCampaign.clickedCount}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl text-center">
                <p className="text-sm text-red-600 font-medium mb-1">Bounced</p>
                <p className="text-2xl font-black text-red-900">{campaignStats.bounced || selectedCampaign.bouncedCount}</p>
              </div>
            </div>

            {campaignStats.delivered > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 mb-3">Performance Metrics</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Open Rate</span>
                      <span className="font-bold">{((campaignStats.opened || selectedCampaign.openedCount) / (campaignStats.delivered || selectedCampaign.deliveredCount) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${((campaignStats.opened || selectedCampaign.openedCount) / (campaignStats.delivered || selectedCampaign.deliveredCount)) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Click Rate</span>
                      <span className="font-bold">{((campaignStats.clicked || selectedCampaign.clickedCount) / (campaignStats.delivered || selectedCampaign.deliveredCount) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${((campaignStats.clicked || selectedCampaign.clickedCount) / (campaignStats.delivered || selectedCampaign.deliveredCount)) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Popup>

      {/* Schedule Modal */}
      <Popup isOpen={isSchedulePopupOpen} onClose={() => setIsSchedulePopupOpen(false)} title="Schedule Campaign">
        <form onSubmit={handleScheduleSubmit} className="space-y-6 py-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Select Date and Time</label>
            <Input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="text-lg font-bold py-6 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setIsSchedulePopupOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 font-bold px-8 rounded-xl shadow-lg shadow-blue-200">
              Schedule Campaign
            </Button>
          </div>
        </form>
      </Popup>

      <ConfirmPopup
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Campaign"
        message={`Are you sure you want to delete the campaign "${selectedCampaign?.name}"? This action cannot be undone.`}
        confirmText="Delete Campaign"
        type="danger"
        isLoading={!!isDeleting}
      />

      <ConfirmPopup
        isOpen={isSendConfirmOpen}
        onClose={() => setIsSendConfirmOpen(false)}
        onConfirm={handleSend}
        title="Send Campaign Now"
        message={`Are you sure you want to send the campaign "${selectedCampaign?.name}" now? This will be sent to all selected recipients immediately.`}
        confirmText="Send Now"
        type="info"
        isLoading={!!isSending}
      />
    </div>
  );
};
