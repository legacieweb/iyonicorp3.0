import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit, Trash2, Eye, AlertCircle, RefreshCw, X, FileText } from 'lucide-react';
import { smsAPI } from './smsApi';
import SmsLayout from './SmsLayout';

export interface ColumnDef {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  hidden?: boolean;
}

interface SmsSectionPageProps {
  role: 'admin' | 'teacher' | 'student' | 'parent';
  title: string;
  description?: string;
  apiSection: keyof typeof smsAPI;
  columns: ColumnDef[];
  pageSize?: number;
  searchKeys?: string[];
  createFields?: { key: string; label: string; type: 'text' | 'number' | 'select' | 'textarea'; options?: string[] }[];
  onCreateCustom?: (formData: Record<string, any>) => Promise<void>;
}

const SmsSectionPage: React.FC<SmsSectionPageProps> = ({
  role,
  title,
  description,
  apiSection,
  columns,
  pageSize = 15,
  searchKeys = [],
  createFields = [],
  onCreateCustom,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  const apiSectionObj = (smsAPI as any)[apiSection];

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiSectionObj.getAll();
        if (!cancelled) {
          setData(result);
          setFiltered(result);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [apiSection, refreshKey]);

  useEffect(() => {
    let result = [...data];
    if (searchTerm && searchKeys.length > 0) {
      result = result.filter((row) =>
        searchKeys.some((key) => {
          const val = row[key];
          return val != null && String(val).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }
    if (sortKey) {
      result.sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av;
        }
        const as = String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? as : -as;
      });
    }
    setFiltered(result);
    setPage(1);
  }, [searchTerm, data, searchKeys, sortKey, sortDir]);

  const visibleColumns = columns.filter((c) => !c.hidden);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paged = filtered.slice(startIndex, endIndex);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await apiSectionObj.delete(id);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    }
  };

  const handleView = (row: any) => {
    if (apiSectionObj.getById) {
      apiSectionObj.getById(row.id).then((detail: any) => {
        const detailStr = JSON.stringify(detail, null, 2);
        const modal = window.open('', '_blank', 'width=600,height=600,scrollbars=yes');
        if (modal) {
          modal.document.write(`
            <html><head><title>Item Details</title>
            <style>body{font-family:sans-serif;padding:20px;background:#f8fafc;}</style></head>
            <body><pre style="white-space:pre-wrap;font-size:14px;">${detailStr}</pre></body></html>
          `);
          modal.document.close();
        }
      }).catch(() => {});
    }
  };

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      if (onCreateCustom) {
        await onCreateCustom(form);
      } else if (apiSectionObj.create) {
        await apiSectionObj.create(form);
      }
      setShowCreate(false);
      setForm({});
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setError(err.message || 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const renderValue = (col: ColumnDef, row: any) => {
    const value = row[col.key];
    if (col.render) return col.render(value, row);
    if (value === null || value === undefined) return <span className="sms-text-muted">—</span>;
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') {
      return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          value ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
        }`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }
    return String(value);
  };

  const showSearch = searchKeys.length > 0;
  const showPagination = totalPages > 1;

  const getLabelColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('complete') || s.includes('paid') || s.includes('published') || s.includes('active') || s === 'present')
      return 'bg-emerald-100 text-emerald-800';
    if (s.includes('pending') || s.includes('draft') || s.includes('scheduled'))
      return 'bg-amber-100 text-amber-800';
    if (s.includes('late') || s.includes('overdue'))
      return 'bg-orange-100 text-orange-800';
    if (s.includes('cancel') || s.includes('fail') || s.includes('absent') || s === 'inactive' || s === 'terminated' || s === 'transferred' || s === 'suspended')
      return 'bg-red-100 text-red-800';
    return 'bg-slate-100 text-slate-600';
  };

  const statusColumn = visibleColumns.find((c) => c.key === 'status' || c.key === 'isActive');

  return (
    <SmsLayout role={role}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold sms-text">{title}</h1>
            {description && <p className="text-sm sms-text-muted">{description}</p>}
          </div>
          {createFields.length > 0 && (
            <button
              onClick={() => setShowCreate(true)}
              className="sms-btn gap-2"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add New</span>
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="inline mr-2" size={16} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="sms-card p-4">
            <p className="text-xs font-medium text-[var(--sms-ink-muted)] uppercase">Total Records</p>
            <p className="mt-1 text-2xl font-bold sms-text">{filtered.length}</p>
          </div>
          <div className="sms-card p-4">
            <p className="text-xs font-medium text-[var(--sms-ink-muted)] uppercase">Current Page</p>
            <p className="mt-1 text-2xl font-bold sms-text">{filtered.length > 0 ? `${startIndex + 1}-${Math.min(endIndex, filtered.length)}` : '0'}</p>
          </div>
          <div className="sms-card p-4">
            <p className="text-xs font-medium text-[var(--sms-ink-muted)] uppercase">Page</p>
            <p className="mt-1 text-2xl font-bold sms-text">{totalPages > 0 ? `${page} of ${totalPages}` : '—'}</p>
          </div>
          <div className="sms-card p-4">
            <p className="text-xs font-medium text-[var(--sms-ink-muted)] uppercase">Search</p>
            <p className="mt-1 text-2xl font-bold sms-text">{searchTerm ? searchTerm : '—'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showSearch && (
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sms-input pl-10"
              />
            </div>
          )}
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="sms-btn-ghost"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--sms-line)] bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80">
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left font-medium text-[var(--sms-ink-muted)] uppercase tracking-wider ${
                      col.sortable ? 'cursor-pointer select-none hover:bg-slate-100/80' : ''
                    } ${col.className || ''}`}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortKey === col.key && (
                        <span className="text-[var(--sms-primary)]">
                          {sortDir === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium text-[var(--sms-ink-muted)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="p-8 text-center sms-text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--sms-primary)] border-t-transparent"></div>
                      Loading…
                    </div>
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="p-8 text-center sms-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={32} className="text-gray-300" />
                      <p className="mt-1 text-sm">No records found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--sms-line)] transition-colors hover:bg-slate-50/50">
                    {visibleColumns.map((col) => (
                      <td key={col.key} className="px-4 py-3 align-top">
                        {renderValue(col, row)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleView(row)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[var(--sms-primary)]"
                          title="View"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleView(row)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[var(--sms-primary)]"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        {apiSectionObj.delete && (
                          <button
                            onClick={() => handleDelete(row.id)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-100 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showPagination && (
          <div className="flex items-center justify-between">
            <p className="text-sm sms-text-muted">
              Showing {startIndex + 1}–{Math.min(endIndex, filtered.length)} of {filtered.length} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="rounded-lg border border-[var(--sms-line)] px-3 py-1 text-sm disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm sms-text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="rounded-lg border border-[var(--sms-line)] px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {showCreate && createFields.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold sms-text">Add New {title.slice(0, -1)}</h3>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {createFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium sms-text-muted">{field.label}</label>
                    {field.type === 'select' && field.options ? (
                      <select
                        value={form[field.key] || ''}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        className="sms-input mt-1"
                      >
                        <option value="">Select…</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={form[field.key] || ''}
                        onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                        className="sms-input mt-1"
                        rows={3}
                      />
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={form[field.key] || ''}
                        onChange={(e) => setForm({ ...form, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                        className="sms-input mt-1"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="sms-btn-ghost"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="sms-btn"
                >
                  {submitting ? 'Creating…' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SmsLayout>
  );
};

export default SmsSectionPage;