import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, BarChart3, Braces, Check, Database, FolderKanban, KeyRound, Layers3, LockKeyhole, Plus, ShieldCheck, Table2, Trash2, X } from 'lucide-react';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { getApiBaseUrl } from '../utils/apiUrl';
import './iyonicdb.css';

type Section = 'overview' | 'projects' | 'data' | 'keys' | 'usage' | 'billing';
type Mode = 'SQL' | 'Documents';
type Plan = { id: string; name: string; price: number; currency: string; projectLimit: number; storageBytes: number; storageGb: number; requestsPerMonth: number; tableLimit: number; apiKeyLimit: number; status?: string; currentPeriodEnd?: string };
type Project = { id: string; name: string; createdAt: string | null; tablesCount: number; recordsCount: number; mediaCount?: number; storageBytes: number; isDefault?: boolean };
type TableInfo = { name: string; rowCount: number; columns: { name: string; type: string; nullable: boolean }[] };
type ApiKey = { id: string; project_id: string; project_name: string; name: string; key_prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null };
type DocumentRecord = { id: string; document: Record<string, unknown>; created_at: string; updated_at: string };
type DocumentCollection = { collection: string; count: number };
type AccountDataset = { name: string; records: Record<string, unknown>[]; count?: number };
type ProductAccountData = { productKey: string; productName: string; accountName: string; datasets: AccountDataset[] };
type AccountWorkspace = { id: string; name: string; productKey: string; accountId: string; accountName: string; recordsCount?: number; tablesCount?: number; mediaCount?: number; storageBytes?: number; mediaStorageBytes?: number };
type PlatformSyncSummary = { platforms: number; datasetsSynced: number; recordsSynced: number; storageBytes: number; storageLimitBytes: number; syncedAt: string };
type Overview = { projects: Project[]; accountWorkspaces?: AccountWorkspace[]; databaseProjectCount?: number; subscription: Plan | null; wallet?: { balance: number; currency: string; available?: boolean; planCharges?: Record<string, number> }; usage: { requests: number; requestLimit: number; storageBytes: number; mediaStorageBytes?: number; storageBreakdownComplete?: boolean; storageLimitBytes: number; periodStart: string } };

type PaystackPopupWindow = Window & {
  PaystackPop?: { setup: (options: Record<string, unknown>) => { openIframe: () => void } };
};
let paystackInlineScript: Promise<void> | null = null;
const ensurePaystackInline = () => {
  const popupWindow = window as PaystackPopupWindow;
  if (popupWindow.PaystackPop?.setup) return Promise.resolve();
  if (!paystackInlineScript) {
    paystackInlineScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.dataset.paystackInline = 'true';
      script.onload = () => popupWindow.PaystackPop?.setup ? resolve() : reject(new Error('Paystack checkout could not be loaded.'));
      script.onerror = () => reject(new Error('Paystack checkout could not be loaded.'));
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      paystackInlineScript = null;
      throw error;
    });
  }
  return paystackInlineScript;
};

const menu: { id: Section; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'data', label: 'Data explorer', icon: Database },
  { id: 'keys', label: 'API keys', icon: KeyRound },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
  { id: 'billing', label: 'Plans & billing', icon: LockKeyhole },
];
const sectionDescription: Record<Section, string> = {
  overview: 'A clear view of your database workspace and plan.',
  projects: 'Create, select, and review your database projects.',
  data: 'Browse SQL tables and JSON document collections.',
  keys: 'Create and revoke credentials for trusted server apps.',
  usage: 'Track requests and storage against your current plan.',
  billing: 'Compare plans and manage your subscription.',
};

const errorMessage = (error: unknown) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return error instanceof Error ? error.message : 'The request could not be completed.';
};

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatPlanPrice = (plan: Pick<Plan, 'price' | 'currency'>) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: plan.currency, maximumFractionDigits: 2 }).format(plan.price);
  } catch {
    return `${plan.currency} ${plan.price.toLocaleString()}`;
  }
};
const formatCurrencyAmount = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
};

export const IyonicDBConsole: React.FC = () => {
  const { user, isInitializing } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>(() => {
    const requested = new URLSearchParams(location.search).get('section');
    return requested === 'projects' || requested === 'data' || requested === 'keys' || requested === 'usage' || requested === 'billing' ? requested : 'overview';
  });
  const [overview, setOverview] = useState<Overview | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [accountData, setAccountData] = useState<ProductAccountData[]>([]);
  const [accountDataLoading, setAccountDataLoading] = useState(false);
  const [accountDataError, setAccountDataError] = useState('');
  const [accountDataReload, setAccountDataReload] = useState(0);
  const [showAccountData, setShowAccountData] = useState(false);
  const [platformSyncReady, setPlatformSyncReady] = useState(false);
  const [platformSyncError, setPlatformSyncError] = useState('');
  const [platformSyncSummary, setPlatformSyncSummary] = useState<PlatformSyncSummary | null>(null);
  const [platformSyncRevision, setPlatformSyncRevision] = useState(0);
  const syncedProjects = useRef(new Set<string>());
  const [dataLoading, setDataLoading] = useState(false);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [documentCollections, setDocumentCollections] = useState<DocumentCollection[]>([]);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [dataMode, setDataMode] = useState<Mode>('SQL');
  const [collection, setCollection] = useState('documents');
  const [sql, setSql] = useState('');
  const [sqlParams, setSqlParams] = useState('[]');
  const [sqlResults, setSqlResults] = useState<Record<string, unknown>[] | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [columnDefinitions, setColumnDefinitions] = useState('title:text');
  const [rowJson, setRowJson] = useState('{}');
  const [documentJson, setDocumentJson] = useState('{}');
  const [keyName, setKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(true);
  const [busy, setBusy] = useState(false);

  const project = useMemo(
    () => overview?.projects.find((item) => item.id === selectedProjectId) || overview?.projects.find((item) => item.isDefault) || overview?.projects[0] || null,
    [overview, selectedProjectId]
  );
  const defaultProject = useMemo(() => overview?.projects.find((item) => item.isDefault) || null, [overview]);

  useEffect(() => {
    const requested = new URLSearchParams(location.search).get('section');
    if (requested === 'projects' || requested === 'data' || requested === 'keys' || requested === 'usage' || requested === 'billing' || requested === 'overview') {
      setSection(requested);
    }
  }, [location.search]);

  const refreshOverview = useCallback(async () => {
    const response = await api.get<Overview>('/iyonicdb/overview');
    setOverview(response.data);
    setSelectedProjectId((current) => response.data.projects.some((item) => item.id === current) ? current : response.data.projects.find((item) => item.isDefault)?.id || response.data.projects[0]?.id || '');
    setAuthenticated(true);
  }, []);

  useEffect(() => {
    if (isInitializing) return;
    if (!user) {
      setAuthenticated(false);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([api.get<Overview>('/iyonicdb/overview'), api.get<Plan[]>('/iyonicdb/plans')])
      .then(([account, availablePlans]) => {
        if (!active) return;
        setOverview(account.data);
        setSelectedProjectId(account.data.projects.find((item) => item.isDefault)?.id || account.data.projects[0]?.id || '');
        setPlans(availablePlans.data);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(errorMessage(requestError));
        const status = typeof requestError === 'object' && requestError !== null && 'response' in requestError
          ? (requestError as { response?: { status?: number } }).response?.status
          : undefined;
        setAuthenticated(status !== 401);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isInitializing, user]);

  useEffect(() => {
    if (!defaultProject) return;
    if (syncedProjects.current.has(defaultProject.id)) { setPlatformSyncReady(true); return; }
    syncedProjects.current.add(defaultProject.id);
    let active = true;
    api.post<PlatformSyncSummary>(`/iyonicdb/projects/${encodeURIComponent(defaultProject.id)}/platform-data/sync`)
      .then(async ({ data }) => {
        if (!active) return;
        setPlatformSyncSummary(data);
        setPlatformSyncError('');
        try { await refreshOverview(); }
        catch (requestError: unknown) { setError(errorMessage(requestError)); }
      })
      .catch((requestError: unknown) => { if (active) { setPlatformSyncSummary(null); setPlatformSyncError(errorMessage(requestError)); setError(errorMessage(requestError)); } })
      .finally(() => { if (active) setPlatformSyncReady(true); });
    return () => { active = false; };
  }, [defaultProject?.id, platformSyncRevision, refreshOverview]);

  useEffect(() => {
    if (section !== 'data' || !showAccountData || !platformSyncReady || !overview?.accountWorkspaces?.length) {
      setAccountData([]);
      setAccountDataError('');
      return;
    }
    let active = true;
    setAccountData([]);
    setAccountDataError('');
    setAccountDataLoading(true);
    Promise.all(overview.accountWorkspaces.map((workspace) => api.get<ProductAccountData>(`/iyonicdb/accounts/${encodeURIComponent(workspace.productKey)}/${encodeURIComponent(workspace.accountId)}/data`, { params: { email: user?.email } })))
      .then((responses) => { if (active) setAccountData(responses.map((response) => response.data)); })
      .catch((requestError: unknown) => { if (active) { setAccountDataError(errorMessage(requestError)); setError(errorMessage(requestError)); } })
      .finally(() => { if (active) setAccountDataLoading(false); });
    return () => { active = false; };
  }, [section, showAccountData, platformSyncReady, overview?.accountWorkspaces, accountDataReload, user?.email]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (!reference || params.get('billing') !== 'verify') return;
    setBusy(true);
    api.post('/iyonicdb/billing/verify', { reference })
      .then(async () => {
        setNotice('Payment verified. Your IyonicDB plan is active.');
        await refreshOverview();
      })
      .catch((requestError: unknown) => setError(errorMessage(requestError)))
      .finally(() => {
        setBusy(false);
        navigate('/iyonicdb/console?section=billing', { replace: true });
      });
  }, [location.search, navigate, refreshOverview]);

  useEffect(() => {
    if (section === 'keys') {
      api.get<ApiKey[]>('/iyonicdb/keys')
        .then(({ data }) => setKeys(data))
        .catch((requestError: unknown) => setError(errorMessage(requestError)));
    }
  }, [section]);

  useEffect(() => {
    if (section !== 'data' || showAccountData || !project) { setDataLoading(false); return; }
    let active = true;
    setTables([]);
    setRows([]);
    setDocuments([]);
    setSqlResults(null);
    setDataLoading(true);
    if (dataMode === 'SQL') {
      api.get<TableInfo[]>(`/iyonicdb/projects/${project.id}/tables`)
        .then(({ data }) => {
          if (!active) return;
          setTables(data);
          setSelectedTable((current) => data.some((table) => table.name === current) ? current : data[0]?.name || '');
          if (!data.length) setRows([]);
        })
        .catch((requestError: unknown) => { if (active) setError(errorMessage(requestError)); })
        .finally(() => { if (active) setDataLoading(false); });
    } else if (collection) {
      api.get<DocumentRecord[]>(`/iyonicdb/projects/${project.id}/documents/${encodeURIComponent(collection)}`)
        .then(({ data }) => { if (active) setDocuments(data); })
        .catch((requestError: unknown) => { if (active) setError(errorMessage(requestError)); })
        .finally(() => { if (active) setDataLoading(false); });
    } else {
      setDataLoading(false);
    }
    return () => { active = false; };
  }, [section, project, dataMode, collection, showAccountData]);

  useEffect(() => {
    if (section !== 'data' || showAccountData || dataMode !== 'Documents' || !project) {
      setDocumentCollections([]);
      return;
    }
    let active = true;
    api.get<DocumentCollection[]>(`/iyonicdb/projects/${project.id}/documents`)
      .then(({ data }) => { if (active) setDocumentCollections(data); })
      .catch((requestError: unknown) => { if (active) setError(errorMessage(requestError)); });
    return () => { active = false; };
  }, [section, showAccountData, dataMode, project]);

  useEffect(() => {
    if (section !== 'data' || showAccountData || dataMode !== 'SQL' || !project || !selectedTable) { setRowsLoading(false); return; }
    let active = true;
    setRows([]);
    setRowsLoading(true);
    api.get<Record<string, unknown>[]>(`/iyonicdb/projects/${project.id}/tables/${selectedTable}/rows`)
      .then(({ data }) => { if (active) setRows(data); })
      .catch((requestError: unknown) => { if (active) setError(errorMessage(requestError)); })
      .finally(() => { if (active) setRowsLoading(false); });
    return () => { active = false; };
  }, [section, showAccountData, dataMode, project, selectedTable]);

  const runAction = async (action: () => Promise<void>, rethrow = false) => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await action();
    } catch (requestError) {
      setError(errorMessage(requestError));
      if (rethrow) throw requestError;
    } finally {
      setBusy(false);
    }
  };

  const createProject = () => runAction(async () => {
    const { data } = await api.post<Project>('/iyonicdb/projects', { name: newProjectName });
    setNewProjectName('');
    await refreshOverview();
    setSelectedProjectId(data.id);
    setNotice('Project created and database namespace provisioned.');
  });

  const createTable = () => runAction(async () => {
    if (!project) throw new Error('Create a project before adding tables.');
    const columns = columnDefinitions.split(',').map((definition) => {
      const [name, type] = definition.trim().split(':').map((part) => part.trim());
      return { name, type, nullable: true };
    });
    await api.post(`/iyonicdb/projects/${project.id}/tables`, { name: newTableName, columns });
    setNewTableName('');
    setNotice(`SQL table "${newTableName}" created.`);
    const { data } = await api.get<TableInfo[]>(`/iyonicdb/projects/${project.id}/tables`);
    setTables(data);
    setSelectedTable(newTableName);
    await refreshOverview();
  });

  const createRow = () => runAction(async () => {
    if (!project || !selectedTable) throw new Error('Select a SQL table first.');
    await api.post(`/iyonicdb/projects/${project.id}/tables/${selectedTable}/rows`, { row: JSON.parse(rowJson) });
    setRowJson('{}');
    const { data } = await api.get<Record<string, unknown>[]>(`/iyonicdb/projects/${project.id}/tables/${selectedTable}/rows`);
    setRows(data);
    setNotice('Row saved to PostgreSQL.');
    await refreshOverview();
  });

  const executeQuery = () => {
    let resultCount = 0;
    return runAction(async () => {
    if (!project) throw new Error('Create a project before running SQL.');
    const params = JSON.parse(sqlParams);
    if (!Array.isArray(params)) throw new Error('SQL parameters must be a JSON array.');
    const { data } = await api.post<{ rows: Record<string, unknown>[]; rowCount: number }>(`/iyonicdb/projects/${project.id}/query`, { sql, params });
    setSqlResults(data.rows);
    resultCount = data.rowCount;
    setNotice(`${data.rowCount} row(s) returned from PostgreSQL.`);
    }, true).then(() => resultCount);
  };

  const refreshTablesAfterMigration = async () => {
    if (!project) return;
    try {
      const { data } = await api.get<TableInfo[]>(`/iyonicdb/projects/${encodeURIComponent(project.id)}/tables`);
      setTables(data);
      setSelectedTable((current) => data.some((table) => table.name === current) ? current : data[0]?.name || '');
      await refreshOverview();
    } catch (requestError) {
      setError('Migration applied, but the explorer refresh failed. Refresh the explorer and try again.');
      throw requestError;
    }
  };

  const createDocument = () => runAction(async () => {
    if (!project) throw new Error('Create a project before saving documents.');
    await api.post(`/iyonicdb/projects/${project.id}/documents/${encodeURIComponent(collection)}`, { document: JSON.parse(documentJson) });
    setDocumentJson('{}');
    const { data } = await api.get<DocumentRecord[]>(`/iyonicdb/projects/${project.id}/documents/${encodeURIComponent(collection)}`);
    setDocuments(data);
    const collections = await api.get<DocumentCollection[]>(`/iyonicdb/projects/${project.id}/documents`);
    setDocumentCollections(collections.data);
    setNotice('Document saved to PostgreSQL JSONB.');
    await refreshOverview();
  });

  const createApiKey = () => runAction(async () => {
    if (!project) throw new Error('Create a project before issuing an API key.');
    const { data } = await api.post<{ secret: string }>('/iyonicdb/keys', { projectId: project.id, name: keyName });
    setCreatedKey(data.secret);
    setKeyName('');
    const { data: keyList } = await api.get<ApiKey[]>('/iyonicdb/keys');
    setKeys(keyList);
    setNotice('API key created. Copy the secret now; it will not be shown again.');
  });

  const choosePlan = (planId: string) => runAction(async () => {
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) throw new Error('Paystack popup is unavailable because the public key is not configured.');
    const { data } = await api.post<{ reference: string; amount: number; currency: string; email: string }>('/iyonicdb/billing/initialize', { planId });
    await ensurePaystackInline();
    const popup = (window as PaystackPopupWindow).PaystackPop;
    if (!popup) throw new Error('Paystack checkout could not be loaded. Please try again.');
    await new Promise<void>((resolve, reject) => {
      let completed = false;
      const handler = popup.setup({
        key: publicKey,
        email: data.email,
        amount: data.amount,
        currency: data.currency,
        ref: data.reference,
        callback: (payment: { reference?: string }) => {
          if (completed) return;
          completed = true;
          api.post('/iyonicdb/billing/verify', { reference: payment.reference || data.reference })
            .then(async () => {
              setNotice('Payment verified. Your IyonicDB plan is active.');
              await refreshOverview();
              resolve();
            })
            .catch(reject);
        },
        onClose: () => {
          if (completed) return;
          completed = true;
          setNotice('Checkout closed. No payment was completed.');
          resolve();
        },
      });
      handler.openIframe();
    });
  });

  const payWithIyonicPay = (planId: string) => runAction(async () => {
    const { data } = await api.post<{ message: string; charged: { amount: number; currency: string } }>('/iyonicdb/billing/wallet/subscribe', { planId });
    await refreshOverview();
    setNotice(`${data.message} Charged ${data.charged.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${data.charged.currency}.`);
  });

  const revokeKey = (id: string) => runAction(async () => {
    await api.post(`/iyonicdb/keys/${id}/revoke`);
    setKeys((current) => current.map((key) => key.id === id ? { ...key, revoked_at: new Date().toISOString() } : key));
    setNotice('API key revoked.');
  });

  const deleteRow = (id: unknown) => runAction(async () => {
    if (!project || !selectedTable) return;
    await api.delete(`/iyonicdb/projects/${project.id}/tables/${selectedTable}/rows/${String(id)}`);
    setRows((current) => current.filter((row) => row.id !== id));
    setNotice('Row deleted.');
    await refreshOverview();
  });

  const deleteDocument = (id: string) => runAction(async () => {
    if (!project) return;
    await api.delete(`/iyonicdb/projects/${project.id}/documents/${encodeURIComponent(collection)}/${id}`);
    setDocuments((current) => current.filter((document) => document.id !== id));
    setNotice('Document deleted.');
    const collections = await api.get<DocumentCollection[]>(`/iyonicdb/projects/${project.id}/documents`);
    setDocumentCollections(collections.data);
    await refreshOverview();
  });

  const switchSection = (next: Section) => {
    setSection(next);
    setError('');
    setNotice('');
    navigate(`/iyonicdb/console?section=${next}`);
  };

  if (loading) return <div className="idb-console-loading" role="status">Connecting to IyonicDB…</div>;

  if (!authenticated) {
    const returnToConsole = `${location.pathname}${location.search}`;
    const authReturnQuery = `?redirect=${encodeURIComponent(returnToConsole)}`;
    return <div className="idb-console-auth">
      <SEO title="IyonicDB Console" description="Sign in to use your live IyonicDB projects." />
      <div className="idb-console-auth-card">
        <Link to="/iyonicdb" aria-label="IyonicDB home"><span className="idb-logo"><span className="idb-logo-mark" aria-hidden="true"><i /><i /><i /></span><span>Iyonic<span>DB</span></span></span></Link>
        <p className="idb-console-auth-kicker">YOUR DATABASE WORKSPACE</p>
        <h1>Sign in to open<br /><em>your console.</em></h1>
        <p className="idb-console-auth-copy">Your projects, data, API keys, and billing live in one private workspace. Sign in or create an account to continue.</p>
        {error && <p className="idb-api-error" role="alert">{error}</p>}
        <div className="idb-console-auth-actions"><Link className="idb-button" to={`/iyonicdb/login${authReturnQuery}`}>Sign in <ArrowRight size={16} /></Link><Link className="idb-console-signup" to={`/iyonicdb/register${authReturnQuery}`}>Create a free account</Link></div>
        <div className="idb-console-auth-foot"><span><ShieldCheck size={14} /> Account-isolated projects</span><Link to="/iyonicdb/docs">Read API docs</Link></div>
      </div>
    </div>;
  }

  return <div className="idb-console">
    <SEO title="IyonicDB Console" description="Manage live PostgreSQL projects, API keys, usage, and billing." canonical="https://iyonicorp.com/iyonicdb/console" />
    <aside className="idb-sidebar">
      <Link className="idb-sidebar-brand" to="/iyonicdb"><span className="idb-logo idb-logo-compact">Iyonic<span>DB</span></span><span className="idb-preview-tag">LIVE</span></Link>
      <label className="idb-workspace-switcher">
        <span><b>Project</b><small>{project?.name || 'No project created'}</small></span>
        <select aria-label="Select project" value={project?.id || ''} onChange={(event) => setSelectedProjectId(event.target.value)}>
          {!overview?.projects.length && <option value="">No projects</option>}
          {overview?.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <p className="idb-sidebar-label idb-section-label">WORKSPACE</p>
      <nav aria-label="Console sections" className="idb-console-nav">
        {menu.map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => switchSection(id)} className={section === id ? 'active' : ''} aria-current={section === id ? 'page' : undefined}><Icon size={17} />{label}</button>)}
      </nav>
      <div className="idb-sidebar-bottom"><div className="idb-health-note"><span><i /> PostgreSQL service</span><p>Live project data<br />Account isolated</p></div><Link to="/iyonicdb/docs"><ArrowRight size={15} /> API documentation</Link><Link to="/iyonicdb"><ArrowRight size={15} /> Product overview</Link></div>
    </aside>
    <main className="idb-console-main">
      <header className="idb-console-topbar">
        <div className="idb-console-crumb"><span>{project?.name || 'IyonicDB'}</span><b>/</b><strong>{menu.find((item) => item.id === section)?.label}</strong></div>
        <div className="idb-console-top-actions"><span className="idb-demo-pill"><i /> LIVE</span><span className="idb-avatar"><Database size={15} /></span></div>
      </header>
      <div className="idb-console-content">
        <div className="idb-console-page-heading">
          <div><p className="idb-console-overline">IONICDB <span>·</span> WORKSPACE</p><h1>{menu.find((item) => item.id === section)?.label}</h1><p>{section === 'data' && project ? `Selected project: ${project.name}` : sectionDescription[section]}</p></div>
          {section === 'overview' && <button className="idb-new-project" type="button" onClick={() => switchSection('projects')}><Plus size={16} /> New project</button>}
        </div>
        {error && <div className="idb-console-error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={14} /></button></div>}
        {notice && <div className="idb-notice" role="status"><Check size={15} />{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={14} /></button></div>}
        {!overview?.subscription && section !== 'billing' && <section className="idb-keys-warning"><ShieldCheck size={19} /><p><b>Your free workspace is being prepared.</b><span>Refresh the console in a moment to load your storage allowance.</span><button type="button" onClick={() => window.location.reload()}>Refresh console</button></p></section>}
        {section === 'overview' && overview && <OverviewPanel overview={overview} project={project} syncSummary={platformSyncSummary} syncError={platformSyncError} onSectionChange={switchSection} onViewPlatforms={() => { setShowAccountData(true); switchSection('data'); }} />}
        {section === 'projects' && overview && <ProjectsPanel overview={overview} selectedProjectId={selectedProjectId} onSelectProject={setSelectedProjectId} newProjectName={newProjectName} setNewProjectName={setNewProjectName} onCreate={createProject} onSectionChange={switchSection} busy={busy} />}
        {section === 'data' && project && <>
          <div className="idb-data-tabs" role="tablist" aria-label="Additional workspace data"><button type="button" role="tab" aria-selected={showAccountData} className={showAccountData ? 'active' : ''} onClick={() => setShowAccountData((active) => !active)}> {showAccountData ? 'Back to database' : `Account data (${overview?.accountWorkspaces?.length || 0})`}</button></div>
          {showAccountData ? <ProductAccountDataPanel data={accountData} syncSummary={platformSyncSummary} loading={!platformSyncReady || accountDataLoading} error={platformSyncError || accountDataError} onRetry={() => { setPlatformSyncReady(false); setPlatformSyncError(''); setAccountDataReload((revision) => revision + 1); if (defaultProject) syncedProjects.current.delete(defaultProject.id); setPlatformSyncRevision((revision) => revision + 1); }} onOpenStoredData={() => { setShowAccountData(false); setDataMode('Documents'); setCollection('platform_data'); }} /> : overview?.subscription && <DataPanel
          mode={dataMode} setMode={setDataMode} tables={tables} tableLimit={overview.subscription.tableLimit} selectedTable={selectedTable} setSelectedTable={setSelectedTable}
          projectId={project.id} projectName={project.name} storageBytes={overview.usage.storageBytes} storageLimitBytes={overview.usage.storageLimitBytes} documentCollections={documentCollections}
          rows={rows} documents={documents} collection={collection} setCollection={setCollection}
          sql={sql} setSql={setSql} sqlParams={sqlParams} setSqlParams={setSqlParams} sqlResults={sqlResults}
          newTableName={newTableName} setNewTableName={setNewTableName} columnDefinitions={columnDefinitions} setColumnDefinitions={setColumnDefinitions}
          rowJson={rowJson} setRowJson={setRowJson} documentJson={documentJson} setDocumentJson={setDocumentJson}
          busy={busy} loading={dataLoading || rowsLoading} onCreateTable={createTable} onCreateRow={createRow} onRunQuery={executeQuery} onCreateDocument={createDocument}
          onDeleteRow={deleteRow} onDeleteDocument={deleteDocument} onMigrationApplied={refreshTablesAfterMigration}
          />}
        </>}
        {section === 'data' && !project && <section className="idb-console-panel idb-empty-workspace"><Database size={22} /><h2>Create your first database project</h2><p>Projects give your SQL tables, documents, and API keys an isolated home.</p><button type="button" onClick={() => switchSection('projects')}>Go to projects <ArrowRight size={14} /></button></section>}
        {section === 'keys' && <KeysPanel keys={keys} project={project} plan={overview?.subscription || null} keyName={keyName} setKeyName={setKeyName} createdKey={createdKey} setCreatedKey={setCreatedKey} busy={busy} onCreate={createApiKey} onRevoke={revokeKey} onManagePlan={() => switchSection('billing')} onManageProjects={() => switchSection('projects')} />}
        {section === 'usage' && overview && <UsagePanel overview={overview} />}
        {section === 'billing' && <BillingPanel overview={overview} plans={plans} busy={busy} onChoose={choosePlan} onWalletPay={payWithIyonicPay} />}
        <footer className="idb-console-footer"><span><LockKeyhole size={13} /> Project-scoped PostgreSQL access · encrypted transport</span><span>IONICDB</span></footer>
      </div>
    </main>
  </div>;
};

const OverviewPanel = ({ overview, project, syncSummary, syncError, onSectionChange, onViewPlatforms }: { overview: Overview; project: Project | null; syncSummary: PlatformSyncSummary | null; syncError: string; onSectionChange: (section: Section) => void; onViewPlatforms: () => void }) => {
  const plan = overview.subscription;
  const databases = overview.databaseProjectCount ?? overview.projects.length;
  const requestPercent = plan ? Math.min(100, overview.usage.requests / plan.requestsPerMonth * 100) : 0;
  const storagePercent = plan ? Math.min(100, overview.usage.storageBytes / plan.storageBytes * 100) : 0;
  return <div className="idb-overview-clean">
    <div className="idb-dashboard-welcome"><div><p>WORKSPACE SNAPSHOT</p><h2>Everything in view.</h2><span>Your database usage, project, and next actions.</span></div><span className="idb-dashboard-plan">{plan?.name || 'Free'} plan <i /></span></div>
    <div className="idb-metric-grid">
      <article><span>API REQUESTS <small>THIS MONTH</small></span><strong>{new Intl.NumberFormat('en-US').format(overview.usage.requests)}</strong><p>of {new Intl.NumberFormat('en-US').format(overview.usage.requestLimit)} requests</p><span className="idb-progress"><i style={{ width: `${requestPercent}%` }} /></span></article>
      <article><span>TOTAL STORAGE USED</span><strong>{formatBytes(overview.usage.storageBytes)}</strong><p>of {formatBytes(overview.usage.storageLimitBytes)} across projects, platform data, and media</p><span className="idb-progress"><i style={{ width: `${storagePercent}%` }} /></span></article>
      <article><span>DATABASE PROJECTS</span><strong>{databases}<small> / {plan?.projectLimit || 0}</small></strong><p>{plan?.name || 'Current'} plan allowance</p><span className="idb-progress"><i style={{ width: `${plan?.projectLimit ? Math.min(100, databases / plan.projectLimit * 100) : 0}%` }} /></span></article>
    </div>
    <section className="idb-console-panel idb-current-project-card">
      <div className="idb-current-project-main"><span className="idb-current-project-icon"><Database size={19} /></span><div><p>YOUR DATABASE</p><h2>{project?.name || 'No project selected'}</h2><span>{project ? `${project.tablesCount} tables · ${project.recordsCount.toLocaleString()} records · ${formatBytes(project.storageBytes)}` : 'Your Default project is being prepared.'}</span></div></div>
      <button type="button" onClick={() => onSectionChange(project ? 'data' : 'projects')}>{project ? 'Explore data' : 'Create project'} <ArrowRight size={15} /></button>
    </section>
    <section className="idb-console-panel idb-platform-overview"><div className="idb-dashboard-section-heading"><div><p>CONNECTED PLATFORMS</p><h2>Platform storage breakdown</h2><span>Synced platform data is included in your total storage above</span></div><button type="button" onClick={onViewPlatforms}>Explore platform data <ArrowRight size={14} /></button></div>
      {syncError && <p className="idb-platform-sync-message error">Platform sync needs attention: {syncError}</p>}
      {overview.usage.storageBreakdownComplete === false && <p className="idb-platform-sync-message error">Some platform or media sizes could not be read. Refresh the page to retry the storage breakdown.</p>}
      {syncSummary && <p className="idb-platform-sync-message">Last sync: {syncSummary.recordsSynced.toLocaleString()} records · {formatBytes(syncSummary.storageBytes)} in IyonicDB projects</p>}
      {overview.accountWorkspaces?.length ? <div className="idb-platform-overview-list">{overview.accountWorkspaces.map((workspace) => <article key={workspace.id}><span className="idb-project-list-icon"><Layers3 size={16} /></span><div><b>{workspace.name}</b><small>{(workspace.tablesCount || 0).toLocaleString()} data sets · {(workspace.recordsCount || 0).toLocaleString()} source records{workspace.mediaCount ? ` · ${workspace.mediaCount.toLocaleString()} media files (${formatBytes(workspace.mediaStorageBytes || 0)})` : ''}</small></div><strong className="idb-platform-storage">{formatBytes(workspace.storageBytes || 0)}</strong><span className="idb-platform-sync-state">{workspace.storageBytes ? 'SYNCED' : workspace.recordsCount ? 'AVAILABLE' : 'CONNECTED'}</span></article>)}</div> : <div className="idb-platform-empty"><b>No connected platforms yet</b><span>When you create a shop or platform, its account data will appear here and sync to Default.</span></div>}
    </section>
    <section className="idb-dashboard-actions"><div className="idb-dashboard-section-heading"><div><p>QUICK ACTIONS</p><h2>Pick up where you left off</h2></div></div><div className="idb-action-grid">
      <button type="button" onClick={() => onSectionChange('projects')}><span><FolderKanban size={17} /></span><b>Manage projects</b><small>Create a project or switch workspaces</small><ArrowRight size={14} /></button>
      <button type="button" onClick={() => onSectionChange('data')}><span><Table2 size={17} /></span><b>Explore data</b><small>Work with SQL tables and documents</small><ArrowRight size={14} /></button>
      <button type="button" onClick={() => onSectionChange('keys')}><span><KeyRound size={17} /></span><b>Connect an app</b><small>Create or revoke project API keys</small><ArrowRight size={14} /></button>
    </div></section>
    <section className="idb-dashboard-plan-row"><div><p>PLAN & BILLING</p><b>{plan?.name || 'Free'}{plan?.price ? ` · ${formatPlanPrice(plan)} / 30 days` : ' · No charge'}</b><span>{plan?.currentPeriodEnd ? `Access through ${new Date(plan.currentPeriodEnd).toLocaleDateString()}; renew manually.` : 'Review plan limits and payment options.'}</span></div><button type="button" onClick={() => onSectionChange('billing')}>Manage plan <ArrowRight size={14} /></button></section>
  </div>;
};

const ProjectsPanel = ({ overview, selectedProjectId, onSelectProject, newProjectName, setNewProjectName, onCreate, onSectionChange, busy }: {
  overview: Overview; selectedProjectId: string; onSelectProject: (id: string) => void; newProjectName: string; setNewProjectName: (name: string) => void; onCreate: () => void; onSectionChange: (section: Section) => void; busy: boolean;
}) => {
  const plan = overview.subscription;
  const databaseProjects = overview.projects;
  const databaseCount = overview.databaseProjectCount ?? databaseProjects.length;
  const atLimit = Boolean(plan && databaseCount >= plan.projectLimit);
  return <div className="idb-projects-page">
    <section className="idb-console-panel idb-project-create-card"><div><p>NEW DATABASE</p><h2>Create a project</h2><span>Projects are isolated and share your account storage allowance.</span></div><form onSubmit={(event) => { event.preventDefault(); onCreate(); }}><label htmlFor="idb-new-project-name">Project name</label><input id="idb-new-project-name" value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} maxLength={63} required placeholder="e.g. production" disabled={atLimit || busy} /><button type="submit" disabled={atLimit || busy}><Plus size={15} /> Create project</button></form>{atLimit && <p className="idb-limit-note">You’ve reached the {plan?.projectLimit}-project limit on {plan?.name}. <button type="button" onClick={() => onSectionChange('billing')}>Compare plans <ArrowRight size={12} /></button></p>}</section>
    <section className="idb-console-panel idb-project-list-panel"><div className="idb-dashboard-section-heading"><div><p>YOUR DATABASE PROJECTS</p><h2>{databaseCount} of {plan?.projectLimit ?? 0} projects used</h2></div><span>{plan?.name} plan</span></div>
      {databaseProjects.length ? <div className="idb-project-list">{databaseProjects.map((item) => <article className={item.id === selectedProjectId ? 'selected' : ''} key={item.id}><span className="idb-project-list-icon"><Database size={17} /></span><div><b>{item.name}{item.isDefault && <small className="idb-default-project-badge">DEFAULT · INCLUDED</small>}</b><small>{item.tablesCount} tables · {item.recordsCount.toLocaleString()} records · {formatBytes(item.storageBytes)}</small></div><span className="idb-project-created">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</span><button type="button" onClick={() => { onSelectProject(item.id); onSectionChange('data'); }}>{item.id === selectedProjectId ? 'Open data' : 'Select'} <ArrowRight size={13} /></button></article>)}</div> : <div className="idb-project-empty"><Database size={20} /><b>Your Default project is being prepared</b><span>It is included with your account and ready for tables, documents, and API keys.</span></div>}
    </section>
  </div>;
};

const UsagePanel = ({ overview }: { overview: Overview }) => {
  const plan = overview.subscription;
  const requestRemaining = Math.max(0, overview.usage.requestLimit - overview.usage.requests);
  const storageRemaining = Math.max(0, overview.usage.storageLimitBytes - overview.usage.storageBytes);
  const requestPercent = plan ? Math.min(100, overview.usage.requests / plan.requestsPerMonth * 100) : 0;
  const storagePercent = plan ? Math.min(100, overview.usage.storageBytes / plan.storageBytes * 100) : 0;
  const [periodYear, periodMonth] = overview.usage.periodStart.slice(0, 10).split('-').map(Number);
  const periodStart = new Date(Date.UTC(periodYear, periodMonth - 1, 1));
  const nextReset = Date.UTC(periodYear, periodMonth, 1);
  const daysLeft = Math.max(0, Math.ceil((nextReset - Date.now()) / 86400000));
  return <div className="idb-usage-page">
    <section className="idb-usage-period"><div><p>USAGE PERIOD</p><h2>{periodStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}</h2><span>Calendar-month allowance · resets in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}</span></div><span className="idb-dashboard-plan">{plan?.name || 'Free'} plan <i /></span></section>
    <div className="idb-usage-cards"><UsageMeter title="API requests" used={overview.usage.requests} limit={overview.usage.requestLimit} remaining={requestRemaining} percent={requestPercent} format={(value) => new Intl.NumberFormat('en-US').format(value)} />
      <UsageMeter title="Database storage" used={overview.usage.storageBytes} limit={overview.usage.storageLimitBytes} remaining={storageRemaining} percent={storagePercent} format={formatBytes} />
      <section className="idb-console-panel idb-usage-plan-card"><p>PROJECTS</p><strong>{overview.databaseProjectCount ?? overview.projects.length}<small> / {plan?.projectLimit ?? 0}</small></strong><span>Database projects in use</span><div className="idb-usage-mini-bar"><i style={{ width: `${plan?.projectLimit ? Math.min(100, (overview.databaseProjectCount ?? 0) / plan.projectLimit * 100) : 0}%` }} /></div></section>
    </div>
    <section className="idb-console-panel idb-usage-guidance"><span><ShieldCheck size={18} /></span><div><b>Limits are enforced before data is written.</b><p>API key requests pause at your calendar-month allowance; requests made in the console do not count toward this quota. Storage is shared across database projects, and new tables or records are rejected when your plan limit is reached. No automatic overages.</p></div></section>
  </div>;
};

const UsageMeter = ({ title, used, limit, remaining, percent, format }: { title: string; used: number; limit: number; remaining: number; percent: number; format: (value: number) => string }) => (
  <section className="idb-console-panel idb-usage-meter"><p>{title.toUpperCase()}</p><strong>{format(used)}</strong><span>{format(remaining)} remaining of {format(limit)}</span><div className="idb-usage-meter-track"><i style={{ width: `${percent}%` }} /></div><small>{percent.toFixed(1)}% used</small></section>
);

const ProductAccountDataPanel = ({ data, syncSummary, loading, error, onRetry, onOpenStoredData }: { data: ProductAccountData[]; syncSummary: PlatformSyncSummary | null; loading: boolean; error: string; onRetry: () => void; onOpenStoredData: () => void }) => {
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const datasets = data.flatMap((workspace) => workspace.datasets.map((dataset) => ({ ...dataset, originalName: dataset.name, name: `${workspace.productName} · ${workspace.accountName} · ${dataset.name}` })));
  useEffect(() => { setSelected(datasets[0]?.name || ''); }, [data]);
  const dataset = datasets.find((item) => item.name === selected) || datasets[0];
  const rows = dataset?.records || [];
  const visibleRows = rows.filter((row) => !search || JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));
  const columns = visibleRows.length ? [...new Set(visibleRows.flatMap((row) => Object.keys(row)))] : rows.length ? [...new Set(rows.flatMap((row) => Object.keys(row)))] : [];
  return <section className="idb-console-panel idb-data-panel">
    <div className="idb-data-toolbar"><div><p className="idb-console-overline">CONNECTED PLATFORMS</p><h2>Your Iyonic account data</h2></div><div className="idb-account-tools"><label className="idb-account-search"><span className="idb-visually-hidden">Search records</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this data set" /></label><div className="idb-collection-select"><label htmlFor="idb-account-dataset">Data set</label><select id="idb-account-dataset" value={dataset?.name || ''} onChange={(event) => { setSelected(event.target.value); setSearch(''); }}>{datasets.map((item) => <option value={item.name} key={item.name}>{item.name.replaceAll('_', ' ')} ({item.count ?? item.records.length})</option>)}</select></div></div></div>
    <p className="idb-account-data-note">Shop, NLM Songs, and other account-owned platform records are synced into the <b>Default</b> project’s <code>platform_data</code> document collection and count toward its 5 GB account storage allowance. The source platform remains unchanged.</p>
    <button className="idb-data-action-button" type="button" onClick={onOpenStoredData}>Open the stored copy in Default <ArrowRight size={14} /></button>
    {syncSummary && <div className="idb-account-dataset-meta"><span>Synced {syncSummary.recordsSynced.toLocaleString()} platform records across {syncSummary.datasetsSynced} data sets</span><span>{formatBytes(syncSummary.storageBytes)} of {formatBytes(syncSummary.storageLimitBytes)} used</span></div>}
    {loading ? <p className="idb-empty-state" role="status">Loading account data…</p> : error ? <div className="idb-data-error" role="alert"><b>Some account data could not load.</b><span>{error}</span><button type="button" onClick={onRetry}>Try again</button></div> : dataset ? <><div className="idb-account-dataset-meta"><span>{visibleRows.length.toLocaleString()} shown <small>of {Number(dataset.count ?? dataset.records.length).toLocaleString()} records</small></span>{dataset.originalName === 'media' && <span>{new Set(rows.map((row) => String(row.mediaType || 'other'))).size} media types</span>}</div>{visibleRows.length ? dataset.originalName === 'media' ? <div className="idb-account-media-grid">{visibleRows.map((row, index) => <AccountMediaPreview key={String(row.id || index)} item={row} />)}</div> : <div className="idb-result-table-wrap"><table className="idb-result-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{visibleRows.map((row, index) => <tr key={String(row.id || index)}>{columns.map((column) => <td key={column}>{renderAccountValue(row[column])}</td>)}</tr>)}</tbody></table></div> : <p className="idb-empty-state">{search ? 'No records match your search.' : `No ${dataset.originalName === 'media' ? 'media files' : 'records'} are stored in this data set yet.`}</p>}</> : <p className="idb-empty-state">No connected Iyonic product data is available for this account yet.</p>}
  </section>;
};

const accountMediaUrl = (value: string) => {
  if (!value.startsWith('/')) return value;
  const apiBase = getApiBaseUrl();
  return `${apiBase.startsWith('http') ? new URL(apiBase).origin : ''}${value}`;
};

const AccountMediaPreview = ({ item }: { item: Record<string, unknown> }) => {
  const url = typeof item.url === 'string' ? accountMediaUrl(item.url) : '';
  const name = String(item.originalName || 'Media file');
  const mediaType = String(item.mediaType || 'other');
  const size = Number(item.sizeBytes || 0);
  return <article className="idb-account-media-card">
    <div className="idb-account-media-preview">
      {mediaType === 'image' && url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={name} loading="lazy" /></a>
        : mediaType === 'audio' && url ? <audio controls preload="none" src={url}>{name}</audio>
          : mediaType === 'video' && url ? <video controls preload="metadata" src={url}>{name}</video>
            : <a href={url || undefined} target="_blank" rel="noreferrer">Open {mediaType}</a>}
    </div>
    <div className="idb-account-media-caption"><b title={name}>{name}</b><span>{String(item.source || mediaType)}{size ? ` · ${(size / 1024 / 1024).toFixed(1)} MB` : ''}</span></div>
  </article>;
};

const renderAccountValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' && /^(https?:\/\/|\/)/i.test(value)) return <a href={accountMediaUrl(value)} target="_blank" rel="noreferrer">{value}</a>;
  return String(value);
};

type MigrationRecord = { name: string; statementCount: number; appliedAt: string; alreadyApplied: boolean };
type ConsoleLogEntry = { id: number; timestamp: string; kind: 'SELECT' | 'MIGRATION'; status: 'success' | 'error' | 'warning'; code?: string; message: string };

const getDatabaseError = (error: unknown) => {
  const responseData = typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { data?: { message?: string; code?: string; sqlstate?: string; sqlState?: string } } }).response?.data
    : undefined;
  const rawMessage = responseData?.message || (error instanceof Error ? error.message : 'The request could not be completed.');
  const candidateCode = responseData?.code || responseData?.sqlstate || responseData?.sqlState || rawMessage.match(/\b[0-9A-Z]{5}\b/)?.[0];
  return { message: rawMessage, code: candidateCode && /^[0-9A-Z]{5}$/.test(candidateCode) ? candidateCode : undefined };
};

const DataPanel = ({ mode, setMode, tables, tableLimit, selectedTable, setSelectedTable, rows, documents, collection, setCollection, projectId, projectName, storageBytes, storageLimitBytes, documentCollections, sql, setSql, sqlParams, setSqlParams, sqlResults, newTableName, setNewTableName, columnDefinitions, setColumnDefinitions, rowJson, setRowJson, documentJson, setDocumentJson, busy, loading, onCreateTable, onCreateRow, onRunQuery, onCreateDocument, onDeleteRow, onDeleteDocument, onMigrationApplied }: {
  mode: Mode; setMode: (mode: Mode) => void; tables: TableInfo[]; tableLimit: number; selectedTable: string; setSelectedTable: (name: string) => void; rows: Record<string, unknown>[]; documents: DocumentRecord[]; collection: string; setCollection: (name: string) => void;
  projectId: string; projectName: string; storageBytes: number; storageLimitBytes: number; documentCollections: DocumentCollection[];
  sql: string; setSql: (query: string) => void; sqlParams: string; setSqlParams: (params: string) => void; sqlResults: Record<string, unknown>[] | null;
  newTableName: string; setNewTableName: (name: string) => void; columnDefinitions: string; setColumnDefinitions: (value: string) => void;
  rowJson: string; setRowJson: (value: string) => void; documentJson: string; setDocumentJson: (value: string) => void; busy: boolean; loading: boolean;
  onCreateTable: () => void; onCreateRow: () => void; onRunQuery: () => Promise<number>; onCreateDocument: () => void; onDeleteRow: (id: unknown) => void; onDeleteDocument: (id: string) => void; onMigrationApplied: () => Promise<void>;
}) => {
  const [showCreateTable, setShowCreateTable] = useState(false);
  const [showCreateRecord, setShowCreateRecord] = useState(false);
  const [showQuery, setShowQuery] = useState(false);
  const [migrationName, setMigrationName] = useState('');
  const [migrationSql, setMigrationSql] = useState('');
  const [migrationBusy, setMigrationBusy] = useState(false);
  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrations, setMigrations] = useState<MigrationRecord[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([]);
  const logId = useRef(0);
  const appendLog = useCallback((entry: Omit<ConsoleLogEntry, 'id' | 'timestamp'>) => {
    setConsoleLogs((current) => [...current, { ...entry, id: ++logId.current, timestamp: new Date().toLocaleTimeString([], { hour12: false }) }].slice(-100));
  }, []);
  useEffect(() => {
    let active = true;
    setMigrations([]);
    setConsoleLogs([]);
    setMigrationLoading(true);
    api.get<MigrationRecord[]>(`/iyonicdb/projects/${encodeURIComponent(projectId)}/migrations`)
      .then(({ data }) => { if (active) setMigrations(data); })
      .catch((requestError: unknown) => { if (active) { const { code } = getDatabaseError(requestError); appendLog({ kind: 'MIGRATION', status: 'error', code, message: 'Could not load migration history.' }); } })
      .finally(() => { if (active) setMigrationLoading(false); });
    return () => { active = false; };
  }, [projectId, appendLog]);
  const runLoggedQuery = async () => {
    try {
      const count = await onRunQuery();
      appendLog({ kind: 'SELECT', status: 'success', message: `Query completed · ${count} row${count === 1 ? '' : 's'} returned.` });
    } catch (requestError) {
      const { code } = getDatabaseError(requestError);
      appendLog({ kind: 'SELECT', status: 'error', code, message: code ? 'Query failed; see code.' : 'Query failed validation or could not be completed.' });
    }
  };
  const applyMigration = async () => {
    const name = migrationName.trim();
    if (!name || !migrationSql.trim()) return;
    setMigrationBusy(true);
    try {
      const { data } = await api.post<MigrationRecord>(`/iyonicdb/projects/${encodeURIComponent(projectId)}/migrations`, { name, sql: migrationSql });
      setMigrations((current) => [data, ...current.filter((item) => item.name !== data.name)]);
      appendLog({ kind: 'MIGRATION', status: data.alreadyApplied ? 'warning' : 'success', message: data.alreadyApplied ? `Migration “${name}” was already applied; no changes made.` : `Migration “${name}” applied · ${data.statementCount} statement${data.statementCount === 1 ? '' : 's'}.` });
      if (!data.alreadyApplied) {
        setMigrationSql('');
        try { await onMigrationApplied(); }
        catch { appendLog({ kind: 'MIGRATION', status: 'warning', message: 'Migration applied, but refreshing the explorer failed.' }); }
      }
    } catch (requestError) {
      const { code } = getDatabaseError(requestError);
      appendLog({ kind: 'MIGRATION', status: 'error', code, message: code ? 'Migration failed; see code.' : 'Migration failed validation or could not be applied.' });
    } finally { setMigrationBusy(false); }
  };
  const resultRows = sqlResults === null ? rows : sqlResults;
  const columns = resultRows.length ? Object.keys(resultRows[0]) : tables.find((item) => item.name === selectedTable)?.columns.map((column) => column.name) || [];
  const rowCount = tables.reduce((total, item) => total + (item.rowCount || 0), 0);
  return <section className="idb-console-panel idb-data-panel">
    <header className="idb-explorer-heading"><div><p className="idb-console-overline">DATA WORKSPACE <span>·</span> {projectName.toUpperCase()}</p><h2>Explore your data</h2><span>Project data is isolated. Storage is shared across your account.</span></div><div className="idb-explorer-context"><span><b>{tables.length}</b> tables</span><i /><span><b>{rowCount.toLocaleString()}</b> records</span><i /><span><b>{formatBytes(storageBytes)}</b> of {formatBytes(storageLimitBytes)} shared storage</span></div></header>
    <div className="idb-explorer-modebar"><div className="idb-data-tabs" role="tablist" aria-label="Data type"><button type="button" role="tab" aria-selected={mode === 'SQL'} className={mode === 'SQL' ? 'active' : ''} onClick={() => setMode('SQL')}><Table2 size={15} />SQL tables</button><button type="button" role="tab" aria-selected={mode === 'Documents'} className={mode === 'Documents' ? 'active' : ''} onClick={() => setMode('Documents')}><Braces size={15} />Documents</button></div><span className="idb-explorer-scope"><LockKeyhole size={12} /> Isolated project data</span></div>
    {loading && <p className="idb-data-loading" role="status">Loading this database project…</p>}
    <div className="idb-explorer-layout">
      <aside className="idb-object-nav" aria-label={mode === 'SQL' ? 'SQL tables' : 'Document collection'}>
        <div className="idb-object-nav-heading"><span>{mode === 'SQL' ? 'TABLES' : 'COLLECTION'}</span>{mode === 'SQL' && <small>{tables.length} / {tableLimit}</small>}</div>
        {mode === 'SQL' ? <>
          <button type="button" className="idb-object-create" onClick={() => setShowCreateTable((open) => !open)} disabled={busy || tables.length >= tableLimit}><Plus size={14} />{tables.length >= tableLimit ? 'Table limit reached' : 'New table'}</button>
          <div className="idb-object-list">{tables.map((table) => <button type="button" key={table.name} className={selectedTable === table.name ? 'selected' : ''} onClick={() => setSelectedTable(table.name)}><Table2 size={14} /><span><b>{table.name}</b><small>{(table.rowCount || 0).toLocaleString()} rows</small></span></button>)}{!tables.length && <p className="idb-object-empty">No tables yet. Create one to start storing structured records.</p>}</div>
        </> : <>
          <label className="idb-object-collection" htmlFor="idb-collection">Active collection<input id="idb-collection" value={collection} onChange={(event) => setCollection(event.target.value)} maxLength={63} /></label>
          <div className="idb-object-list">{documentCollections.map((item) => <button type="button" key={item.collection} className={collection === item.collection ? 'selected' : ''} onClick={() => setCollection(item.collection)}><Braces size={14} /><span><b>{item.collection}</b><small>{item.count.toLocaleString()} documents</small></span></button>)}{!documentCollections.length && <p className="idb-object-empty">No collections yet. Save a document to create one.</p>}</div>
          <div className="idb-collection-hint"><Braces size={14} /><span>JSON documents are grouped by collection name. Enter a new name above to start a collection.</span></div>
        </>}
      </aside>
      <div className="idb-explorer-workspace">
        <div className="idb-object-toolbar"><div><span className="idb-object-kind">{mode === 'SQL' ? <Table2 size={13} /> : <Braces size={13} />}{mode === 'SQL' ? 'SQL TABLE' : 'DOCUMENT COLLECTION'}</span><h3>{mode === 'SQL' ? selectedTable || 'Select a table' : collection || 'Untitled collection'}</h3><p>{mode === 'SQL' ? selectedTable ? `${(tables.find((item) => item.name === selectedTable)?.rowCount ?? rows.length).toLocaleString()} rows · ${columns.length} columns` : 'Choose a table from the navigator or create a new one.' : `${documents.length.toLocaleString()} documents · project scoped`}</p></div>
          {mode === 'SQL' ? selectedTable && <button type="button" className="idb-explorer-primary" onClick={() => setShowCreateRecord((open) => !open)} disabled={busy}><Plus size={14} /> Add row</button> : <button type="button" className="idb-explorer-primary" onClick={() => setShowCreateRecord((open) => !open)} disabled={busy || !collection.trim()}><Plus size={14} /> New document</button>}
        </div>
        {showCreateTable && mode === 'SQL' && <form className="idb-db-form idb-explorer-form" onSubmit={(event) => { event.preventDefault(); onCreateTable(); setShowCreateTable(false); }}><label>Table name<input value={newTableName} onChange={(event) => setNewTableName(event.target.value)} required maxLength={63} placeholder="orders" /></label><label>Columns <small>comma separated: name:type</small><input value={columnDefinitions} onChange={(event) => setColumnDefinitions(event.target.value)} required placeholder="title:text, quantity:integer" /></label><button disabled={busy}>Create table</button></form>}
        {showCreateRecord && mode === 'SQL' && selectedTable && <form className="idb-db-form idb-explorer-form" onSubmit={(event) => { event.preventDefault(); onCreateRow(); setShowCreateRecord(false); }}><label>Row data <small>JSON object</small><textarea value={rowJson} onChange={(event) => setRowJson(event.target.value)} rows={3} /></label><button disabled={busy}>Insert row</button></form>}
        {showCreateRecord && mode === 'Documents' && <form className="idb-db-form idb-explorer-form" onSubmit={(event) => { event.preventDefault(); onCreateDocument(); setShowCreateRecord(false); }}><label>Document body <small>Valid JSON</small><textarea value={documentJson} onChange={(event) => setDocumentJson(event.target.value)} rows={4} /></label><button disabled={busy || !collection.trim()}>Save document</button></form>}
        {mode === 'SQL' ? <>
          <details className="idb-query-details" open={showQuery} onToggle={(event) => setShowQuery(event.currentTarget.open)}><summary><span><Activity size={14} /> SQL query editor</span><small>Read-only SELECT · parameterized</small></summary><div className="idb-query-editor"><div><span>POSTGRESQL SELECT</span><span>Project scoped · parameterized</span></div><label className="idb-visually-hidden" htmlFor="idb-query">SQL query</label><textarea id="idb-query" value={sql} onChange={(event) => setSql(event.target.value)} placeholder="SELECT * FROM your_table LIMIT 50" rows={4} /><label className="idb-db-params" htmlFor="idb-sql-params">Parameters (JSON array)<input id="idb-sql-params" value={sqlParams} onChange={(event) => setSqlParams(event.target.value)} /></label><div className="idb-editor-bottom"><span><LockKeyhole size={12} /> Read-only SELECT statements, isolated to this project</span><button type="button" onClick={runLoggedQuery} disabled={busy || !sql.trim()}>Run query <ArrowRight size={13} /></button></div></div></details>
          <details className="idb-query-details idb-migration-details"><summary><span><Database size={14} /> Schema migration</span><small>Transactional · project scoped</small></summary><div className="idb-migration-editor"><label htmlFor="idb-migration-name">Migration name<input id="idb-migration-name" value={migrationName} onChange={(event) => setMigrationName(event.target.value)} maxLength={120} placeholder="0002_create_users" /></label><label htmlFor="idb-migration-sql">Schema SQL<textarea id="idb-migration-sql" value={migrationSql} onChange={(event) => setMigrationSql(event.target.value)} placeholder={'CREATE TABLE users (\n  id uuid PRIMARY KEY,\n  email text NOT NULL UNIQUE\n);'} rows={7} /></label><div className="idb-migration-controls"><span><LockKeyhole size={12} /> Validated and applied as one migration</span><button type="button" onClick={applyMigration} disabled={busy || migrationBusy || !migrationName.trim() || !migrationSql.trim()}><ArrowRight size={13} />{migrationBusy ? 'Applying…' : 'Apply migration'}</button></div><div className="idb-migration-history"><div><b>APPLIED MIGRATIONS</b><span>{migrationLoading ? 'Loading…' : `${migrations.length} recorded`}</span></div>{migrations.length ? migrations.map((item) => <article key={item.name}><code>{item.name}</code><span>{item.statementCount} statements</span><time dateTime={item.appliedAt}>{new Date(item.appliedAt).toLocaleString()}</time></article>) : !migrationLoading && <p>No migrations recorded for this project yet.</p>}</div></div></details>
          <section className="idb-mini-terminal" aria-label="Query and migration log"><header><span><i /> TERMINAL LOG <small>{consoleLogs.length} / 100</small></span><button type="button" onClick={() => setConsoleLogs([])} disabled={!consoleLogs.length}><Trash2 size={12} /> Clear logs</button></header><div className="idb-terminal-output" role="log" aria-live="polite" aria-relevant="additions text">{consoleLogs.length ? consoleLogs.map((entry) => <article className={`idb-terminal-entry ${entry.status}`} key={entry.id}><time>{entry.timestamp}</time><strong className="idb-terminal-status">{entry.status.toUpperCase()}</strong><b>{entry.kind}</b>{entry.code ? <code>{entry.code}</code> : <code aria-hidden="true" className="idb-terminal-code-placeholder" />}<span>{entry.message}</span></article>) : <p>Ready. Query and migration results will appear here.</p>}</div></section>
          {!selectedTable ? <div className="idb-explorer-empty"><Table2 size={20} /><b>Your tables live here</b><span>Select a table to inspect its rows, or create one to begin.</span></div> : <div className="idb-explorer-results"><div className="idb-result-label"><span>{sqlResults === null ? 'TABLE ROWS' : 'QUERY RESULTS'}</span><b>{resultRows.length.toLocaleString()} {resultRows.length === 1 ? 'record' : 'records'}</b></div><ResultTable rows={resultRows} columns={columns} onDelete={sqlResults === null ? onDeleteRow : undefined} />{sqlResults !== null && <button type="button" className="idb-query-reset" onClick={() => setShowQuery(true)}>Edit query <ArrowRight size={13} /></button>}</div>}
        </> : <div className="idb-explorer-results"><div className="idb-result-label"><span>DOCUMENTS IN {collection || 'COLLECTION'}</span><b>{documents.length.toLocaleString()} {documents.length === 1 ? 'document' : 'documents'}</b></div><div className="idb-document-list">{documents.map((item) => <article key={item.id}><Braces size={15} /><div><b>{item.id}</b><code>{JSON.stringify(item.document)}</code><small>Created {new Date(item.created_at).toLocaleString()}</small></div><button type="button" aria-label={`Delete document ${item.id}`} onClick={() => onDeleteDocument(item.id)}><Trash2 size={14} /></button></article>)}{!documents.length && <p className="idb-empty-state">No documents in this collection yet. Add a JSON document to get started.</p>}</div></div>}
      </div>
    </div>
  </section>;
};

const ResultTable = ({ rows, columns, onDelete }: { rows: Record<string, unknown>[]; columns: string[]; onDelete?: (id: unknown) => void }) => (
  <div className="idb-result-table-wrap"><table className="idb-result-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}{onDelete && <th>Actions</th>}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id || index)}>{columns.map((column) => <td key={column}>{typeof row[column] === 'object' && row[column] !== null ? JSON.stringify(row[column]) : String(row[column] ?? '')}</td>)}{onDelete && <td><button type="button" onClick={() => onDelete(row.id)} aria-label="Delete row"><Trash2 size={13} /></button></td>}</tr>)}</tbody></table>{!rows.length && <p className="idb-empty-state">No rows found. Create a table and insert your first row.</p>}</div>
);

const KeysPanel = ({ keys, project, plan, keyName, setKeyName, createdKey, setCreatedKey, busy, onCreate, onRevoke, onManagePlan, onManageProjects }: {
  keys: ApiKey[]; project: Project | null; plan: Plan | null; keyName: string; setKeyName: (name: string) => void; createdKey: string; setCreatedKey: (key: string) => void; busy: boolean; onCreate: () => void; onRevoke: (id: string) => void; onManagePlan: () => void; onManageProjects: () => void;
}) => {
  const activeKeys = keys.filter((key) => !key.revoked_at).length;
  const keyLimit = plan?.apiKeyLimit ?? 2;
  const atLimit = activeKeys >= keyLimit;
  return <div className="idb-api-keys-page">
    <section className="idb-console-panel idb-key-plan-card"><div className="idb-key-plan-icon"><KeyRound size={20} /></div><div><p>ACTIVE KEY ALLOWANCE · {plan?.name || 'FREE PLAN'}</p><h2>{activeKeys} <small>of {keyLimit}</small></h2><span>Active keys across all your projects. Revoked keys free a slot.</span><div className="idb-key-limit-track"><i style={{ width: `${Math.min(100, activeKeys / keyLimit * 100)}%` }} /></div></div><button type="button" onClick={onManagePlan}>View plan options <ArrowRight size={14} /></button></section>
    <div className="idb-keys-warning"><ShieldCheck size={19} /><p><b>One key handles authentication and project selection.</b><span>Each key is assigned to the project selected in this console. Your app sends only the API key; no project ID is needed. Secrets are SHA-256 hashed and shown once.</span></p></div>
    {!project && <section className="idb-console-panel idb-empty-workspace"><KeyRound size={21} /><h2>No database project yet</h2><p>Create or select a project here. New API keys automatically carry that project’s scope, so connected apps need only the key.</p><button type="button" onClick={onManageProjects}>Manage projects <ArrowRight size={14} /></button></section>}
    {createdKey && <section className="idb-console-panel idb-created-key"><label htmlFor="idb-created-key">Copy this key now</label><input id="idb-created-key" readOnly value={createdKey} onFocus={(event) => event.target.select()} /><button type="button" onClick={() => { navigator.clipboard.writeText(createdKey).then(() => setCreatedKey('')).catch(() => {}); }}>Copy and dismiss</button></section>}
    <section className="idb-console-panel idb-key-list"><div className="idb-panel-heading"><div><p>API KEYS · {project ? project.name.toUpperCase() : 'ACCOUNT'}</p><h2>Credentials</h2></div><span className="idb-key-count">{activeKeys} active · {keys.length - activeKeys} revoked</span></div>
      {project && <form className="idb-form-row idb-key-create-form" onSubmit={(event) => { event.preventDefault(); onCreate(); }}><label htmlFor="idb-key-name">New key name</label><input id="idb-key-name" value={keyName} onChange={(event) => setKeyName(event.target.value)} maxLength={64} required placeholder="production server" /><button type="submit" disabled={busy || atLimit}>Create key <Plus size={14} /></button><small className="idb-key-scope-note">Scope: {project.name}. Connected apps only need this key, no project ID.</small>{atLimit && <p className="idb-key-limit-note">You’ve reached the {plan?.name || 'Free'} plan limit of {keyLimit} active keys. Revoke a key or use View plan options above.</p>}</form>}
      {keys.map((key) => <div className="idb-key-row" key={key.id}><span className="idb-key-icon"><KeyRound size={17} /></span><span><b>{key.name}</b><small>{key.project_name} · created {new Date(key.created_at).toLocaleDateString()}{key.last_used_at ? ` · last used ${new Date(key.last_used_at).toLocaleString()}` : ' · not used yet'}</small></span><code>{key.key_prefix}…</code><span className="idb-key-scope">{key.revoked_at ? 'REVOKED' : 'ACTIVE'}</span>{!key.revoked_at && <button type="button" aria-label={`Revoke ${key.name}`} onClick={() => onRevoke(key.id)}><X size={15} /></button>}</div>)}
      {!keys.length && <p className="idb-empty-state">No API keys yet. Create a key to connect your application.</p>}
    </section>
    <div className="idb-security-note"><LockKeyhole size={17} /><div><b>Never ship secret keys to a browser.</b><p>Keep live keys in a trusted server environment and use HTTPS for database API requests.</p></div></div>
  </div>;
};

const BillingPanel = ({ overview, plans, busy, onChoose, onWalletPay }: { overview: Overview | null; plans: Plan[]; busy: boolean; onChoose: (planId: string) => void; onWalletPay: (planId: string) => void }) => {
  const wallet = overview?.wallet;
  return <>
    <div className="idb-billing-summary"><div><span>SUBSCRIPTION STATUS</span><h2>{overview?.subscription?.name || 'No active plan'}</h2><p>{overview?.subscription?.id === 'free' ? 'Your free 5 GB workspace is active. Upgrade whenever your business needs more room.' : overview?.subscription?.currentPeriodEnd ? `Access through ${new Date(overview.subscription.currentPeriodEnd).toLocaleDateString()}. Paid plans last 30 days and do not renew automatically.` : 'Choose a 30-day plan to expand your workspace. Plans require manual renewal.'}</p></div><span className="idb-plan-status"><i /> {overview?.subscription ? 'ACTIVE' : 'REQUIRES PLAN'}</span></div>
    <section className="idb-console-panel idb-plan-options"><div className="idb-panel-heading"><div><p>PAY WITH IYONICPAY OR PAYSTACK</p><h2>Choose your plan</h2></div></div>
      <p className="idb-wallet-summary">{wallet?.available ? <>IyonicPay wallet balance <b>{formatCurrencyAmount(wallet.balance, wallet.currency)}</b><Link to="/iyonicpay">Manage wallet <ArrowRight size={13} /></Link></> : <>No IyonicPay wallet is linked. <Link to="/iyonicpay">Open IyonicPay to add funds <ArrowRight size={13} /></Link></>}</p>
      <div className="idb-console-plans">{plans.map((plan) => {
        const isCurrent = overview?.subscription?.id === plan.id;
        const walletCharge = wallet?.planCharges?.[plan.id];
        const walletCanPay = Boolean(wallet?.available && walletCharge !== undefined && wallet.balance >= walletCharge);
        const walletLabel = isCurrent ? 'Current plan' : !wallet?.available ? 'Wallet not linked' : walletCharge === undefined ? 'Currency unsupported' : !walletCanPay ? 'Insufficient funds' : 'Pay with IyonicPay';
        return <article className={`idb-console-plan${isCurrent ? ' selected' : ''}`} key={plan.id}>
          <span>{plan.name}{isCurrent && <Check size={14} />}</span>
          <b>{plan.price === 0 ? 'Free' : formatPlanPrice(plan)}<small>{plan.price === 0 ? ' forever' : ' / 30 days'}</small></b>
          <small>{plan.projectLimit} projects · {plan.tableLimit} tables/project · {plan.apiKeyLimit} active API keys · {plan.storageGb} GB storage · {new Intl.NumberFormat('en-US').format(plan.requestsPerMonth)} API requests/month</small>
          {plan.price > 0 && <small className="idb-wallet-quote">{walletCharge !== undefined ? `Wallet charge: ${formatCurrencyAmount(walletCharge, wallet?.currency || 'USD')} · ${walletCanPay ? 'balance covers it' : 'balance too low'}` : wallet?.available ? `IyonicPay does not support ${wallet.currency} yet.` : 'Link an IyonicPay wallet to see its charge.'}</small>}
          {plan.price === 0 ? <button type="button" disabled>{isCurrent ? 'Included with your account' : 'Free plan'}</button> : <div className="idb-plan-payment-actions"><button type="button" onClick={() => onWalletPay(plan.id)} disabled={busy || isCurrent || !walletCanPay}>{walletLabel}</button><button type="button" onClick={() => onChoose(plan.id)} disabled={busy || isCurrent}>{isCurrent ? 'Active' : 'Pay with Paystack'}</button></div>}
        </article>;
      })}</div>
    </section>
    <section className="idb-console-panel idb-estimate-panel"><div className="idb-panel-heading"><div><p>NO AUTOMATIC OVERAGES</p><h2>Hard usage limits</h2></div></div><p>API keys are rate-limited to the selected plan’s calendar-month request quota. Writes are rejected when storage reaches its limit. Paid plans grant 30 days of access and require manual renewal; there are no automatic charges.</p></section>
  </>
};

export default IyonicDBConsole;
