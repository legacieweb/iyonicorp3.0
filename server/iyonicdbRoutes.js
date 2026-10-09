import crypto from 'crypto';
import { nanoid } from 'nanoid';

const PLANS = {
  launch: {
    id: 'launch',
    name: 'Launch',
    price: 10,
    currency: 'USD',
    projectLimit: 1,
    storageBytes: 2 * 1024 ** 3,
    requestsPerMonth: 1_000_000,
    tableLimit: 10,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    price: 35,
    currency: 'USD',
    projectLimit: 5,
    storageBytes: 10 * 1024 ** 3,
    requestsPerMonth: 10_000_000,
    tableLimit: 50,
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    price: 70,
    currency: 'USD',
    projectLimit: 20,
    storageBytes: 50 * 1024 ** 3,
    requestsPerMonth: 50_000_000,
    tableLimit: 200,
  },
};

const identifierPattern = /^[a-z][a-z0-9_]{0,62}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`;
const schemaForProject = (projectId) => `idb_${String(projectId).replaceAll('-', '')}`;
const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');
const safePlan = (plan) => plan ? {
  ...plan,
  storageGb: plan.storageBytes / 1024 ** 3,
} : null;

const getCurrentSubscription = async (db, userId, client = db) => {
  const result = await client.query(
    `SELECT plan_id, status, current_period_start, current_period_end
     FROM iyonicdb_subscriptions
     WHERE user_id = $1
     ORDER BY current_period_end DESC
     LIMIT 1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row || row.status !== 'active' || new Date(row.current_period_end) <= new Date()) {
    return null;
  }
  const plan = PLANS[row.plan_id];
  return plan ? { ...safePlan(plan), status: row.status, currentPeriodEnd: row.current_period_end } : null;
};

const getProject = async (db, userId, projectId, client = db) => {
  if (!uuidPattern.test(String(projectId))) return null;
  const result = await client.query(
    'SELECT id, name, created_at FROM iyonicdb_projects WHERE id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return result.rows[0] || null;
};

const getProjectStorageBytes = async (client, projectId) => {
  const schema = schemaForProject(projectId);
  const relation = await client.query(
    'SELECT pg_total_relation_size($1::regclass) AS bytes',
    [`${quoteIdentifier(schema)}.${quoteIdentifier('iyonicdb_documents')}`]
  );
  const tableResult = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE'`,
    [schema]
  );
  let bytes = Number(relation.rows[0]?.bytes || 0);
  for (const row of tableResult.rows) {
    bytes += Number((await client.query(
      'SELECT pg_total_relation_size($1::regclass) AS bytes',
      [`${quoteIdentifier(schema)}.${quoteIdentifier(row.table_name)}`]
    )).rows[0]?.bytes || 0);
  }
  return bytes;
};

const ensureProjectSchema = async (client, projectId) => {
  const schema = schemaForProject(projectId);
  await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schema)}`);
  await client.query(
    `CREATE TABLE IF NOT EXISTS ${quoteIdentifier(schema)}.${quoteIdentifier('iyonicdb_documents')} (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL,
      collection VARCHAR(63) NOT NULL,
      document JSONB NOT NULL CHECK (jsonb_typeof(document) = 'object'),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS iyonicdb_documents_project_collection
     ON ${quoteIdentifier(schema)}.${quoteIdentifier('iyonicdb_documents')} (project_id, collection, created_at DESC)`
  );
};

const requirePlan = async (db, req, res) => {
  const subscription = await getCurrentSubscription(db, req.user.id);
  if (!subscription) {
    res.status(402).json({ message: 'Choose and activate an IyonicDB plan to use database resources.' });
    return null;
  }
  return subscription;
};

const authenticateIyonicDbKey = (db) => async (req, res, next) => {
  const key = req.get('x-api-key') || req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!key || !key.startsWith('idb_live_')) {
    return res.status(401).json({ message: 'A valid IyonicDB API key is required.' });
  }
  const prefix = key.slice(0, 17);
  try {
    const result = await db.query(
      `SELECT id, user_id, project_id, key_hash
       FROM iyonicdb_api_keys
       WHERE key_prefix = $1 AND revoked_at IS NULL`,
      [prefix]
    );
    const keyHashValue = hashKey(key);
    const matched = result.rows.find((row) => (
      row.key_hash.length === keyHashValue.length
      && crypto.timingSafeEqual(Buffer.from(row.key_hash), Buffer.from(keyHashValue))
    ));
    if (!matched) return res.status(401).json({ message: 'Invalid or revoked IyonicDB API key.' });
    const subscription = await getCurrentSubscription(db, matched.user_id);
    if (!subscription) return res.status(402).json({ message: 'The IyonicDB subscription for this key is inactive.' });
    const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    const usage = await db.query(
      `INSERT INTO iyonicdb_usage (user_id, month_start, request_count, write_count)
       VALUES ($1, date_trunc('month', CURRENT_TIMESTAMP)::date, 1, $2)
       ON CONFLICT (user_id, month_start) DO UPDATE
       SET request_count = iyonicdb_usage.request_count + 1,
           write_count = iyonicdb_usage.write_count + $2
       WHERE iyonicdb_usage.request_count < $3
       RETURNING request_count`,
      [matched.user_id, isWrite ? 1 : 0, subscription.requestsPerMonth]
    );
    if (!usage.rowCount) return res.status(429).json({ message: 'The monthly request limit for this plan has been reached.' });
    await db.query('UPDATE iyonicdb_api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [matched.id]);
    req.iyonicDbKey = { userId: matched.user_id, projectId: matched.project_id, subscription };
    return next();
  } catch (error) {
    console.error('IyonicDB API key authentication failed:', error);
    return res.status(500).json({ message: 'Could not authenticate the IyonicDB API key.' });
  }
};

export const runSqlSelect = async (client, projectId, sql, params) => {
  if (typeof sql !== 'string' || sql.length > 4000 || !Array.isArray(params) || params.length > 50) {
    throw Object.assign(new Error('Provide a SQL SELECT statement (up to 4,000 characters) and at most 50 parameters.'), { status: 400 });
  }
  const match = sql.trim().match(
    /^SELECT\s+(\*|[a-z][a-z0-9_]*(?:\s*,\s*[a-z][a-z0-9_]*)*)\s+FROM\s+([a-z][a-z0-9_]{0,62})(?:\s+WHERE\s+([a-z][a-z0-9_]{0,62}\s*=\s*\$\d+(?:\s+AND\s+[a-z][a-z0-9_]{0,62}\s*=\s*\$\d+)*))?(?:\s+ORDER\s+BY\s+([a-z][a-z0-9_]{0,62})(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?;?$/i
  );
  if (!match) {
    throw Object.assign(new Error('Supported SQL: SELECT fields FROM table [WHERE column = $1 [AND ...]] [ORDER BY column [ASC|DESC]] [LIMIT n]. Use the table and column names shown in this project.'), { status: 400 });
  }
  const [, rawSelectedFields, rawTableName, rawWhereClause, rawOrderColumn, orderDirection, rawLimit] = match;
  const selectedFields = rawSelectedFields.toLowerCase();
  const tableName = rawTableName.toLowerCase();
  const whereClause = rawWhereClause?.toLowerCase();
  const orderColumn = rawOrderColumn?.toLowerCase();
  if (!identifierPattern.test(tableName) || (selectedFields !== '*' && selectedFields.split(',').some((field) => !identifierPattern.test(field.trim())))) {
    throw Object.assign(new Error('Invalid table or column name.'), { status: 400 });
  }
  if (tableName === 'iyonicdb_documents') {
    throw Object.assign(new Error('The internal document storage table is not directly queryable.'), { status: 400 });
  }
  if (whereClause) {
    const placeholders = [...whereClause.matchAll(/\$(\d+)/g)].map((item) => Number(item[1]));
    if (placeholders.some((value, index) => value !== index + 1) || params.length !== placeholders.length) {
      throw Object.assign(new Error('SQL placeholders must be sequential ($1, $2, …) and match the supplied params.'), { status: 400 });
    }
  } else if (params.length) {
    throw Object.assign(new Error('SQL parameters were supplied but no WHERE clause uses them.'), { status: 400 });
  }
  const schema = schemaForProject(projectId);
  const table = await client.query(
    'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
    [schema, tableName]
  );
  const columns = new Set(table.rows.map((row) => row.column_name));
  if (!columns.size) throw Object.assign(new Error('Table not found in this project.'), { status: 404 });
  const references = [
    ...(selectedFields === '*' ? [] : selectedFields.split(',').map((field) => field.trim())),
    ...(whereClause ? [...whereClause.matchAll(/([a-z][a-z0-9_]*)\s*=/gi)].map((item) => item[1]) : []),
    ...(orderColumn ? [orderColumn] : []),
  ];
  if (references.some((column) => !columns.has(column))) {
    throw Object.assign(new Error('A selected, filtered, or ordered column does not exist in this table.'), { status: 400 });
  }
  if (params.some((value) => value === null || ['object', 'undefined'].includes(typeof value))) {
    throw Object.assign(new Error('SQL parameters must be non-null scalar values.'), { status: 400 });
  }
  const projection = selectedFields === '*' ? '*' : selectedFields.split(',').map((field) => quoteIdentifier(field.trim())).join(', ');
  const where = whereClause
    ? ` WHERE ${[...whereClause.matchAll(/([a-z][a-z0-9_]*)\s*=\s*\$(\d+)/gi)]
      .map((item) => `${quoteIdentifier(item[1])} = $${Number(item[2])}`).join(' AND ')}`
    : '';
  const order = orderColumn ? ` ORDER BY ${quoteIdentifier(orderColumn)} ${orderDirection?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}` : '';
  const limit = Math.min(Math.max(Number(rawLimit || 100), 1), 500);
  const result = await client.query(
    `SELECT ${projection} FROM ${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}${where}${order} LIMIT ${limit}`,
    params
  );
  return { rows: result.rows, rowCount: result.rowCount, fields: result.fields.map((field) => field.name) };
};

const insertSqlRow = async (db, projectId, tableName, row, subscription) => {
  if (!identifierPattern.test(tableName) || !row || typeof row !== 'object' || Array.isArray(row)) {
    throw Object.assign(new Error('Provide a valid table and JSON object row.'), { status: 400 });
  }
  const values = Object.entries(row);
  if (!values.length || values.length > 25 || values.some(([name]) => !identifierPattern.test(name) || ['id', 'created_at'].includes(name))) {
    throw Object.assign(new Error('Provide 1 to 25 writable columns. The id and created_at columns are generated.'), { status: 400 });
  }
  const size = Buffer.byteLength(JSON.stringify(row), 'utf8');
  if (size > 1024 * 1024) throw Object.assign(new Error('Rows are limited to 1 MB.'), { status: 413 });
  const schema = schemaForProject(projectId);
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM iyonicdb_projects WHERE id = $1 FOR UPDATE', [projectId]);
    const currentBytes = await getProjectStorageBytes(client, projectId);
    if (currentBytes + size > subscription.storageBytes) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('The plan storage limit has been reached.'), { status: 413 });
    }
    const table = await client.query(
      'SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
      [schema, tableName]
    );
    const columns = new Map(table.rows.map((column) => [column.column_name, column]));
    if (!columns.size) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('Table not found in this project.'), { status: 404 });
    }
    if (values.some(([name]) => !columns.has(name))) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('A supplied field does not exist in this table.'), { status: 400 });
    }
    const required = table.rows.filter((column) => column.is_nullable === 'NO' && !['id', 'created_at'].includes(column.column_name));
    if (required.some((column) => !Object.hasOwn(row, column.column_name))) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('Provide a value for every required column.'), { status: 400 });
    }
    const params = values.map(([name, value]) => {
      if (value === undefined || (value !== null && typeof value === 'object' && !['json', 'jsonb'].includes(columns.get(name).data_type))) {
        throw Object.assign(new Error(`Field "${name}" must be a scalar value.`), { status: 400 });
      }
      return value !== null && typeof value === 'object' ? JSON.stringify(value) : value;
    });
    const result = await client.query(
      `INSERT INTO ${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}
       (${values.map(([name]) => quoteIdentifier(name)).join(', ')})
       VALUES (${values.map((_, index) => `$${index + 1}${['json', 'jsonb'].includes(columns.get(values[index][0]).data_type) ? `::${columns.get(values[index][0]).data_type}` : ''}`).join(', ')})
       RETURNING *`,
      params
    );
    if (await getProjectStorageBytes(client, projectId) > subscription.storageBytes) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('The plan storage limit has been reached.'), { status: 413 });
    }
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    if (!['25P01', '25P02'].includes(error.code)) await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

const insertDocument = async (db, projectId, collection, document, subscription) => {
  const payload = JSON.stringify(document);
  const size = Buffer.byteLength(payload, 'utf8');
  if (size > 1024 * 1024) throw Object.assign(new Error('Documents are limited to 1 MB.'), { status: 413 });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM iyonicdb_projects WHERE id = $1 FOR UPDATE', [projectId]);
    if (await getProjectStorageBytes(client, projectId) + size > subscription.storageBytes) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('The plan storage limit has been reached.'), { status: 413 });
    }
    const result = await client.query(
      `INSERT INTO ${quoteIdentifier(schemaForProject(projectId))}.${quoteIdentifier('iyonicdb_documents')} (project_id, collection, document)
       VALUES ($1, $2, $3::jsonb) RETURNING id, document, created_at, updated_at`,
      [projectId, collection, payload]
    );
    if (await getProjectStorageBytes(client, projectId) > subscription.storageBytes) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('The plan storage limit has been reached.'), { status: 413 });
    }
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

const updateDocument = async (db, projectId, collection, documentId, document, subscription) => {
  const payload = JSON.stringify(document);
  const size = Buffer.byteLength(payload, 'utf8');
  if (size > 1024 * 1024) throw Object.assign(new Error('Documents are limited to 1 MB.'), { status: 413 });
  if (!uuidPattern.test(String(documentId))) throw Object.assign(new Error('Invalid document ID.'), { status: 400 });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM iyonicdb_projects WHERE id = $1 FOR UPDATE', [projectId]);
    const result = await client.query(
      `UPDATE ${quoteIdentifier(schemaForProject(projectId))}.${quoteIdentifier('iyonicdb_documents')}
       SET document = $1::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND project_id = $3 AND collection = $4
       RETURNING id, document, created_at, updated_at`,
      [payload, documentId, projectId, collection]
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('Document not found.'), { status: 404 });
    }
    if (await getProjectStorageBytes(client, projectId) > subscription.storageBytes) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('The plan storage limit has been reached.'), { status: 413 });
    }
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

const updateSqlRow = async (db, projectId, tableName, rowId, row, subscription) => {
  if (!identifierPattern.test(tableName) || !uuidPattern.test(String(rowId)) || !row || typeof row !== 'object' || Array.isArray(row)) {
    throw Object.assign(new Error('Provide a valid table, row ID, and JSON object.'), { status: 400 });
  }
  const values = Object.entries(row);
  if (!values.length || values.length > 25 || values.some(([name]) => !identifierPattern.test(name) || ['id', 'created_at'].includes(name))) {
    throw Object.assign(new Error('Provide 1 to 25 writable columns. The id and created_at columns are generated.'), { status: 400 });
  }
  const size = Buffer.byteLength(JSON.stringify(row), 'utf8');
  if (size > 1024 * 1024) throw Object.assign(new Error('Rows are limited to 1 MB.'), { status: 413 });
  const schema = schemaForProject(projectId);
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM iyonicdb_projects WHERE id = $1 FOR UPDATE', [projectId]);
    const table = await client.query(
      'SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
      [schema, tableName]
    );
    const columns = new Map(table.rows.map((column) => [column.column_name, column]));
    if (!columns.size) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('Table not found in this project.'), { status: 404 });
    }
    if (values.some(([name]) => !columns.has(name))) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('A supplied field does not exist in this table.'), { status: 400 });
    }
    const params = values.map(([name, value]) => {
      if (value === undefined || (value !== null && typeof value === 'object' && !['json', 'jsonb'].includes(columns.get(name).data_type))) {
        throw Object.assign(new Error(`Field "${name}" must be a scalar value.`), { status: 400 });
      }
      return value !== null && typeof value === 'object' ? JSON.stringify(value) : value;
    });
    const assignments = values.map(([name], index) => `${quoteIdentifier(name)} = $${index + 1}${['json', 'jsonb'].includes(columns.get(name).data_type) ? `::${columns.get(name).data_type}` : ''}`);
    const result = await client.query(
      `UPDATE ${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}
       SET ${assignments.join(', ')}
       WHERE id = $${values.length + 1} RETURNING *`,
      [...params, rowId]
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('Row not found.'), { status: 404 });
    }
    if (await getProjectStorageBytes(client, projectId) > subscription.storageBytes) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('The plan storage limit has been reached.'), { status: 413 });
    }
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

export const mountIyonicDbRoutes = (app, authenticateToken, db, Paystack, databaseReady) => {
  app.use('/api/iyonicdb', async (req, res, next) => {
    if (!await databaseReady) return res.status(503).json({ message: 'IyonicDB is unavailable because database initialization failed.' });
    return next();
  });

  app.get('/api/iyonicdb/plans', (req, res) => res.json(Object.values(PLANS).map(safePlan)));

  app.get('/api/iyonicdb/overview', authenticateToken, async (req, res) => {
    try {
      const [projects, subscription, usage] = await Promise.all([
        db.query('SELECT id, name, created_at FROM iyonicdb_projects WHERE user_id = $1 ORDER BY created_at', [req.user.id]),
        getCurrentSubscription(db, req.user.id),
        db.query(
          `SELECT request_count FROM iyonicdb_usage
           WHERE user_id = $1 AND month_start = date_trunc('month', CURRENT_TIMESTAMP)::date`,
          [req.user.id]
        ),
      ]);
      const projectStorage = await Promise.all(projects.rows.map(async (project) => ({
        projectId: project.id,
        bytes: await getProjectStorageBytes(db, project.id),
      })));
      res.json({
        projects: projects.rows.map((project) => ({ id: project.id, name: project.name, createdAt: project.created_at })),
        subscription,
        usage: {
          requests: Number(usage.rows[0]?.request_count || 0),
          requestLimit: subscription?.requestsPerMonth || 0,
          storageBytes: projectStorage.reduce((total, project) => total + project.bytes, 0),
          storageLimitBytes: subscription?.storageBytes || 0,
          periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        },
      });
    } catch (error) {
      console.error('IyonicDB overview failed:', error);
      res.status(500).json({ message: 'Could not load the IyonicDB account overview.' });
    }
  });

  app.post('/api/iyonicdb/projects', authenticateToken, async (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 63) return res.status(400).json({ message: 'Project name must contain 1 to 63 characters.' });
    const subscription = await requirePlan(db, req, res);
    if (!subscription) return;
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
      const existing = await client.query('SELECT count(*)::int AS count FROM iyonicdb_projects WHERE user_id = $1', [req.user.id]);
      if (existing.rows[0].count >= subscription.projectLimit) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: `Your ${subscription.name} plan allows ${subscription.projectLimit} project(s).` });
      }
      const project = await client.query(
        'INSERT INTO iyonicdb_projects (user_id, name) VALUES ($1, $2) RETURNING id, name, created_at',
        [req.user.id, name]
      );
      await ensureProjectSchema(client, project.rows[0].id);
      await client.query('COMMIT');
      res.status(201).json({ id: project.rows[0].id, name: project.rows[0].name, createdAt: project.rows[0].created_at });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('IyonicDB project creation failed:', error);
      res.status(500).json({ message: 'Could not create the database project.' });
    } finally {
      client.release();
    }
  });

  app.get('/api/iyonicdb/projects/:projectId/tables', authenticateToken, async (req, res) => {
    if (!await requirePlan(db, req, res)) return;
    const project = await getProject(db, req.user.id, req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    try {
      const schema = schemaForProject(project.id);
      const tables = await db.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> 'iyonicdb_documents'
         ORDER BY table_name`,
        [schema]
      );
      const result = await Promise.all(tables.rows.map(async ({ table_name: name }) => {
        const columns = await db.query(
          `SELECT column_name, data_type, is_nullable
           FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2
           ORDER BY ordinal_position`,
          [schema, name]
        );
        const count = await db.query(`SELECT count(*)::int AS count FROM ${quoteIdentifier(schema)}.${quoteIdentifier(name)}`);
        return { name, rowCount: count.rows[0].count, columns: columns.rows.map((column) => ({ name: column.column_name, type: column.data_type, nullable: column.is_nullable === 'YES' })) };
      }));
      res.json(result);
    } catch (error) {
      console.error('IyonicDB table listing failed:', error);
      res.status(500).json({ message: 'Could not list project tables.' });
    }
  });

  app.post('/api/iyonicdb/projects/:projectId/tables', authenticateToken, async (req, res) => {
    const subscription = await requirePlan(db, req, res);
    if (!subscription) return;
    const project = await getProject(db, req.user.id, req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    const name = req.body?.name;
    const columns = req.body?.columns;
    if (!identifierPattern.test(name || '') || !Array.isArray(columns) || columns.length < 1 || columns.length > 25) {
      return res.status(400).json({ message: 'Use a lowercase table name and define between 1 and 25 columns.' });
    }
    const types = { text: 'TEXT', integer: 'INTEGER', numeric: 'NUMERIC', boolean: 'BOOLEAN', jsonb: 'JSONB', date: 'DATE', timestamptz: 'TIMESTAMPTZ' };
    const names = new Set(['id', 'created_at']);
    for (const column of columns) {
      if (!identifierPattern.test(column?.name || '') || names.has(column.name) || !types[column?.type] || names.has(column.name)) {
        return res.status(400).json({ message: 'Column names must be unique valid identifiers, and types must be text, integer, numeric, boolean, jsonb, date, or timestamptz.' });
      }
      names.add(column.name);
    }
    const schema = schemaForProject(project.id);
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM iyonicdb_projects WHERE id = $1 FOR UPDATE', [project.id]);
      const count = await client.query(
        `SELECT count(*)::int AS count FROM information_schema.tables
         WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> 'iyonicdb_documents'`,
        [schema]
      );
      if (count.rows[0].count >= subscription.tableLimit) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: `Your ${subscription.name} plan allows ${subscription.tableLimit} tables.` });
      }
      const definitions = [
        `${quoteIdentifier('id')} UUID PRIMARY KEY DEFAULT gen_random_uuid()`,
        ...columns.map((column) => `${quoteIdentifier(column.name)} ${types[column.type]}${column.nullable === false ? ' NOT NULL' : ''}`),
        `${quoteIdentifier('created_at')} TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      ];
      await client.query(`CREATE TABLE ${quoteIdentifier(schema)}.${quoteIdentifier(name)} (${definitions.join(', ')})`);
      if (await getProjectStorageBytes(client, project.id) > subscription.storageBytes) {
        await client.query('ROLLBACK');
        return res.status(413).json({ message: 'The plan storage limit has been reached.' });
      }
      await client.query('COMMIT');
      res.status(201).json({ name, columns: [{ name: 'id', type: 'uuid' }, ...columns, { name: 'created_at', type: 'timestamp with time zone' }], rowCount: 0 });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (error.code === '42P07') return res.status(409).json({ message: 'A table with that name already exists.' });
      console.error('IyonicDB table creation failed:', error);
      res.status(500).json({ message: 'Could not create the SQL table.' });
    } finally {
      client.release();
    }
  });

  app.post('/api/iyonicdb/projects/:projectId/query', authenticateToken, async (req, res) => {
    if (!await requirePlan(db, req, res)) return;
    const project = await getProject(db, req.user.id, req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    try {
      const result = await runSqlSelect(db, project.id, req.body?.sql, req.body?.params || []);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.status ? error.message : 'The SQL query could not be executed.' });
    }
  });

  app.get('/api/iyonicdb/projects/:projectId/tables/:table/rows', authenticateToken, async (req, res) => {
    if (!await requirePlan(db, req, res)) return;
    const project = await getProject(db, req.user.id, req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!identifierPattern.test(req.params.table)) return res.status(400).json({ message: 'Invalid table name.' });
    try {
      const result = await db.query(
        `SELECT * FROM ${quoteIdentifier(schemaForProject(project.id))}.${quoteIdentifier(req.params.table)}
         ORDER BY ${quoteIdentifier('created_at')} DESC LIMIT 200`
      );
      res.json(result.rows);
    } catch (error) {
      if (error.code === '42P01') return res.status(404).json({ message: 'Table not found in this project.' });
      console.error('IyonicDB row listing failed:', error);
      res.status(500).json({ message: 'Could not load table rows.' });
    }
  });

  app.post('/api/iyonicdb/projects/:projectId/tables/:table/rows', authenticateToken, async (req, res) => {
    const subscription = await requirePlan(db, req, res);
    if (!subscription) return;
    const project = await getProject(db, req.user.id, req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    try {
      const row = await insertSqlRow(db, project.id, req.params.table, req.body?.row, subscription);
      res.status(201).json(row);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not save table row.' });
    }
  });

  app.put('/api/iyonicdb/projects/:projectId/tables/:table/rows/:rowId', authenticateToken, async (req, res) => {
    const subscription = await requirePlan(db, req, res);
    if (!subscription) return;
    const project = await getProject(db, req.user.id, req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    try {
      const row = await updateSqlRow(db, project.id, req.params.table, req.params.rowId, req.body?.row, subscription);
      res.json(row);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not update table row.' });
    }
  });

  app.delete('/api/iyonicdb/projects/:projectId/tables/:table/rows/:rowId', authenticateToken, async (req, res) => {
    const subscription = await requirePlan(db, req, res);
    if (!subscription) return;
    const project = await getProject(db, req.user.id, req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!identifierPattern.test(req.params.table)) return res.status(400).json({ message: 'Invalid table name.' });
    try {
      const result = await db.query(
        `DELETE FROM ${quoteIdentifier(schemaForProject(project.id))}.${quoteIdentifier(req.params.table)}
         WHERE id = $1 RETURNING id`,
        [req.params.rowId]
      );
      if (!result.rowCount) return res.status(404).json({ message: 'Row not found.' });
      res.json({ deleted: true, id: result.rows[0].id });
    } catch (error) {
      if (error.code === '42P01') return res.status(404).json({ message: 'Table not found in this project.' });
      console.error('IyonicDB row deletion failed:', error);
      res.status(500).json({ message: 'Could not delete this table row.' });
    }
  });

  app.get('/api/iyonicdb/projects/:projectId/documents/:collection', authenticateToken, async (req, res) => {
    if (!await requirePlan(db, req, res)) return;
    const project = await getProject(db, req.user.id, req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!identifierPattern.test(req.params.collection)) return res.status(400).json({ message: 'Invalid collection name.' });
    try {
      const result = await db.query(
        `SELECT id, document, created_at, updated_at FROM ${quoteIdentifier(schemaForProject(project.id))}.${quoteIdentifier('iyonicdb_documents')}
         WHERE project_id = $1 AND collection = $2 ORDER BY created_at DESC LIMIT 200`,
        [project.id, req.params.collection]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('IyonicDB document listing failed:', error);
      res.status(500).json({ message: 'Could not load this document collection.' });
    }
  });

  app.post('/api/iyonicdb/projects/:projectId/documents/:collection', authenticateToken, async (req, res) => {
    const subscription = await requirePlan(db, req, res);
    if (!subscription) return;
    const project = await getProject(db, req.user.id, req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!identifierPattern.test(req.params.collection) || !req.body?.document || Array.isArray(req.body.document) || typeof req.body.document !== 'object') {
      return res.status(400).json({ message: 'Provide a valid collection and JSON object document.' });
    }
    try {
      const document = await insertDocument(db, project.id, req.params.collection, req.body.document, subscription);
      res.status(201).json(document);
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      console.error('IyonicDB document creation failed:', error);
      res.status(500).json({ message: 'Could not save the document.' });
    }
  });

  app.put('/api/iyonicdb/projects/:projectId/documents/:collection/:documentId', authenticateToken, async (req, res) => {
    const subscription = await requirePlan(db, req, res);
    if (!subscription) return;
    const project = await getProject(db, req.user.id, req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!identifierPattern.test(req.params.collection) || !req.body?.document || Array.isArray(req.body.document) || typeof req.body.document !== 'object') {
      return res.status(400).json({ message: 'Provide a valid collection and JSON object document.' });
    }
    try {
      const document = await updateDocument(db, project.id, req.params.collection, req.params.documentId, req.body.document, subscription);
      res.json(document);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not update document.' });
    }
  });

  app.delete('/api/iyonicdb/projects/:projectId/documents/:collection/:documentId', authenticateToken, async (req, res) => {
    if (!await requirePlan(db, req, res)) return;
    const project = await getProject(db, req.user.id, req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!identifierPattern.test(req.params.collection)) return res.status(400).json({ message: 'Invalid collection name.' });
    try {
      const result = await db.query(
        `DELETE FROM ${quoteIdentifier(schemaForProject(project.id))}.${quoteIdentifier('iyonicdb_documents')}
         WHERE id = $1 AND project_id = $2 AND collection = $3 RETURNING id`,
        [req.params.documentId, project.id, req.params.collection]
      );
      if (!result.rowCount) return res.status(404).json({ message: 'Document not found.' });
      res.json({ deleted: true, id: result.rows[0].id });
    } catch (error) {
      console.error('IyonicDB document delete failed:', error);
      res.status(500).json({ message: 'Could not delete this document.' });
    }
  });

  app.get('/api/iyonicdb/keys', authenticateToken, async (req, res) => {
    try {
      const result = await db.query(
        `SELECT k.id, k.project_id, p.name AS project_name, k.name, k.key_prefix, k.created_at, k.last_used_at, k.revoked_at
         FROM iyonicdb_api_keys k JOIN iyonicdb_projects p ON p.id = k.project_id
         WHERE k.user_id = $1 ORDER BY k.created_at DESC`,
        [req.user.id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('IyonicDB API key listing failed:', error);
      res.status(500).json({ message: 'Could not load API keys.' });
    }
  });

  app.post('/api/iyonicdb/keys', authenticateToken, async (req, res) => {
    const projectId = req.body?.projectId;
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 64) return res.status(400).json({ message: 'Key name must contain 1 to 64 characters.' });
    if (!await requirePlan(db, req, res)) return;
    const project = await getProject(db, req.user.id, projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    const key = `idb_live_${nanoid(40)}`;
    try {
      const result = await db.query(
        `INSERT INTO iyonicdb_api_keys (user_id, project_id, name, key_prefix, key_hash)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, key_prefix, created_at`,
        [req.user.id, project.id, name, key.slice(0, 17), hashKey(key)]
      );
      res.status(201).json({ ...result.rows[0], secret: key });
    } catch (error) {
      console.error('IyonicDB API key creation failed:', error);
      res.status(500).json({ message: 'Could not create the API key.' });
    }
  });

  app.post('/api/iyonicdb/keys/:keyId/revoke', authenticateToken, async (req, res) => {
    try {
      const result = await db.query(
        `UPDATE iyonicdb_api_keys SET revoked_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL RETURNING id`,
        [req.params.keyId, req.user.id]
      );
      if (!result.rowCount) return res.status(404).json({ message: 'Active API key not found.' });
      res.json({ revoked: true, id: result.rows[0].id });
    } catch (error) {
      console.error('IyonicDB API key revocation failed:', error);
      res.status(500).json({ message: 'Could not revoke this API key.' });
    }
  });

  app.post('/api/iyonicdb/billing/initialize', authenticateToken, async (req, res) => {
    const plan = PLANS[req.body?.planId];
    if (!plan) return res.status(400).json({ message: 'Choose a valid IyonicDB plan.' });
    if (!process.env.PAYSTACK_SECRET_KEY) return res.status(503).json({ message: 'Billing is unavailable because the payment provider is not configured.' });
    try {
      const user = await db.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
      if (!user.rows[0]?.email) return res.status(422).json({ message: 'An account email is required for checkout.' });
      const gateway = Paystack(process.env.PAYSTACK_SECRET_KEY);
      const callbackUrl = `${process.env.VITE_APP_URL || process.env.APP_URL || 'http://localhost:4000'}/#/iyonicdb/console?billing=verify`;
      const payment = await new Promise((resolve, reject) => gateway.transaction.initialize({
        email: user.rows[0].email,
        amount: Math.round(plan.price * 100),
        currency: plan.currency,
        channels: ['card', 'mobile_money'],
        callback_url: callbackUrl,
        metadata: { type: 'iyonicdb_subscription', userId: req.user.id, planId: plan.id },
      }, (error, body) => error ? reject(error) : resolve(body)));
      if (!payment?.status || !payment.data?.reference || !payment.data?.authorization_url) {
        return res.status(502).json({ message: 'The payment provider did not return a checkout session.' });
      }
      await db.query(
        `INSERT INTO iyonicdb_payment_attempts (reference, user_id, plan_id, amount, currency)
         VALUES ($1, $2, $3, $4, $5)`,
        [payment.data.reference, req.user.id, plan.id, plan.price, plan.currency]
      );
      res.json({ authorizationUrl: payment.data.authorization_url, reference: payment.data.reference });
    } catch (error) {
      console.error('IyonicDB payment initialization failed:', error);
      res.status(500).json({ message: 'Could not start IyonicDB checkout.' });
    }
  });

  app.post('/api/iyonicdb/billing/verify', authenticateToken, async (req, res) => {
    const reference = req.body?.reference;
    if (typeof reference !== 'string' || reference.length > 255) return res.status(400).json({ message: 'A valid payment reference is required.' });
    if (!process.env.PAYSTACK_SECRET_KEY) return res.status(503).json({ message: 'Billing is unavailable because the payment provider is not configured.' });
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const attempt = await client.query(
        'SELECT * FROM iyonicdb_payment_attempts WHERE reference = $1 AND user_id = $2 FOR UPDATE',
        [reference, req.user.id]
      );
      if (!attempt.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Payment attempt not found.' });
      }
      if (attempt.rows[0].status === 'completed') {
        const subscription = await getCurrentSubscription(db, req.user.id, client);
        await client.query('COMMIT');
        return res.json({ subscription });
      }
      const plan = PLANS[attempt.rows[0].plan_id];
      const gateway = Paystack(process.env.PAYSTACK_SECRET_KEY);
      const payment = await new Promise((resolve, reject) => gateway.transaction.verify(reference, (error, body) => error ? reject(error) : resolve(body)));
      if (!payment?.status || payment.data?.status !== 'success') {
        await client.query('ROLLBACK');
        return res.status(402).json({ message: 'Payment has not completed.' });
      }
      const account = await client.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
      if (
        Number(payment.data.amount) !== Math.round(attempt.rows[0].amount * 100)
        || payment.data.currency !== attempt.rows[0].currency
        || payment.data.reference !== reference
        || payment.data.customer?.email?.toLowerCase() !== account.rows[0]?.email?.toLowerCase()
        || payment.data.metadata?.userId !== req.user.id
        || payment.data.metadata?.planId !== plan.id
      ) {
        await client.query('ROLLBACK');
        return res.status(402).json({ message: 'The verified payment does not match the selected IyonicDB plan.' });
      }
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setUTCDate(periodEnd.getUTCDate() + 30);
      await client.query(
        `INSERT INTO iyonicdb_subscriptions (user_id, plan_id, status, current_period_start, current_period_end, payment_reference)
         VALUES ($1, $2, 'active', $3, $4, $5)`,
        [req.user.id, plan.id, now, periodEnd, reference]
      );
      await client.query(
        `UPDATE iyonicdb_payment_attempts SET status = 'completed', completed_at = CURRENT_TIMESTAMP
         WHERE reference = $1`,
        [reference]
      );
      await client.query('COMMIT');
      res.json({ subscription: { ...safePlan(plan), status: 'active', currentPeriodEnd: periodEnd } });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('IyonicDB payment verification failed:', error);
      res.status(500).json({ message: 'Could not verify IyonicDB payment.' });
    } finally {
      client.release();
    }
  });

  const authenticateKey = authenticateIyonicDbKey(db);
  app.post('/api/iyonicdb/v1/projects/:projectId/query', authenticateKey, async (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    try {
      const result = await runSqlSelect(db, req.params.projectId, req.body?.sql, req.body?.params || []);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.status ? error.message : 'The SQL query could not be executed.' });
    }
  });

  app.get('/api/iyonicdb/v1/projects/:projectId/tables/:table/rows', authenticateKey, async (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    if (!identifierPattern.test(req.params.table)) return res.status(400).json({ message: 'Invalid table name.' });
    try {
      const result = await db.query(
        `SELECT * FROM ${quoteIdentifier(schemaForProject(req.params.projectId))}.${quoteIdentifier(req.params.table)}
         ORDER BY ${quoteIdentifier('created_at')} DESC LIMIT 200`
      );
      res.json(result.rows);
    } catch (error) {
      if (error.code === '42P01') return res.status(404).json({ message: 'Table not found in this project.' });
      console.error('IyonicDB API row listing failed:', error);
      res.status(500).json({ message: 'Could not load table rows.' });
    }
  });

  app.post('/api/iyonicdb/v1/projects/:projectId/tables/:table/rows', authenticateKey, async (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    try {
      const row = await insertSqlRow(db, req.params.projectId, req.params.table, req.body?.row, req.iyonicDbKey.subscription);
      res.status(201).json(row);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not save table row.' });
    }
  });

  app.put('/api/iyonicdb/v1/projects/:projectId/tables/:table/rows/:rowId', authenticateKey, async (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    try {
      const row = await updateSqlRow(db, req.params.projectId, req.params.table, req.params.rowId, req.body?.row, req.iyonicDbKey.subscription);
      res.json(row);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not update table row.' });
    }
  });

  app.delete('/api/iyonicdb/v1/projects/:projectId/tables/:table/rows/:rowId', authenticateKey, async (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    if (!identifierPattern.test(req.params.table)) return res.status(400).json({ message: 'Invalid table name.' });
    try {
      const result = await db.query(
        `DELETE FROM ${quoteIdentifier(schemaForProject(req.params.projectId))}.${quoteIdentifier(req.params.table)}
         WHERE id = $1 RETURNING id`,
        [req.params.rowId]
      );
      if (!result.rowCount) return res.status(404).json({ message: 'Row not found.' });
      res.json({ deleted: true, id: result.rows[0].id });
    } catch (error) {
      if (error.code === '42P01') return res.status(404).json({ message: 'Table not found in this project.' });
      console.error('IyonicDB API row deletion failed:', error);
      res.status(500).json({ message: 'Could not delete this table row.' });
    }
  });

  app.get('/api/iyonicdb/v1/projects/:projectId/documents/:collection', authenticateKey, async (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    if (!identifierPattern.test(req.params.collection)) return res.status(400).json({ message: 'Invalid collection name.' });
    try {
      const result = await db.query(
        `SELECT id, document, created_at, updated_at FROM ${quoteIdentifier(schemaForProject(req.params.projectId))}.${quoteIdentifier('iyonicdb_documents')}
         WHERE project_id = $1 AND collection = $2 ORDER BY created_at DESC LIMIT 200`,
        [req.params.projectId, req.params.collection]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('IyonicDB API document listing failed:', error);
      res.status(500).json({ message: 'Could not load documents.' });
    }
  });

  app.post('/api/iyonicdb/v1/projects/:projectId/documents/:collection', authenticateKey, async (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    if (!identifierPattern.test(req.params.collection) || !req.body?.document || Array.isArray(req.body.document) || typeof req.body.document !== 'object') {
      return res.status(400).json({ message: 'Provide a valid collection and JSON object document.' });
    }
    try {
      const document = await insertDocument(db, req.params.projectId, req.params.collection, req.body.document, req.iyonicDbKey.subscription);
      res.status(201).json(document);
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      console.error('IyonicDB API document creation failed:', error);
      res.status(500).json({ message: 'Could not save the document.' });
    }
  });

  app.put('/api/iyonicdb/v1/projects/:projectId/documents/:collection/:documentId', authenticateKey, async (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    if (!identifierPattern.test(req.params.collection) || !req.body?.document || Array.isArray(req.body.document) || typeof req.body.document !== 'object') {
      return res.status(400).json({ message: 'Provide a valid collection and JSON object document.' });
    }
    try {
      const document = await updateDocument(db, req.params.projectId, req.params.collection, req.params.documentId, req.body.document, req.iyonicDbKey.subscription);
      res.json(document);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not update document.' });
    }
  });

  app.delete('/api/iyonicdb/v1/projects/:projectId/documents/:collection/:documentId', authenticateKey, async (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    if (!identifierPattern.test(req.params.collection) || !uuidPattern.test(String(req.params.documentId))) {
      return res.status(400).json({ message: 'Invalid collection or document ID.' });
    }
    try {
      const result = await db.query(
        `DELETE FROM ${quoteIdentifier(schemaForProject(req.params.projectId))}.${quoteIdentifier('iyonicdb_documents')}
         WHERE id = $1 AND project_id = $2 AND collection = $3 RETURNING id`,
        [req.params.documentId, req.params.projectId, req.params.collection]
      );
      if (!result.rowCount) return res.status(404).json({ message: 'Document not found.' });
      res.json({ deleted: true, id: result.rows[0].id });
    } catch (error) {
      console.error('IyonicDB API document deletion failed:', error);
      res.status(500).json({ message: 'Could not delete document.' });
    }
  });
};

export const iyonicDbPlans = PLANS;
