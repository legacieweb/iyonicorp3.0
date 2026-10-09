import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, Braces, Check, ChevronDown, Database, KeyRound, LockKeyhole, Plus, ShieldCheck, Table2, Terminal, Trash2, X } from 'lucide-react';
import SEO from '../components/SEO';
import { api } from '../services/api';
import './iyonicdb.css';

type Section = 'overview' | 'data' | 'keys' | 'billing';
type Mode = 'SQL' | 'Documents';
type Plan = { id: string; name: string; price: number; currency: string; projectLimit: number; storageBytes: number; storageGb: number; requestsPerMonth: number; tableLimit: number; status?: string; currentPeriodEnd?: string };
type Project = { id: string; name: string; createdAt: string };
type TableInfo = { name: string; rowCount: number; columns: { name: string; type: string; nullable: boolean }[] };
type ApiKey = { id: string; project_id: string; project_name: string; name: string; key_prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null };
type DocumentRecord = { id: string; document: Record<string, unknown>; created_at: string; updated_at: string };
type Overview = { projects: Project[]; subscription: Plan | null; usage: { requests: number; requestLimit: number; storageBytes: number; storageLimitBytes: number; periodStart: string } };

const menu: { id: Section; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'data', label: 'Data explorer', icon: Database },
  { id: 'keys', label: 'API keys', icon: KeyRound },
  { id: 'billing', label: 'Plans & billing', icon: LockKeyhole },
];

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

export const IyonicDBConsole: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>(() => {
    const requested = new URLSearchParams(location.search).get('section');
    return requested === 'data' || requested === 'keys' || requested === 'billing' ? requested : 'overview';
  });
  const [overview, setOverview] = useState<Overview | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
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
    () => overview?.projects.find((item) => item.id === selectedProjectId) || overview?.projects[0] || null,
    [overview, selectedProjectId]
  );

  const refreshOverview = useCallback(async () => {
    const response = await api.get<Overview>('/iyonicdb/overview');
    setOverview(response.data);
    setSelectedProjectId((current) => response.data.projects.some((item) => item.id === current) ? current : response.data.projects[0]?.id || '');
    setAuthenticated(true);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api.get<Overview>('/iyonicdb/overview'), api.get<Plan[]>('/iyonicdb/plans')])
      .then(([account, availablePlans]) => {
        if (!active) return;
        setOverview(account.data);
        setSelectedProjectId(account.data.projects[0]?.id || '');
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
  }, []);

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
    if (section !== 'data' || !project) return;
    if (dataMode === 'SQL') {
      api.get<TableInfo[]>(`/iyonicdb/projects/${project.id}/tables`)
        .then(({ data }) => {
          setTables(data);
          setSelectedTable((current) => data.some((table) => table.name === current) ? current : data[0]?.name || '');
          if (!data.length) setRows([]);
        })
        .catch((requestError: unknown) => setError(errorMessage(requestError)));
    } else if (collection) {
      api.get<DocumentRecord[]>(`/iyonicdb/projects/${project.id}/documents/${encodeURIComponent(collection)}`)
        .then(({ data }) => setDocuments(data))
        .catch((requestError: unknown) => setError(errorMessage(requestError)));
    }
  }, [section, project, dataMode, collection]);

  useEffect(() => {
    if (section !== 'data' || dataMode !== 'SQL' || !project || !selectedTable) return;
    api.get<Record<string, unknown>[]>(`/iyonicdb/projects/${project.id}/tables/${selectedTable}/rows`)
      .then(({ data }) => setRows(data))
      .catch((requestError: unknown) => setError(errorMessage(requestError)));
  }, [section, dataMode, project, selectedTable]);

  const runAction = async (action: () => Promise<void>) => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await action();
    } catch (requestError) {
      setError(errorMessage(requestError));
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

  const executeQuery = () => runAction(async () => {
    if (!project) throw new Error('Create a project before running SQL.');
    const params = JSON.parse(sqlParams);
    if (!Array.isArray(params)) throw new Error('SQL parameters must be a JSON array.');
    const { data } = await api.post<{ rows: Record<string, unknown>[]; rowCount: number }>(`/iyonicdb/projects/${project.id}/query`, { sql, params });
    setSqlResults(data.rows);
    setNotice(`${data.rowCount} row(s) returned from PostgreSQL.`);
  });

  const createDocument = () => runAction(async () => {
    if (!project) throw new Error('Create a project before saving documents.');
    await api.post(`/iyonicdb/projects/${project.id}/documents/${encodeURIComponent(collection)}`, { document: JSON.parse(documentJson) });
    setDocumentJson('{}');
    const { data } = await api.get<DocumentRecord[]>(`/iyonicdb/projects/${project.id}/documents/${encodeURIComponent(collection)}`);
    setDocuments(data);
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
    const { data } = await api.post<{ authorizationUrl: string }>('/iyonicdb/billing/initialize', { planId });
    window.location.assign(data.authorizationUrl);
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
    await refreshOverview();
  });

  const switchSection = (next: Section) => {
    setSection(next);
    setError('');
    setNotice('');
  };

  if (loading) return <div className="idb-console-loading" role="status">Connecting to IyonicDB…</div>;

  if (!authenticated) {
    return <div className="idb-console-auth">
      <SEO title="IyonicDB Console" description="Sign in to use your live IyonicDB projects." />
      <Link to="/iyonicdb"><span className="idb-logo">Iyonic<span>DB</span></span></Link>
      <h1>Sign in to your database</h1>
      <p>IyonicDB uses your Iyonicorp account to isolate projects, manage API keys, and track billing.</p>
      {error && <p className="idb-api-error" role="alert">{error}</p>}
      <Link className="idb-button" to="/login">Sign in <ArrowRight size={16} /></Link>
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
      <p className="idb-sidebar-label">DATABASE</p>
      <nav aria-label="Console sections" className="idb-console-nav">
        {menu.map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => switchSection(id)} className={section === id ? 'active' : ''} aria-current={section === id ? 'page' : undefined}><Icon size={17} />{label}</button>)}
      </nav>
      <div className="idb-sidebar-bottom"><div className="idb-health-note"><span><i /> PostgreSQL service</span><p>Live project data<br />Account isolated</p></div><Link to="/iyonicdb"><ArrowRight size={15} /> Product overview</Link></div>
    </aside>
    <main className="idb-console-main">
      <header className="idb-console-topbar">
        <div className="idb-console-crumb"><span>{project?.name || 'IyonicDB'}</span><b>/</b><strong>{menu.find((item) => item.id === section)?.label}</strong></div>
        <div className="idb-console-top-actions"><span className="idb-demo-pill"><i /> LIVE</span><span className="idb-avatar"><Database size={15} /></span></div>
      </header>
      <div className="idb-console-content">
        <div className="idb-console-page-heading">
          <div><p className="idb-console-overline">IONICDB <span>·</span> LIVE SERVICE</p><h1>{menu.find((item) => item.id === section)?.label}</h1><p>{project ? `Project: ${project.name}` : 'Create a project to start storing your data.'}</p></div>
          {section === 'overview' && overview?.subscription && <button className="idb-new-project" type="button" onClick={() => document.getElementById('idb-new-project-name')?.focus()}><Plus size={16} /> New project</button>}
        </div>
        {error && <div className="idb-console-error" role="alert">{error}<button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={14} /></button></div>}
        {notice && <div className="idb-notice" role="status"><Check size={15} />{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={14} /></button></div>}
        {!overview?.subscription && section !== 'billing' && <section className="idb-keys-warning"><ShieldCheck size={19} /><p><b>Choose a plan to provision databases.</b><span>Plans enforce project, table, storage, and monthly API request limits.</span><button type="button" onClick={() => switchSection('billing')}>View plans</button></p></section>}
        {section === 'overview' && overview && <OverviewPanel overview={overview} plans={plans} project={project} newProjectName={newProjectName} setNewProjectName={setNewProjectName} onCreate={createProject} onSectionChange={switchSection} />}
        {section === 'data' && overview?.subscription && project && <DataPanel
          mode={dataMode} setMode={setDataMode} tables={tables} selectedTable={selectedTable} setSelectedTable={setSelectedTable}
          rows={rows} documents={documents} collection={collection} setCollection={setCollection}
          sql={sql} setSql={setSql} sqlParams={sqlParams} setSqlParams={setSqlParams} sqlResults={sqlResults}
          newTableName={newTableName} setNewTableName={setNewTableName} columnDefinitions={columnDefinitions} setColumnDefinitions={setColumnDefinitions}
          rowJson={rowJson} setRowJson={setRowJson} documentJson={documentJson} setDocumentJson={setDocumentJson}
          busy={busy} onCreateTable={createTable} onCreateRow={createRow} onRunQuery={executeQuery} onCreateDocument={createDocument}
          onDeleteRow={deleteRow} onDeleteDocument={deleteDocument}
        />}
        {section === 'keys' && <KeysPanel keys={keys} project={project} keyName={keyName} setKeyName={setKeyName} createdKey={createdKey} setCreatedKey={setCreatedKey} busy={busy} onCreate={createApiKey} onRevoke={revokeKey} />}
        {section === 'billing' && <BillingPanel overview={overview} plans={plans} busy={busy} onChoose={choosePlan} />}
        <footer className="idb-console-footer"><span><LockKeyhole size={13} /> Project-scoped PostgreSQL access · encrypted transport</span><span>IONICDB</span></footer>
      </div>
    </main>
  </div>;
};

const OverviewPanel = ({ overview, plans, project, newProjectName, setNewProjectName, onCreate, onSectionChange }: {
  overview: Overview; plans: Plan[]; project: Project | null; newProjectName: string; setNewProjectName: (name: string) => void; onCreate: () => void; onSectionChange: (section: Section) => void;
}) => {
  const subscription = overview.subscription;
  const storagePercent = subscription ? Math.min(100, (overview.usage.storageBytes / subscription.storageBytes) * 100) : 0;
  const requestPercent = subscription ? Math.min(100, (overview.usage.requests / subscription.requestsPerMonth) * 100) : 0;
  return <>
    {subscription && <div className="idb-metric-grid">
      <article><span>API REQUESTS <small>THIS MONTH</small></span><strong>{new Intl.NumberFormat('en-US').format(overview.usage.requests)}</strong><p>of {new Intl.NumberFormat('en-US').format(subscription.requestsPerMonth)} monthly requests</p><span className="idb-progress"><i style={{ width: `${requestPercent}%` }} /></span></article>
      <article><span>STORAGE USED <small>LIVE DATABASE SIZE</small></span><strong>{formatBytes(overview.usage.storageBytes)}</strong><p>of {subscription.storageGb} GB included storage</p><span className="idb-progress"><i style={{ width: `${storagePercent}%` }} /></span></article>
      <article><span>PROJECTS <small>ON {subscription.name.toUpperCase()}</small></span><strong>{overview.projects.length}<small> / {subscription.projectLimit}</small></strong><p>PostgreSQL-isolated projects</p></article>
    </div>}
    {project ? <div className="idb-console-two-col">
      <section className="idb-console-panel idb-recent-panel"><div className="idb-panel-heading"><div><p>DATABASE <span>· LIVE</span></p><h2>{project.name}</h2></div><button type="button" onClick={() => onSectionChange('data')}>Open data <ArrowRight size={14} /></button></div><p className="idb-usage-description">Created {new Date(project.createdAt).toLocaleDateString()} · separate PostgreSQL schema</p><div className="idb-inventory-row"><span className="idb-inventory-icon"><Table2 size={16} /></span><span><b>SQL tables</b><small>Relational data explorer</small></span><button type="button" onClick={() => onSectionChange('data')}>Manage</button></div><div className="idb-inventory-row"><span className="idb-inventory-icon idb-doc-icon"><Braces size={16} /></span><span><b>Document collections</b><small>JSONB storage</small></span><button type="button" onClick={() => onSectionChange('data')}>Manage</button></div></section>
      <section className="idb-console-panel idb-usage-card"><div><p>ACTIVE SUBSCRIPTION</p><h2>{subscription?.name || 'No active plan'}</h2><p className="idb-usage-description">{subscription ? `Paid through ${new Date(subscription.currentPeriodEnd || '').toLocaleDateString()}. Renew with a new checkout.` : 'Choose a plan to provision additional resources.'}</p></div><button type="button" onClick={() => onSectionChange('billing')}>Manage billing <ArrowRight size={14} /></button></section>
    </div> : <section className="idb-console-panel idb-quickstart-panel"><div className="idb-panel-heading"><div><p>YOUR DATABASE</p><h2>Create your first project</h2></div><Database size={18} /></div><p>Provision an isolated PostgreSQL schema for SQL tables and JSON document collections.</p><form className="idb-form-row" onSubmit={(event) => { event.preventDefault(); onCreate(); }}><label htmlFor="idb-new-project-name">Project name</label><input id="idb-new-project-name" value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} maxLength={63} required placeholder="e.g. production" /><button type="submit" disabled={!subscription}>Create project <ArrowRight size={14} /></button></form></section>}
    {subscription && <div className="idb-console-two-col idb-overview-bottom"><section className="idb-console-panel idb-quickstart-panel"><div className="idb-panel-heading"><div><p>DEVELOPER CONNECTION</p><h2>Use your API key</h2></div><Terminal size={17} /></div><pre className="idb-api-snippet"><code>Authorization: Bearer idb_live_…</code></pre><p className="idb-quick-note"><LockKeyhole size={13} /> Create a project key in the API keys section. The secret is displayed once.</p><button className="idb-outline-action" type="button" onClick={() => onSectionChange('keys')}>Manage API keys <ArrowRight size={14} /></button></section><section className="idb-console-panel idb-usage-card"><div><p>PLAN LIMITS · {subscription.name.toUpperCase()}</p><h2>${subscription.price} <small>/ month</small></h2><p className="idb-usage-description">{subscription.projectLimit} projects · {subscription.tableLimit} tables/project · {subscription.storageGb} GB · {new Intl.NumberFormat('en-US').format(subscription.requestsPerMonth)} API requests/month</p></div><button type="button" onClick={() => onSectionChange('billing')}>Compare plans <ArrowRight size={14} /></button></section></div>}
    {!subscription && <div className="idb-console-plans">{plans.map((plan) => <article className="idb-console-plan" key={plan.id}><span>{plan.name}</span><b>${plan.price}<small> / mo</small></b><small>{plan.storageGb} GB · {new Intl.NumberFormat('en-US').format(plan.requestsPerMonth)} requests</small></article>)}</div>}
  </>;
};

const DataPanel = ({ mode, setMode, tables, selectedTable, setSelectedTable, rows, documents, collection, setCollection, sql, setSql, sqlParams, setSqlParams, sqlResults, newTableName, setNewTableName, columnDefinitions, setColumnDefinitions, rowJson, setRowJson, documentJson, setDocumentJson, busy, onCreateTable, onCreateRow, onRunQuery, onCreateDocument, onDeleteRow, onDeleteDocument }: {
  mode: Mode; setMode: (mode: Mode) => void; tables: TableInfo[]; selectedTable: string; setSelectedTable: (name: string) => void; rows: Record<string, unknown>[]; documents: DocumentRecord[]; collection: string; setCollection: (name: string) => void;
  sql: string; setSql: (query: string) => void; sqlParams: string; setSqlParams: (params: string) => void; sqlResults: Record<string, unknown>[] | null;
  newTableName: string; setNewTableName: (name: string) => void; columnDefinitions: string; setColumnDefinitions: (value: string) => void;
  rowJson: string; setRowJson: (value: string) => void; documentJson: string; setDocumentJson: (value: string) => void; busy: boolean;
  onCreateTable: () => void; onCreateRow: () => void; onRunQuery: () => void; onCreateDocument: () => void; onDeleteRow: (id: unknown) => void; onDeleteDocument: (id: string) => void;
}) => {
  const [showCreateTable, setShowCreateTable] = useState(false);
  const resultRows = sqlResults === null ? rows : sqlResults;
  const columns = resultRows.length ? Object.keys(resultRows[0]) : tables.find((item) => item.name === selectedTable)?.columns.map((column) => column.name) || [];
  return <section className="idb-console-panel idb-data-panel">
    <div className="idb-data-toolbar"><div className="idb-data-tabs" role="tablist" aria-label="Data type"><button type="button" role="tab" aria-selected={mode === 'SQL'} className={mode === 'SQL' ? 'active' : ''} onClick={() => setMode('SQL')}><Table2 size={14} />SQL tables</button><button type="button" role="tab" aria-selected={mode === 'Documents'} className={mode === 'Documents' ? 'active' : ''} onClick={() => setMode('Documents')}><Braces size={14} />Documents</button></div>{mode === 'SQL' ? <div className="idb-collection-select"><label htmlFor="idb-table-select">Table</label><select id="idb-table-select" value={selectedTable} onChange={(event) => setSelectedTable(event.target.value)}><option value="">Select a table</option>{tables.map((table) => <option key={table.name} value={table.name}>{table.name}</option>)}</select></div> : <div className="idb-collection-select"><label htmlFor="idb-collection">Collection</label><input id="idb-collection" value={collection} onChange={(event) => setCollection(event.target.value)} maxLength={63} /></div>}</div>
    {mode === 'SQL' ? <>
      <div className="idb-data-actions"><button type="button" onClick={() => setShowCreateTable((open) => !open)}><Plus size={14} /> Create SQL table</button>{selectedTable && <span>{tables.find((item) => item.name === selectedTable)?.rowCount ?? rows.length} rows</span>}</div>
      {showCreateTable && <form className="idb-db-form" onSubmit={(event) => { event.preventDefault(); onCreateTable(); setShowCreateTable(false); }}><label>Table name<input value={newTableName} onChange={(event) => setNewTableName(event.target.value)} required maxLength={63} placeholder="orders" /></label><label>Columns <small>comma separated: name:type</small><input value={columnDefinitions} onChange={(event) => setColumnDefinitions(event.target.value)} required placeholder="title:text, quantity:integer" /></label><button disabled={busy}>Create table</button></form>}
      {selectedTable && <form className="idb-db-form" onSubmit={(event) => { event.preventDefault(); onCreateRow(); }}><label>Insert row as JSON<textarea value={rowJson} onChange={(event) => setRowJson(event.target.value)} rows={2} /></label><button disabled={busy}>Insert row</button></form>}
      <div className="idb-query-editor"><div><span>POSTGRESQL SELECT</span><span>Project scoped · parameterized</span></div><label className="idb-visually-hidden" htmlFor="idb-query">SQL query</label><textarea id="idb-query" value={sql} onChange={(event) => setSql(event.target.value)} placeholder="SELECT * FROM your_table LIMIT 50" rows={4} /><label className="idb-db-params" htmlFor="idb-sql-params">Parameters (JSON array)<input id="idb-sql-params" value={sqlParams} onChange={(event) => setSqlParams(event.target.value)} /></label><div className="idb-editor-bottom"><span><LockKeyhole size={12} /> Read-only SELECT statements, isolated to this project</span><button type="button" onClick={onRunQuery} disabled={busy || !sql.trim()}>Run query <ArrowRight size={13} /></button></div></div>
      <ResultTable rows={resultRows} columns={columns} onDelete={sqlResults === null ? onDeleteRow : undefined} />
    </> : <>
      <form className="idb-db-form" onSubmit={(event) => { event.preventDefault(); onCreateDocument(); }}><label>New document (JSON)<textarea value={documentJson} onChange={(event) => setDocumentJson(event.target.value)} rows={3} /></label><button disabled={busy || !collection.trim()}>Save document</button></form>
      <div className="idb-document-list">{documents.map((item) => <article key={item.id}><Braces size={15} /><div><b>{item.id}</b><code>{JSON.stringify(item.document)}</code><small>Created {new Date(item.created_at).toLocaleString()}</small></div><button type="button" aria-label={`Delete document ${item.id}`} onClick={() => onDeleteDocument(item.id)}><Trash2 size={14} /></button></article>)}{!documents.length && <p className="idb-empty-state">No documents in this collection yet.</p>}</div>
    </>}
  </section>;
};

const ResultTable = ({ rows, columns, onDelete }: { rows: Record<string, unknown>[]; columns: string[]; onDelete?: (id: unknown) => void }) => (
  <div className="idb-result-table-wrap"><table className="idb-result-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}{onDelete && <th>Actions</th>}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id || index)}>{columns.map((column) => <td key={column}>{typeof row[column] === 'object' && row[column] !== null ? JSON.stringify(row[column]) : String(row[column] ?? '')}</td>)}{onDelete && <td><button type="button" onClick={() => onDelete(row.id)} aria-label="Delete row"><Trash2 size={13} /></button></td>}</tr>)}</tbody></table>{!rows.length && <p className="idb-empty-state">No rows found. Create a table and insert your first row.</p>}</div>
);

const KeysPanel = ({ keys, project, keyName, setKeyName, createdKey, setCreatedKey, busy, onCreate, onRevoke }: {
  keys: ApiKey[]; project: Project | null; keyName: string; setKeyName: (name: string) => void; createdKey: string; setCreatedKey: (key: string) => void; busy: boolean; onCreate: () => void; onRevoke: (id: string) => void;
}) => (
  <>
    <div className="idb-keys-warning"><ShieldCheck size={19} /><p><b>Secret is shown only once.</b><span>Keys are SHA-256 hashed at rest. Revoke any key immediately if it may have been exposed.</span></p></div>
    {createdKey && <section className="idb-console-panel idb-created-key"><label htmlFor="idb-created-key">Copy this key now</label><input id="idb-created-key" readOnly value={createdKey} onFocus={(event) => event.target.select()} /><button type="button" onClick={() => { navigator.clipboard.writeText(createdKey).then(() => setCreatedKey('')).catch(() => {}); }}>Copy and dismiss</button></section>}
    <section className="idb-console-panel idb-key-list"><div className="idb-panel-heading"><div><p>PROJECT API KEYS</p><h2>Credentials</h2></div></div>
      {project && <form className="idb-form-row" onSubmit={(event) => { event.preventDefault(); onCreate(); }}><label htmlFor="idb-key-name">New key name</label><input id="idb-key-name" value={keyName} onChange={(event) => setKeyName(event.target.value)} maxLength={64} required placeholder="production server" /><button type="submit" disabled={busy}>Create key <Plus size={14} /></button></form>}
      {keys.map((key) => <div className="idb-key-row" key={key.id}><span className="idb-key-icon"><KeyRound size={17} /></span><span><b>{key.name}</b><small>{key.project_name} · created {new Date(key.created_at).toLocaleDateString()}{key.last_used_at ? ` · last used ${new Date(key.last_used_at).toLocaleString()}` : ' · not used yet'}</small></span><code>{key.key_prefix}…</code><span className="idb-key-scope">{key.revoked_at ? 'REVOKED' : 'ACTIVE'}</span>{!key.revoked_at && <button type="button" aria-label={`Revoke ${key.name}`} onClick={() => onRevoke(key.id)}><X size={15} /></button>}</div>)}
      {!keys.length && <p className="idb-empty-state">No API keys yet. Create a key to connect your application.</p>}
    </section>
    <div className="idb-security-note"><LockKeyhole size={17} /><div><b>Never ship secret keys to a browser.</b><p>Keep live keys in a trusted server environment and use HTTPS for database API requests.</p></div></div>
  </>
);

const BillingPanel = ({ overview, plans, busy, onChoose }: { overview: Overview | null; plans: Plan[]; busy: boolean; onChoose: (planId: string) => void }) => (
  <>
    <div className="idb-billing-summary"><div><span>SUBSCRIPTION STATUS</span><h2>{overview?.subscription ? overview.subscription.name : 'No active plan'}</h2><p>{overview?.subscription ? `Active through ${new Date(overview.subscription.currentPeriodEnd || '').toLocaleDateString()}.` : 'Choose a monthly plan to create projects and issue API keys.'}</p></div><span className="idb-plan-status"><i /> {overview?.subscription ? 'ACTIVE' : 'REQUIRES PLAN'}</span></div>
    <section className="idb-console-panel idb-plan-options"><div className="idb-panel-heading"><div><p>USD · MONTHLY · PAYSTACK CHECKOUT</p><h2>Choose your plan</h2></div></div>
      <div className="idb-console-plans">{plans.map((plan) => <article className={`idb-console-plan${overview?.subscription?.id === plan.id ? ' selected' : ''}`} key={plan.id}><span>{plan.name}{overview?.subscription?.id === plan.id && <Check size={14} />}</span><b>${plan.price}<small> / month</small></b><small>{plan.projectLimit} projects · {plan.tableLimit} tables/project · {plan.storageGb} GB storage · {new Intl.NumberFormat('en-US').format(plan.requestsPerMonth)} API requests/month</small><button type="button" onClick={() => onChoose(plan.id)} disabled={busy}>Pay ${plan.price} with Paystack</button></article>)}</div>
    </section>
    <section className="idb-console-panel idb-estimate-panel"><div className="idb-panel-heading"><div><p>NO AUTOMATIC OVERAGES</p><h2>Hard usage limits</h2></div></div><p>API keys are rate-limited to the selected plan’s monthly request quota. Writes are rejected when storage reaches its limit. Upgrade to continue; the service will not charge beyond the displayed plan price.</p></section>
  </>
);

export default IyonicDBConsole;
