import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, Button, Badge, Popup, ConfirmPopup, Input, Textarea, Select } from '../ui';
import type { EmailTemplate } from '../../services/api';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Sparkles,
  ShoppingCart,
  Bell,
  Heart,
  Gift,
  RefreshCw,
  Save,
  Layout,
  Code,
  Type,
  ExternalLink,
  ChevronRight,
  Settings
} from 'lucide-react';

const categoryConfig: Record<string, { icon: any; color: string; bg: string; border: string; text: string }> = {
  transactional: { icon: ShoppingCart, color: 'blue', bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700' },
  promotional: { icon: Gift, color: 'emerald', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700' },
  notification: { icon: Bell, color: 'orange', bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700' },
  welcome: { icon: Heart, color: 'purple', bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700' },
  abandoned_cart: { icon: ShoppingCart, color: 'rose', bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700' },
  custom: { icon: FileText, color: 'gray', bg: 'bg-gray-50', border: 'border-gray-100', text: 'text-gray-700' }
};

const categoryOptions = [
  { value: 'transactional', label: 'Transactional' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'notification', label: 'Notification' },
  { value: 'welcome', label: 'Welcome Series' },
  { value: 'abandoned_cart', label: 'Abandoned Cart' },
  { value: 'custom', label: 'Custom' }
];

export const EmailTemplateEditor: React.FC = () => {
  const { emailTemplates, createTemplate, updateTemplate, deleteTemplate, loadDefaultTemplates, sellers } = useData();
  const { showToast } = useToast();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false);
  const [editTab, setEditTab] = useState<'design' | 'plain'>('design');
  
  const [form, setForm] = useState<Partial<EmailTemplate>>({
    name: '',
    slug: '',
    subject: '',
    htmlContent: '',
    plainTextContent: '',
    category: 'custom',
    isDefault: false,
    isActive: true,
    variables: []
  });

  const sellerId = sellers[0]?.id;

  const resetForm = () => {
    setForm({
      name: '',
      slug: '',
      subject: '',
      htmlContent: '',
      plainTextContent: '',
      category: 'custom',
      isDefault: false,
      isActive: true,
      variables: []
    });
    setEditTab('design');
  };

  const handleOpenPopup = (template?: EmailTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setForm({
        ...template,
        variables: template.variables || []
      });
    } else {
      setSelectedTemplate(null);
      resetForm();
    }
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setSelectedTemplate(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.subject || !form.htmlContent) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const variableRegex = /\{\{(\w+)\}\}/g;
      const variables: string[] = [];
      let match;
      while ((match = variableRegex.exec(form.htmlContent || '')) !== null) {
        if (!variables.includes(match[1])) {
          variables.push(match[1]);
        }
      }

      const templateData = {
        ...form,
        slug: form.slug || form.name?.toLowerCase().replace(/\s+/g, '-'),
        sellerId,
        variables
      };

      if (selectedTemplate) {
        await updateTemplate(selectedTemplate.id, templateData);
        showToast('Template updated successfully!', 'success');
      } else {
        await createTemplate(templateData);
        showToast('Template created successfully!', 'success');
      }
      handleClosePopup();
    } catch (error) {
      console.error('Failed to save template:', error);
      showToast('Failed to save template. Please try again.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    setIsDeleting(selectedTemplate.id);
    try {
      await deleteTemplate(selectedTemplate.id);
      showToast('Template deleted successfully!', 'success');
      setIsDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Error deleting template:', error);
      showToast('Failed to delete template', 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleLoadDefaults = async () => {
    setIsLoadingDefaults(true);
    try {
      const defaults = await loadDefaultTemplates();
      showToast('Default templates loaded successfully!', 'success');
    } catch (error) {
      showToast('Failed to load default templates', 'error');
    } finally {
      setIsLoadingDefaults(false);
    }
  };

  const handlePreview = (html: string) => {
    setPreviewHtml(html);
    setIsPreviewOpen(true);
  };

  const getCategoryBadge = (category: string) => {
    const config = categoryConfig[category] || categoryConfig.custom;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${config.bg} ${config.text} ${config.border} border`}>
        <Icon className="w-3 h-3 mr-1.5" />
        {category.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Email Templates</h2>
          <p className="text-gray-500 font-medium">Design and manage reusable email templates for your brand</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleLoadDefaults} 
            variant="outline" 
            disabled={isLoadingDefaults}
            className="rounded-xl border-2 hover:bg-blue-50 hover:border-blue-200 transition-all"
          >
            {isLoadingDefaults ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2 text-blue-600" />}
            Load Defaults
          </Button>
          <Button 
            onClick={() => handleOpenPopup()} 
            className="bg-blue-600 hover:bg-blue-700 font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {emailTemplates.length === 0 ? (
        <Card className="p-16 text-center bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-[2rem]">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-8 border border-gray-100 rotate-3 group-hover:rotate-0 transition-transform">
            <Layout className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-4">No Templates Found</h3>
          <p className="text-gray-500 mb-10 max-w-md mx-auto leading-relaxed">
            Ready to engage your customers? Start by creating your first email template or load our professional presets.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={handleLoadDefaults} variant="outline" className="w-full sm:w-auto px-8 py-4 rounded-2xl border-2">
              <Sparkles className="w-5 h-5 mr-2 text-blue-600" />
              Use Professional Presets
            </Button>
            <Button onClick={() => handleOpenPopup()} className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gray-900 text-white hover:bg-gray-800">
              <Plus className="w-5 h-5 mr-2" />
              Create From Scratch
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {emailTemplates.map((template) => {
            const config = categoryConfig[template.category] || categoryConfig.custom;
            return (
              <Card key={template.id} className="group overflow-hidden hover:shadow-2xl hover:shadow-blue-100 transition-all duration-500 border-gray-100 flex flex-col h-full rounded-[2rem] p-0">
                <div className={`h-2 ${config.bg.replace('bg-', 'bg-')}`} />
                <div className="p-8 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 ${config.bg} rounded-2xl flex items-center justify-center border ${config.border} shadow-sm group-hover:scale-110 transition-transform duration-500`}>
                        <config.icon className={`w-7 h-7 ${config.text}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black text-gray-900 text-lg leading-tight truncate max-w-[140px]">{template.name}</p>
                          {template.isDefault && (
                            <div className="bg-purple-100 text-purple-700 p-0.5 rounded-full" title="Default System Template">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-mono text-gray-400">/{template.slug}</p>
                      </div>
                    </div>
                    {template.isActive ? (
                      <Badge variant="success" size="sm" className="rounded-full px-3">Active</Badge>
                    ) : (
                      <Badge variant="danger" size="sm" className="rounded-full px-3">Inactive</Badge>
                    )}
                  </div>

                  <div className="mb-6">
                    {getCategoryBadge(template.category)}
                  </div>

                  <div className="space-y-4 flex-1">
                    <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-blue-50/50 transition-colors">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Subject</p>
                      <p className="text-sm font-bold text-gray-700 line-clamp-2 leading-relaxed italic group-hover:text-blue-900 transition-colors">
                        "{template.subject}"
                      </p>
                    </div>

                    {template.variables && template.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {template.variables.slice(0, 4).map((v, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white border border-gray-100 rounded text-[10px] font-mono text-gray-500">
                            {`{{${v}}}`}
                          </span>
                        ))}
                        {template.variables.length > 4 && (
                          <span className="text-[10px] font-bold text-gray-400 ml-1">
                            +{template.variables.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-50">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <RefreshCw className="w-3 h-3" />
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handlePreview(template.htmlContent)}
                        className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Quick Preview"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleOpenPopup(template)}
                        className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                        title="Full Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      {!template.isDefault && (
                        <button 
                          onClick={() => {
                            setSelectedTemplate(template);
                            setIsDeleteConfirmOpen(true);
                          }}
                          className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          <Card
            className="border-4 border-dashed border-gray-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[360px] rounded-[2rem] group"
            onClick={() => handleOpenPopup()}
          >
            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-500">
              <Plus className="w-10 h-10 text-gray-300 group-hover:text-blue-600" />
            </div>
            <p className="text-xl font-black text-gray-400 group-hover:text-blue-900 transition-colors">New Template</p>
            <p className="text-sm font-medium text-gray-400 mt-2">Design a custom experience</p>
          </Card>
        </div>
      )}

      {/* Editor Modal */}
      <Popup 
        isOpen={isPopupOpen} 
        onClose={handleClosePopup} 
        title={selectedTemplate ? 'Customize Your Template' : 'Create Custom Template'} 
        size="full"
      >
        <div className="flex flex-col h-full bg-gray-50/30 -m-6">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Column: Config */}
                <div className="lg:col-span-4 space-y-8">
                  <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                    <h4 className="text-lg font-black text-gray-900 mb-6 flex items-center">
                      <Settings className="w-5 h-5 mr-2 text-blue-600" />
                      Configuration
                    </h4>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Display Name</label>
                        <Input
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="Welcome Series - Part 1"
                          className="font-bold py-3 rounded-xl border-2 focus:border-blue-500 transition-all"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Template Slug</label>
                        <div className="relative">
                          <Input
                            value={form.slug}
                            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                            placeholder="welcome-series-1"
                            className="font-mono text-xs pl-8 py-3 rounded-xl border-2"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono text-xs">/</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email Category</label>
                        <Select
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                          options={categoryOptions}
                          className="font-bold py-3 rounded-xl border-2"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-600 p-8 rounded-[2rem] shadow-lg shadow-blue-200 text-white relative overflow-hidden">
                    <Sparkles className="absolute -right-4 -top-4 w-24 h-24 text-white/10 rotate-12" />
                    <h4 className="text-lg font-black mb-4 flex items-center relative z-10">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Dynamic Content
                    </h4>
                    <p className="text-sm text-blue-50 font-medium mb-6 relative z-10 leading-relaxed">
                      Use double curly braces to insert dynamic data into your emails. These will be replaced with real values when sent.
                    </p>
                    <div className="grid grid-cols-2 gap-2 relative z-10">
                      {['customerName', 'storeName', 'orderId', 'total', 'trackingUrl', 'unsubscribeLink'].map(v => (
                        <div 
                          key={v}
                          onClick={() => {
                            const tag = `{{${v}}}`;
                            if (editTab === 'design') {
                              setForm({ ...form, htmlContent: (form.htmlContent || '') + tag });
                            } else {
                              setForm({ ...form, plainTextContent: (form.plainTextContent || '') + tag });
                            }
                          }}
                          className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-[10px] font-mono cursor-pointer transition-colors"
                        >
                          {`{{${v}}}`}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Editor */}
                <div className="lg:col-span-8">
                  <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[700px]">
                    <div className="px-8 py-6 border-b border-gray-50">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Email Subject Line</label>
                        <Input
                          value={form.subject}
                          onChange={(e) => setForm({ ...form, subject: e.target.value })}
                          placeholder="Welcome to {{storeName}}!"
                          className="text-xl font-black py-4 border-none focus:ring-0 placeholder:text-gray-300"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex bg-gray-50/50 p-2 gap-2 border-b border-gray-50">
                      <button
                        type="button"
                        onClick={() => setEditTab('design')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${
                          editTab === 'design' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <Code className="w-4 h-4" />
                        HTML Designer
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditTab('plain')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${
                          editTab === 'plain' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <Type className="w-4 h-4" />
                        Plain Text
                      </button>
                    </div>

                    <div className="flex-1 flex flex-col min-h-[500px]">
                      {editTab === 'design' ? (
                        <Textarea
                          value={form.htmlContent}
                          onChange={(e) => setForm({ ...form, htmlContent: e.target.value })}
                          placeholder="<!-- Write your HTML here -->"
                          className="flex-1 font-mono text-sm p-8 border-none focus:ring-0 bg-white leading-relaxed resize-none"
                          required
                        />
                      ) : (
                        <Textarea
                          value={form.plainTextContent}
                          onChange={(e) => setForm({ ...form, plainTextContent: e.target.value })}
                          placeholder="Your plain text content..."
                          className="flex-1 font-sans font-medium text-base p-8 border-none focus:ring-0 bg-white leading-relaxed resize-none"
                        />
                      )}
                    </div>

                    <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          {editTab === 'design' ? 'Rich Content Active' : 'Fallback Version Active'}
                        </span>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => handlePreview(form.htmlContent || '')} 
                        disabled={!form.htmlContent}
                        className="rounded-xl font-bold"
                      >
                        <Eye className="w-5 h-5 mr-2" />
                        Instant Preview
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-12 py-8 bg-white border-t border-gray-100 flex items-center justify-between sticky bottom-0 z-20">
              <div className="flex items-center gap-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={handleClosePopup} 
                  disabled={isCreating}
                  className="rounded-xl px-8"
                >
                  Discard Changes
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <Button 
                  type="submit" 
                  disabled={isCreating || !form.name || !form.subject || !form.htmlContent}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black px-12 py-4 rounded-2xl shadow-xl shadow-blue-100 disabled:opacity-50 transition-all flex items-center"
                >
                  {isCreating ? (
                    <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Save className="w-5 h-5 mr-2" />
                  )}
                  {isCreating ? 'Finalizing...' : (selectedTemplate ? 'Save Changes' : 'Publish Template')}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Popup>

      {/* Preview Modal */}
      <Popup 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)} 
        title="Live Preview" 
        size="full"
      >
        <div className="bg-gray-100 p-4 md:p-12 min-h-full flex items-center justify-center">
          <div className="bg-white shadow-2xl rounded-[2.5rem] overflow-hidden w-full max-w-2xl border border-gray-100">
            <div className="bg-gray-50 p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="px-4 py-1.5 bg-white rounded-lg border border-gray-200 text-xs font-mono text-gray-500 flex items-center gap-2">
                  <ShoppingCart className="w-3 h-3" />
                  customer-view.html
                </div>
              </div>
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-12 overflow-y-auto max-h-[70vh]">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
            <div className="bg-gray-50 p-6 border-t border-gray-100 text-center">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                This is a mock representation of how your email will look in most clients
              </p>
            </div>
          </div>
        </div>
      </Popup>

      <ConfirmPopup
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Template"
        message={`This action will permanently delete the template "${selectedTemplate?.name}". Are you absolutely sure?`}
        confirmText="Confirm Deletion"
        type="danger"
        isLoading={!!isDeleting}
      />
    </div>
  );
};
