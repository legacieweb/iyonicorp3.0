import crypto from 'crypto';
import { nanoid } from 'nanoid';

const PLANS = {
  launch: {
    id: 'launch',
    name: 'Launch',
    price: 10,
    currency: 'USD',
    projectLimit: 3,
    storageBytes: 10 * 1024 ** 3,
    maxPayloadBytes: 25 * 1024 ** 2,
    requestsPerMonth: 2_000_000,
    tableLimit: 25,
    apiKeyLimit: 10,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    price: 35,
    currency: 'USD',
    projectLimit: 5,
    storageBytes: 10 * 1024 ** 3,
    maxPayloadBytes: 50 * 1024 ** 2,
    requestsPerMonth: 10_000_000,
    tableLimit: 50,
    apiKeyLimit: 25,
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    price: 70,
    currency: 'USD',
    projectLimit: 20,
    storageBytes: 50 * 1024 ** 3,
    maxPayloadBytes: 100 * 1024 ** 2,
    requestsPerMonth: 50_000_000,
    tableLimit: 200,
    apiKeyLimit: 100,
  },
};

const IYONICPAY_RATES_TO_USD = { USD: 1, KES: 125, EUR: 0.92, GBP: 0.79, NGN: 1500, GHS: 13 };

const FREE_PLAN = {
  id: 'free',
  name: 'Free',
  price: 0,
  currency: 'USD',
  projectLimit: 1,
  storageBytes: 5 * 1024 ** 3,
  maxPayloadBytes: 10 * 1024 ** 2,
  requestsPerMonth: 100_000,
  tableLimit: 10,
  apiKeyLimit: 2,
  status: 'active',
  currentPeriodEnd: null,
};

const identifierPattern = /^[a-z][a-z0-9_]{0,62}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`;
const schemaForProject = (projectId) => `idb_${String(projectId).replaceAll('-', '')}`;
const hashKey = (key) => crypto.createHash('sha256').update(key).digest('hex');
const splitMigrationSql = (sql) => {
  const statements = [];
  let current = '';
  let state = 'normal';
  let blockDepth = 0;
  let dollarTag = '';
  let escapeString = false;
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];
    if (state === 'line-comment') {
      current += char;
      if (char === '\n') state = 'normal';
      continue;
    }
    if (state === 'block-comment') {
      current += char;
      if (char === '/' && next === '*') { current += next; index += 1; blockDepth += 1; }
      else if (char === '*' && next === '/') { current += next; index += 1; blockDepth -= 1; if (!blockDepth) state = 'normal'; }
      continue;
    }
    if (state === 'single-quote') {
      current += char;
      if (escapeString && char === '\\' && next) { current += next; index += 1; }
      else if (char === "'" && next === "'") { current += next; index += 1; }
      else if (char === "'") state = 'normal';
      continue;
    }
    if (state === 'double-quote') {
      current += char;
      if (char === '"' && next === '"') { current += next; index += 1; }
      else if (char === '"') state = 'normal';
      continue;
    }
    if (state === 'dollar-quote') {
      if (sql.startsWith(dollarTag, index)) { current += dollarTag; index += dollarTag.length - 1; state = 'normal'; }
      else current += char;
      continue;
    }
    if (char === '-' && next === '-') { current += '--'; index += 1; state = 'line-comment'; continue; }
    if (char === '/' && next === '*') { current += '/*'; index += 1; state = 'block-comment'; blockDepth = 1; continue; }
    if (char === "'") {
      escapeString = /(?:^|[^A-Za-z0-9_$])[eE]$/.test(current);
      current += char;
      state = 'single-quote';
      continue;
    }
    if (char === '"') { current += char; state = 'double-quote'; continue; }
    if (char === '$') {
      const tag = sql.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/)?.[0];
      if (tag) { dollarTag = tag; current += tag; index += tag.length - 1; state = 'dollar-quote'; continue; }
    }
    if (char === ';') {
      if (current.trim() && maskMigrationSql(current).trim()) statements.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (['single-quote', 'double-quote', 'dollar-quote', 'block-comment'].includes(state)) {
    throw Object.assign(new Error('The migration contains an unterminated SQL string, identifier, or comment.'), { status: 400 });
  }
  if (current.trim() && maskMigrationSql(current).trim()) statements.push(current.trim());
  if (!statements.length) throw Object.assign(new Error('Provide at least one SQL migration statement.'), { status: 400 });
  if (statements.length > 100) throw Object.assign(new Error('A migration may contain at most 100 statements.'), { status: 413 });
  return statements;
};

const maskMigrationSql = (sql) => {
  let output = '';
  let state = 'normal';
  let blockDepth = 0;
  let dollarTag = '';
  let escapeString = false;
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];
    if (state === 'line-comment') {
      output += char === '\n' ? '\n' : ' ';
      if (char === '\n') state = 'normal';
      continue;
    }
    if (state === 'block-comment') {
      output += char === '\n' ? '\n' : ' ';
      if (char === '/' && next === '*') { output += ' '; index += 1; blockDepth += 1; }
      else if (char === '*' && next === '/') { output += ' '; index += 1; blockDepth -= 1; if (!blockDepth) state = 'normal'; }
      continue;
    }
    if (state === 'single-quote') {
      output += char === '\n' ? '\n' : ' ';
      if (escapeString && char === '\\' && next) { output += next === '\n' ? '\n' : ' '; index += 1; }
      else if (char === "'" && next === "'") { output += ' '; index += 1; }
      else if (char === "'") { state = 'normal'; escapeString = false; }
      continue;
    }
    if (state === 'dollar-quote') {
      if (sql.startsWith(dollarTag, index)) { output += ' '.repeat(dollarTag.length); index += dollarTag.length - 1; state = 'normal'; }
      else output += char === '\n' ? '\n' : ' ';
      continue;
    }
    if (char === '-' && next === '-') { output += '  '; index += 1; state = 'line-comment'; continue; }
    if (char === '/' && next === '*') { output += '  '; index += 1; state = 'block-comment'; blockDepth = 1; continue; }
    if (state === 'double-quote') {
      output += char;
      if (char === '"' && next === '"') { output += next; index += 1; }
      else if (char === '"') state = 'normal';
      continue;
    }
    if (char === "'") { escapeString = /(?:^|[^A-Za-z0-9_$])[eE]$/.test(sql.slice(0, index)); output += ' '; state = 'single-quote'; continue; }
    if (char === '"') { output += char; state = 'double-quote'; continue; }
    if (char === '$') {
      const tag = sql.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/)?.[0];
      if (tag) { dollarTag = tag; output += ' '.repeat(tag.length); index += tag.length - 1; state = 'dollar-quote'; continue; }
    }
    output += char;
  }
  return output;
};

const validateMigrationStatements = (statements) => {
  const allowedStart = /^(?:CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX|TYPE|SEQUENCE|DOMAIN)|ALTER\s+(?:TABLE|TYPE|SEQUENCE|DOMAIN)|DROP\s+(?:TABLE|INDEX|TYPE|SEQUENCE|DOMAIN))\b/i;
  const qualifiedName = /(?:[A-Za-z_][A-Za-z0-9_$]*|"(?:""|[^"])+")\s*\.\s*(?:[A-Za-z_][A-Za-z0-9_$]*|"(?:""|[^"])+")/;
  for (const statement of statements) {
    const code = maskMigrationSql(statement).trim();
    if (!allowedStart.test(code)) {
      throw Object.assign(new Error('Migrations may only create, alter, or drop tables, indexes, types, sequences, and domains.'), { status: 400 });
    }
    if (qualifiedName.test(code) || /\bSET\s+SCHEMA\b/i.test(code)) {
      throw Object.assign(new Error('Schema-qualified names and moving objects between schemas are not allowed. Migrations are automatically scoped to this API key’s project.'), { status: 400 });
    }
    if (/\biyonicdb_documents\b/i.test(code)) {
      throw Object.assign(new Error('The internal IyonicDB document storage table cannot be changed by migrations.'), { status: 400 });
    }
    if (/\b(?:nextval|currval|setval|pg_sleep|pg_read_file|pg_read_binary_file|pg_write_file|pg_write_binary_file|pg_ls_dir|lo_import|lo_export|set_config)\s*\(/i.test(code)) {
      throw Object.assign(new Error('This migration uses a database function that IyonicDB does not allow.'), { status: 400 });
    }
    if (/\b(?:CONCURRENTLY|TABLESPACE|OWNER\s+TO|SECURITY\s+DEFINER|CASCADE\s+TO)\b/i.test(code)) {
      throw Object.assign(new Error('This migration uses a database-wide or non-transactional option that IyonicDB does not allow.'), { status: 400 });
    }
  }
};

const normalizeMigrationRequest = (body) => {
  const source = body?.migration && typeof body.migration === 'object' && !Array.isArray(body.migration)
    ? body.migration
    : body;
  const rawStatements = source?.statements;
  const sql = typeof source?.sql === 'string'
    ? source.sql.trim()
    : Array.isArray(rawStatements) && rawStatements.every((statement) => typeof statement === 'string')
      ? rawStatements.join(';\n').trim()
      : '';
  const rawName = source?.name || source?.filename || source?.fileName || body?.name || body?.filename;
  const name = typeof rawName === 'string'
    ? rawName.trim().split(/[\\/]/).pop().replace(/\.sql$/i, '')
    : '';
  return { name, sql, dryRun: source?.dryRun === true || source?.dry_run === true || body?.dryRun === true || body?.dry_run === true };
};

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
    return { ...safePlan(FREE_PLAN) };
  }
  const plan = PLANS[row.plan_id];
  return plan ? { ...safePlan(plan), status: row.status, currentPeriodEnd: row.current_period_end } : { ...safePlan(FREE_PLAN) };
};

const getProjectInventory = async (client, projectId) => {
  const schema = schemaForProject(projectId);
  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> 'iyonicdb_documents'
     ORDER BY table_name`,
    [schema]
  );
  const counts = await Promise.all(tables.rows.map(async ({ table_name }) => {
    const result = await client.query(`SELECT count(*)::int AS count FROM ${quoteIdentifier(schema)}.${quoteIdentifier(table_name)}`);
    return Number(result.rows[0]?.count || 0);
  }));
  const documents = await client.query(
    `SELECT count(*)::int AS count FROM ${quoteIdentifier(schema)}.${quoteIdentifier('iyonicdb_documents')}`
  );
  return { tablesCount: tables.rowCount, recordsCount: counts.reduce((total, count) => total + count, Number(documents.rows[0]?.count || 0)) };
};

const PRODUCT_ACCOUNTS = {
  bizhub: { name: 'BizHub', tables: ['sellers', 'products', 'categories', 'customers', 'orders', 'refund_requests', 'reviews', 'discounts', 'messages', 'social_media_accounts', 'social_media_posts', 'vip_theme_purchases', 'vip_theme_offers'], tablePrefixes: ['products', 'categories', 'customers', 'orders', 'refund_requests', 'reviews', 'discounts', 'messages', 'social_media_', 'vip_theme_'] },
  iyonicpay: { name: 'IyonicPay', tables: ['wallets', 'transactions', 'invoices', 'withdrawals'] },
  iyonicintelligence: { name: 'Iyonic Intelligence', tables: ['bots', 'bot_knowledge_documents', 'bot_faqs', 'bot_conversations', 'bot_messages', 'bot_knowledge_gaps'], tablePrefixes: ['bot_'] },
  'iyonic-mailer': { name: 'IyonicMailer', tables: ['email_marketing_settings', 'email_campaigns', 'email_templates'], tablePrefixes: ['email_marketing_'] },
  nlmsongs: { name: 'NLM', tables: ['nlm_songs', 'nlm_subscription_plans', 'nlm_access_features'], tablePrefixes: ['nlm_'] },
  ixstream: { name: 'IxStream', tables: ['ixstream_content', 'ixstream_subscription_plans', 'ixstream_subscriptions'], tablePrefixes: ['ixstream_'] },
  iyonicpos: { name: 'Apex POS', tables: ['pos_employees', 'pos_tables', 'pos_shifts', 'pos_inventory', 'pos_inventory_adjustments', 'pos_loyalty', 'pos_event_log', 'pos_loyalty_transactions'], tablePrefixes: ['pos_'] },
};
const sensitiveAccountField = /(password|secret|credential|access.?token|refresh.?token|authorization|api.?key|private.?key|pin_hash|bank.?details|smtp.?user)/i;
const sanitizeAccountValue = (value) => {
  if (Array.isArray(value)) return value.map(sanitizeAccountValue);
  if (value && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !sensitiveAccountField.test(key))
      .map(([key, child]) => [key, sanitizeAccountValue(child)]));
  }
  return value;
};

const getAccountTable = async (db, tableName) => {
  const result = await db.query(
    `SELECT table_schema
     FROM information_schema.tables
     WHERE table_name = $1
       AND table_type = 'BASE TABLE'
       AND table_schema = ANY(current_schemas(false)::text[])
     ORDER BY array_position(current_schemas(false)::text[], table_schema)
     LIMIT 1`,
    [tableName]
  );
  const schema = result.rows[0]?.table_schema;
  return schema ? { schema, reference: `${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}` } : null;
};
const getAccountRelation = async (db, tableName) => (await getAccountTable(db, tableName))?.reference || null;

const getProductTables = async (db, productKey) => {
  const product = PRODUCT_ACCOUNTS[productKey];
  if (!product) return [];
  const specialSellerScopedTables = productKey === 'bizhub' ? ['reviews'] : productKey === 'iyonicpos' ? ['pos_loyalty_transactions'] : [];
  const result = await db.query(
    `SELECT t.table_name
     FROM information_schema.tables t
     WHERE t.table_type = 'BASE TABLE'
       AND t.table_schema = ANY(current_schemas(false)::text[])
       AND (t.table_name = ANY($1::text[]) OR EXISTS (
         SELECT 1 FROM unnest($2::text[]) AS prefix(value) WHERE starts_with(t.table_name, prefix.value)
       ))
       AND (EXISTS (
         SELECT 1 FROM information_schema.columns c
         WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name AND c.column_name = 'seller_id'
       ) OR t.table_name = ANY($3::text[]))
     ORDER BY t.table_name`,
    [product.tables, product.tablePrefixes || [], specialSellerScopedTables]
  );
  return [...new Set([...product.tables, ...result.rows.map((row) => row.table_name)])];
};

const getAccountMedia = async (db, productKey, accountId, userId, includeRecords = true) => {
  const names = ['iyonic_media_assets', ...(productKey === 'bizhub' ? ['products', 'sellers', 'social_media_posts'] : []), ...(productKey === 'iyonicintelligence' ? ['bot_knowledge_documents'] : []), ...(productKey === 'iyonic-mailer' ? ['email_templates'] : []), ...(productKey === 'nlmsongs' ? ['nlm_songs'] : [])];
  const relations = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await getAccountRelation(db, name)])));
  const relation = (name) => relations[name];
  if (!relation('iyonic_media_assets')) return includeRecords ? [] : 0;
  const uploadScope = productKey === 'iyonicpay' || accountId === userId
    ? 'seller_id IS NULL AND user_id = $1::uuid'
    : 'seller_id = $2::uuid AND $1::uuid IS NOT NULL';
  const sources = [
    `SELECT url, original_name AS "originalName", mime_type AS "mimeType", media_type AS "mediaType", size_bytes AS "sizeBytes", created_at AS "createdAt", 'uploads' AS source
     FROM ${relation('iyonic_media_assets')} WHERE ${uploadScope}`,
  ];
  if (productKey === 'bizhub' && relation('products') && relation('sellers') && relation('social_media_posts')) sources.push(
    `SELECT unnest(COALESCE(images, ARRAY[]::text[])) AS url, name AS "originalName", NULL::text AS "mimeType", 'image' AS "mediaType", 0::bigint AS "sizeBytes", created_at AS "createdAt", 'products' AS source FROM ${relation('products')} WHERE seller_id = $2::uuid`,
    `SELECT unnest(COALESCE(videos, ARRAY[]::text[])) AS url, name AS "originalName", NULL::text AS "mimeType", 'video' AS "mediaType", 0::bigint AS "sizeBytes", created_at AS "createdAt", 'products' AS source FROM ${relation('products')} WHERE seller_id = $2::uuid`,
    `SELECT logo AS url, store_name AS "originalName", NULL::text AS "mimeType", 'image' AS "mediaType", 0::bigint AS "sizeBytes", updated_at AS "createdAt", 'store branding' AS source FROM ${relation('sellers')} WHERE id = $2::uuid AND logo IS NOT NULL AND logo <> ''`,
    `SELECT image_url AS url, left(content, 80) AS "originalName", NULL::text AS "mimeType", 'image' AS "mediaType", 0::bigint AS "sizeBytes", created_at AS "createdAt", 'social posts' AS source FROM ${relation('social_media_posts')} WHERE seller_id = $2::uuid AND image_url IS NOT NULL AND image_url <> ''`
  );
  if (productKey === 'iyonicintelligence' && relation('bot_knowledge_documents')) sources.push(
    `SELECT source_url AS url, title AS "originalName", 'application/octet-stream' AS "mimeType", 'document' AS "mediaType", 0::bigint AS "sizeBytes", created_at AS "createdAt", 'knowledge documents' AS source FROM ${relation('bot_knowledge_documents')} WHERE seller_id = $2::uuid AND source_url IS NOT NULL AND source_url <> ''`
  );
  if (productKey === 'iyonic-mailer' && relation('email_templates')) sources.push(
    `SELECT preview_image AS url, name AS "originalName", NULL::text AS "mimeType", 'image' AS "mediaType", 0::bigint AS "sizeBytes", created_at AS "createdAt", 'email templates' AS source FROM ${relation('email_templates')} WHERE seller_id = $2::uuid AND preview_image IS NOT NULL AND preview_image <> ''`
  );
  if (productKey === 'nlmsongs' && relation('nlm_songs')) sources.push(
    `SELECT audio_url AS url, title AS "originalName", audio_mime_type AS "mimeType", 'audio' AS "mediaType", COALESCE(octet_length(audio_data), 0)::bigint AS "sizeBytes", created_at AS "createdAt", 'NLM audio' AS source FROM ${relation('nlm_songs')} WHERE (seller_id = $2::uuid OR ($2::uuid = $1::uuid AND seller_id IS NULL AND created_by = $1::uuid)) AND audio_url IS NOT NULL AND audio_url <> ''`,
    `SELECT thumbnail_url AS url, title AS "originalName", thumbnail_mime_type AS "mimeType", 'image' AS "mediaType", COALESCE(octet_length(thumbnail_data), 0)::bigint AS "sizeBytes", created_at AS "createdAt", 'NLM artwork' AS source FROM ${relation('nlm_songs')} WHERE (seller_id = $2::uuid OR ($2::uuid = $1::uuid AND seller_id IS NULL AND created_by = $1::uuid)) AND thumbnail_url IS NOT NULL AND thumbnail_url <> ''`
  );
  const union = sources.map((source) => `(${source})`).join(' UNION ALL ');
  const params = productKey === 'iyonicpay' ? [userId] : [userId, accountId];
  if (!includeRecords) {
    const count = await db.query(`SELECT count(DISTINCT url)::int AS count FROM (${union}) media WHERE url IS NOT NULL AND url <> ''`, params);
    return Number(count.rows[0]?.count || 0);
  }
  const result = await db.query(
    `SELECT DISTINCT ON (url) url, "originalName", "mimeType", "mediaType", COALESCE("sizeBytes", 0) AS "sizeBytes", "createdAt", source
     FROM (${union}) media WHERE url IS NOT NULL AND url <> '' ORDER BY url, "createdAt" DESC NULLS LAST LIMIT 1000`,
    params
  );
  return result.rows.map((row) => ({
    ...row,
    id: row.url,
    originalName: row.originalName || String(row.url).split('/').pop() || 'Media file',
    mediaType: row.mediaType || 'other',
    mimeType: row.mimeType || '',
    sizeBytes: Number(row.sizeBytes || 0),
  }));
};

const getAccountMediaStorageBytes = async (db, productKey, accountId, userId, includePersonalUploads = true) => {
  const assets = await getAccountRelation(db, 'iyonic_media_assets');
  const songs = productKey === 'nlmsongs' ? await getAccountRelation(db, 'nlm_songs') : null;
  const sources = [];
  const params = accountId === userId ? [userId] : [userId, accountId];
  if (assets && (accountId !== userId || includePersonalUploads)) {
    const scope = accountId === userId ? 'seller_id IS NULL AND user_id = $1::uuid' : 'seller_id = $2::uuid AND $1::uuid IS NOT NULL';
    sources.push(`SELECT url, GREATEST(size_bytes, 0)::bigint AS size_bytes FROM ${assets} WHERE ${scope}`);
  }
  if (songs) {
    const personalScope = accountId === userId ? 'seller_id IS NULL AND created_by = $1::uuid' : 'seller_id = $2::uuid';
    sources.push(`SELECT COALESCE(audio_url, id::text || ':audio') AS url, COALESCE(octet_length(audio_data), 0)::bigint AS size_bytes FROM ${songs} WHERE ${personalScope} AND audio_data IS NOT NULL`);
    sources.push(`SELECT COALESCE(thumbnail_url, id::text || ':thumbnail') AS url, COALESCE(octet_length(thumbnail_data), 0)::bigint AS size_bytes FROM ${songs} WHERE ${personalScope} AND thumbnail_data IS NOT NULL`);
  }
  if (!sources.length) return 0;
  const result = await db.query(
    `SELECT COALESCE(SUM(size_bytes), 0)::bigint AS bytes
     FROM (SELECT url, MAX(size_bytes) AS size_bytes FROM (${sources.join(' UNION ALL ')}) media
           WHERE url IS NOT NULL GROUP BY url) unique_media`,
    params
  );
  return Number(result.rows[0]?.bytes || 0);
};

const getProductDataset = async (db, productKey, table, accountId, userId, isSellerWorkspace, includeRecords = true, limit = 200, offset = 0) => {
  const product = PRODUCT_ACCOUNTS[productKey];
  if (!product || (!product.tables.includes(table) && !(product.tablePrefixes || []).some((prefix) => table.startsWith(prefix)))) return { name: table, records: [], count: 0 };
  const tableInfo = await getAccountTable(db, table);
  const tableRelation = tableInfo?.reference;
  if (!tableRelation) return { name: table, records: [], count: 0, error: 'This data set is not available in the connected database.' };
  const columns = await db.query(
    'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
    [tableInfo.schema, table]
  );
  const available = new Set(columns.rows.map((row) => row.column_name));
  let from = tableRelation;
  let where;
  let params;
  if (table === 'sellers') {
    where = 'id = $1';
    params = [accountId];
  } else if (productKey === 'iyonicpay' && table === 'transactions') {
    from = `${tableRelation} t`;
    where = 't.sender_wallet_id IN (SELECT id FROM wallets WHERE user_id = $1) OR t.receiver_wallet_id IN (SELECT id FROM wallets WHERE user_id = $1)';
    params = [userId];
  } else if (productKey === 'bizhub' && table === 'reviews' && isSellerWorkspace) {
    const productsRelation = await getAccountRelation(db, 'products');
    if (!productsRelation) return { name: table, records: [], count: 0, error: 'Product review data is not available.' };
    from = `${tableRelation} r JOIN ${productsRelation} p ON p.id = r.product_id`;
    where = 'p.seller_id = $1';
    params = [accountId];
  } else if (productKey === 'nlmsongs' && table === 'nlm_songs') {
    where = isSellerWorkspace ? 'seller_id = $1' : 'seller_id IS NULL AND created_by = $1';
    params = [accountId];
  } else if (productKey === 'iyonicpos' && table === 'pos_loyalty_transactions' && isSellerWorkspace) {
    const loyaltyRelation = await getAccountRelation(db, 'pos_loyalty');
    if (!loyaltyRelation) return { name: table, records: [], count: 0, error: 'POS loyalty data is not available.' };
    from = `${tableRelation} t JOIN ${loyaltyRelation} l ON l.id = t.loyalty_id`;
    where = 'l.seller_id = $1';
    params = [accountId];
  } else if (productKey === 'iyonicintelligence' && table === 'bot_messages' && isSellerWorkspace) {
    const conversationsRelation = await getAccountRelation(db, 'bot_conversations');
    if (!conversationsRelation) return { name: table, records: [], count: 0, error: 'Conversation data is not available.' };
    from = `${tableRelation} m JOIN ${conversationsRelation} c ON c.id = m.conversation_id`;
    where = 'c.seller_id = $1';
    params = [accountId];
  } else {
    const ownerColumn = isSellerWorkspace && available.has('seller_id') ? 'seller_id'
      : !isSellerWorkspace && available.has('user_id') ? 'user_id'
        : !isSellerWorkspace && available.has('created_by') ? 'created_by' : null;
    if (!ownerColumn) return { name: table, records: [], count: 0 };
    where = `${quoteIdentifier(ownerColumn)} = $1`;
    params = [accountId];
  }
  const countResult = await db.query(`SELECT count(*)::int AS count FROM ${from} WHERE ${where}`, params);
  const count = Number(countResult.rows[0]?.count || 0);
  if (!includeRecords) return { name: table, records: [], count };
  const orderColumn = ['created_at', 'updated_at', 'id'].find((column) => available.has(column));
  const orderAlias = table === 'transactions' || table === 'pos_loyalty_transactions' ? 't.' : table === 'bot_messages' ? 'm.' : table === 'reviews' ? 'r.' : '';
  const tieBreaker = available.has('id') && orderColumn !== 'id' ? `${orderAlias}${quoteIdentifier('id')} ASC` : '';
  const orderBy = [orderColumn ? `${orderAlias}${quoteIdentifier(orderColumn)} DESC` : '', tieBreaker].filter(Boolean).join(', ');
  const select = table === 'bot_messages' ? 'm.*' : table === 'transactions' || table === 'pos_loyalty_transactions' ? 't.*' : table === 'reviews' ? 'r.*'
    : table === 'nlm_songs' ? [...available].filter((column) => !['audio_data', 'thumbnail_data'].includes(column)).map(quoteIdentifier).join(', ') : '*';
  const result = await db.query(`SELECT ${select} FROM ${from} WHERE ${where}${orderBy ? ` ORDER BY ${orderBy}` : ''} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
  const records = result.rows.map(sanitizeAccountValue);
  return { name: table, records, count };
};

const getConnectedProductProjects = async (db, userId, accountEmail) => {
  const access = await db.query(
    `SELECT a.product_key FROM user_product_access a
     JOIN users u ON u.id = a.user_id
     WHERE LOWER(u.email) = LOWER($1) AND a.product_key = ANY($2::text[])`,
    [accountEmail, Object.keys(PRODUCT_ACCOUNTS)]
  );
  const optedProducts = new Set(access.rows.map((row) => row.product_key));
  const sellers = await db.query(
    `SELECT DISTINCT s.id, s.store_name, s.created_at, s.theme FROM sellers s
     LEFT JOIN users owner ON owner.id = s.user_id
     LEFT JOIN seller_managers sm ON sm.id = s.manager_id
     LEFT JOIN users manager ON manager.id = sm.user_id
     WHERE LOWER(owner.email) = LOWER($1) OR LOWER(manager.email) = LOWER($1)
     ORDER BY s.created_at`,
    [accountEmail]
  );
  const profile = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
  const workspaces = [];
  for (const seller of sellers.rows) {
    const isNlmStore = String(seller.theme?.selectedTheme || '').toLowerCase() === 'nlmsongs';
    const selectedTheme = String(seller.theme?.selectedTheme || '').toLowerCase();
    const themeProduct = isNlmStore ? 'nlmsongs' : selectedTheme === 'ixstream' ? 'ixstream' : 'bizhub';
    const productKeys = [themeProduct, ...['bizhub', 'iyonicintelligence', 'iyonic-mailer', 'ixstream', 'iyonicpos', 'nlmsongs'].filter((key) => key !== themeProduct)];
    for (const productKey of productKeys) {
      const product = PRODUCT_ACCOUNTS[productKey];
      const tables = await getProductTables(db, productKey);
      const sets = await Promise.all(tables.map((table) => getProductDataset(db, productKey, table, seller.id, userId, true, false)));
      const recordsCount = sets.reduce((total, set) => total + set.count, 0);
      const mediaCount = await getAccountMedia(db, productKey, seller.id, userId, false);
      if (productKey !== themeProduct && !optedProducts.has(productKey) && !recordsCount) continue;
      workspaces.push({ id: `account:${productKey}:${seller.id}`, name: `${product.name} · ${seller.store_name}`, createdAt: null, tablesCount: sets.filter((set) => set.count > 0).length + (mediaCount ? 1 : 0), recordsCount, mediaCount, storageBytes: 0, isProductAccount: true, productKey, accountId: seller.id, accountName: seller.store_name });
    }
  }
  const paySets = await Promise.all(PRODUCT_ACCOUNTS.iyonicpay.tables.map((table) => getProductDataset(db, 'iyonicpay', table, userId, userId, false, false)));
  const payCount = paySets.reduce((total, set) => total + set.count, 0);
  const payMediaCount = await getAccountMedia(db, 'iyonicpay', userId, userId, false);
  if (optedProducts.has('iyonicpay') || payCount || payMediaCount) workspaces.push({ id: `account:iyonicpay:${userId}`, name: `IyonicPay · ${profile.rows[0]?.name || 'Personal account'}`, createdAt: null, tablesCount: paySets.filter((set) => set.count > 0).length + (payMediaCount ? 1 : 0), recordsCount: payCount, mediaCount: payMediaCount, storageBytes: 0, isProductAccount: true, productKey: 'iyonicpay', accountId: userId, accountName: profile.rows[0]?.name || 'Personal account' });
  for (const productKey of ['bizhub', 'iyonicintelligence', 'iyonic-mailer', 'nlmsongs']) {
    const product = PRODUCT_ACCOUNTS[productKey];
    const tables = await getProductTables(db, productKey);
    const sets = await Promise.all(tables.map((table) => getProductDataset(db, productKey, table, userId, userId, false, false)));
    const recordsCount = sets.reduce((total, set) => total + set.count, 0);
    const mediaCount = await getAccountMedia(db, productKey, userId, userId, false);
    if (optedProducts.has(productKey) || recordsCount) workspaces.push({ id: `account:${productKey}:${userId}`, name: `${product.name} · Personal workspace`, createdAt: null, tablesCount: sets.filter((set) => set.count > 0).length + (mediaCount ? 1 : 0), recordsCount, mediaCount, storageBytes: 0, isProductAccount: true, productKey, accountId: userId, accountName: profile.rows[0]?.name || 'Personal workspace' });
  }
  return workspaces;
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
  const result = await client.query(
    `SELECT COALESCE(SUM(pg_total_relation_size(relation.oid::regclass)), 0) AS bytes
     FROM pg_class AS relation
     JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = $1 AND relation.relkind IN ('r', 'm')`,
    [schemaForProject(projectId)]
  );
  return Number(result.rows[0]?.bytes || 0);
};

const getProjectPlatformStorage = async (client, projectId) => {
  const schema = quoteIdentifier(schemaForProject(projectId));
  const result = await client.query(
    `SELECT
       COALESCE(document->>'platformKey', split_part(source_key, ':', 2)) AS product_key,
       COALESCE(document->>'accountId', document->>'platformId', split_part(source_key, ':', 3)) AS account_id,
       COALESCE(SUM(pg_column_size(document)), 0)::bigint AS storage_bytes
     FROM ${schema}.iyonicdb_documents
     WHERE collection = 'platform_data' AND source_key IS NOT NULL
     GROUP BY 1, 2`
  );
  return new Map(result.rows.map((row) => [`${row.product_key}:${row.account_id}`, Number(row.storage_bytes || 0)]));
};

const getUserStorageBytes = async (client, userId) => {
  const result = await client.query(
    `SELECT COALESCE(SUM(pg_total_relation_size(relation.oid::regclass)), 0) AS bytes
     FROM public.iyonicdb_projects AS project
     JOIN pg_namespace AS namespace
       ON namespace.nspname = 'idb_' || replace(project.id::text, '-', '')
     JOIN pg_class AS relation ON relation.relnamespace = namespace.oid
     WHERE project.user_id = $1 AND relation.relkind IN ('r', 'm')`,
    [userId]
  );
  return Number(result.rows[0]?.bytes || 0);
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
      source_key TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await client.query(`ALTER TABLE ${quoteIdentifier(schema)}.${quoteIdentifier('iyonicdb_documents')} ADD COLUMN IF NOT EXISTS source_key TEXT`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS iyonicdb_documents_source_key ON ${quoteIdentifier(schema)}.${quoteIdentifier('iyonicdb_documents')} (project_id, collection, source_key) WHERE source_key IS NOT NULL`);
  await client.query(
    `CREATE INDEX IF NOT EXISTS iyonicdb_documents_project_collection
     ON ${quoteIdentifier(schema)}.${quoteIdentifier('iyonicdb_documents')} (project_id, collection, created_at DESC)`
  );
};

const ensureDefaultProject = async (client, userId) => {
  await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
  let result = await client.query(
    'SELECT id, name, created_at, is_default FROM iyonicdb_projects WHERE user_id = $1 ORDER BY is_default DESC, created_at, id LIMIT 1',
    [userId]
  );
  if (result.rows[0]) {
    const existing = result.rows[0];
    if (!existing.is_default) {
      await client.query('UPDATE iyonicdb_projects SET is_default = TRUE, name = $2 WHERE id = $1', [existing.id, 'Default']);
      existing.name = 'Default';
      existing.is_default = true;
    } else if (existing.name !== 'Default') {
      await client.query("UPDATE iyonicdb_projects SET name = 'Default' WHERE id = $1", [existing.id]);
      existing.name = 'Default';
    }
    await ensureProjectSchema(client, existing.id);
    return existing;
  }
  result = await client.query(
    "INSERT INTO iyonicdb_projects (user_id, name, is_default) VALUES ($1, 'Default', TRUE) RETURNING id, name, created_at, is_default",
    [userId]
  );
  await ensureProjectSchema(client, result.rows[0].id);
  return result.rows[0];
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
    if ((req.rawBodyBytes || 0) > subscription.maxPayloadBytes) {
      return res.status(413).json({ message: `Your ${subscription.name} plan allows request payloads up to ${Math.round(subscription.maxPayloadBytes / 1024 ** 2)} MB. Upgrade your plan to upload larger files.`, code: 'PAYLOAD_TOO_LARGE', maxPayloadBytes: subscription.maxPayloadBytes });
    }
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

const insertSqlRow = async (db, userId, projectId, tableName, row, subscription) => {
  if (!identifierPattern.test(tableName) || !row || typeof row !== 'object' || Array.isArray(row)) {
    throw Object.assign(new Error('Provide a valid table and JSON object row.'), { status: 400 });
  }
  const values = Object.entries(row);
  if (!values.length || values.length > 25 || values.some(([name]) => !identifierPattern.test(name) || name === 'created_at')) {
    throw Object.assign(new Error('Provide 1 to 25 writable columns. The created_at column is generated.'), { status: 400 });
  }
  const size = Buffer.byteLength(JSON.stringify(row), 'utf8');
  if (size > 1024 * 1024) throw Object.assign(new Error('Rows are limited to 1 MB.'), { status: 413 });
  const schema = schemaForProject(projectId);
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
    await client.query('SELECT id FROM iyonicdb_projects WHERE id = $1 FOR UPDATE', [projectId]);
    const currentBytes = await getUserStorageBytes(client, userId);
    if (currentBytes + size > subscription.storageBytes) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('The account storage limit for this plan has been reached.'), { status: 413 });
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
    const suppliedId = values.find(([name]) => name === 'id');
    if (suppliedId && !['text', 'character varying', 'character'].includes(columns.get('id')?.data_type)) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('Explicit IDs are only allowed for tables with text-based IDs.'), { status: 400 });
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
    if (await getUserStorageBytes(client, userId) > subscription.storageBytes) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('The account storage limit for this plan has been reached.'), { status: 413 });
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

const insertDocument = async (db, userId, projectId, collection, document, subscription) => {
  const payload = JSON.stringify(document);
  const size = Buffer.byteLength(payload, 'utf8');
  if (size > 1024 * 1024) throw Object.assign(new Error('Documents are limited to 1 MB.'), { status: 413 });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
    await client.query('SELECT id FROM iyonicdb_projects WHERE id = $1 FOR UPDATE', [projectId]);
    if (await getUserStorageBytes(client, userId) + size > subscription.storageBytes) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('The account storage limit for this plan has been reached.'), { status: 413 });
    }
    const result = await client.query(
      `INSERT INTO ${quoteIdentifier(schemaForProject(projectId))}.${quoteIdentifier('iyonicdb_documents')} (project_id, collection, document)
       VALUES ($1, $2, $3::jsonb) RETURNING id, document, created_at, updated_at`,
      [projectId, collection, payload]
    );
    if (await getUserStorageBytes(client, userId) > subscription.storageBytes) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('The account storage limit for this plan has been reached.'), { status: 413 });
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

const updateDocument = async (db, userId, projectId, collection, documentId, document, subscription) => {
  const payload = JSON.stringify(document);
  const size = Buffer.byteLength(payload, 'utf8');
  if (size > 1024 * 1024) throw Object.assign(new Error('Documents are limited to 1 MB.'), { status: 413 });
  if (!uuidPattern.test(String(documentId))) throw Object.assign(new Error('Invalid document ID.'), { status: 400 });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
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
    if (await getUserStorageBytes(client, userId) > subscription.storageBytes) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('The account storage limit for this plan has been reached.'), { status: 413 });
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

const updateSqlRow = async (db, userId, projectId, tableName, rowId, row, subscription) => {
  if (!identifierPattern.test(tableName) || !rowId || typeof rowId !== 'string' || !row || typeof row !== 'object' || Array.isArray(row)) {
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
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
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
    if (await getUserStorageBytes(client, userId) > subscription.storageBytes) {
      await client.query('ROLLBACK');
      throw Object.assign(new Error('The account storage limit for this plan has been reached.'), { status: 413 });
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

  // Apply the same plan-based request ceiling to authenticated console uploads and writes.
  app.use('/api/iyonicdb', (req, res, next) => {
    if (req.path.startsWith('/v1') || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    return authenticateToken(req, res, async () => {
      try {
        const subscription = await getCurrentSubscription(db, req.user.id);
        if ((req.rawBodyBytes || 0) > subscription.maxPayloadBytes) {
          return res.status(413).json({ message: `Your ${subscription.name} plan allows request payloads up to ${Math.round(subscription.maxPayloadBytes / 1024 ** 2)} MB. Upgrade your plan to upload larger files.`, code: 'PAYLOAD_TOO_LARGE', maxPayloadBytes: subscription.maxPayloadBytes });
        }
        return next();
      } catch (error) {
        console.error('IyonicDB payload limit lookup failed:', error);
        return res.status(500).json({ message: 'Could not verify the IyonicDB plan payload limit.' });
      }
    });
  });

  app.get('/api/iyonicdb/plans', (req, res) => res.json([safePlan(FREE_PLAN), ...Object.values(PLANS).map(safePlan)]));

  app.get('/api/iyonicdb/overview', authenticateToken, async (req, res) => {
    try {
      const defaultClient = await db.pool.connect();
      try {
        await defaultClient.query('BEGIN');
        await ensureDefaultProject(defaultClient, req.user.id);
        await defaultClient.query('COMMIT');
      } catch (error) {
        await defaultClient.query('ROLLBACK');
        throw error;
      } finally {
        defaultClient.release();
      }
      const identity = await db.query('SELECT id, email FROM users WHERE id = $1', [req.user.id]);
      if (!identity.rows[0]?.email) return res.status(401).json({ message: 'Your account email could not be verified. Please sign in again.' });
      const accountEmail = String(identity.rows[0].email).trim().toLowerCase();
      const [projects, connectedProjects, subscription, usage, wallet] = await Promise.all([
        db.query('SELECT id, name, created_at, is_default FROM iyonicdb_projects WHERE user_id = $1 ORDER BY is_default DESC, created_at', [req.user.id]),
        getConnectedProductProjects(db, req.user.id, accountEmail),
        getCurrentSubscription(db, req.user.id),
        db.query(
          `SELECT COALESCE((
             SELECT request_count FROM iyonicdb_usage
             WHERE user_id = $1 AND month_start = date_trunc('month', CURRENT_TIMESTAMP)::date
           ), 0)::int AS request_count,
           date_trunc('month', CURRENT_TIMESTAMP)::date::text AS period_start`,
          [req.user.id]
        ),
        db.query('SELECT balance, currency FROM wallets WHERE user_id = $1', [req.user.id]),
      ]);
      const databaseProjects = await Promise.all(projects.rows.map(async (project) => {
        const [storageBytes, inventory] = await Promise.all([
          getProjectStorageBytes(db, project.id),
          getProjectInventory(db, project.id),
        ]);
        return { id: project.id, name: project.name, createdAt: project.created_at, isDefault: project.is_default, storageBytes, ...inventory };
      }));
      const defaultProject = projects.rows.find((project) => project.is_default);
      let storageBreakdownComplete = true;
      let platformStorage = new Map();
      try {
        if (defaultProject) platformStorage = await getProjectPlatformStorage(db, defaultProject.id);
      } catch (storageError) {
        storageBreakdownComplete = false;
        console.error('IyonicDB platform storage breakdown failed:', storageError);
      }
      const personalMediaWorkspaceId = connectedProjects.find((workspace) => workspace.accountId === req.user.id)?.id;
      const accountWorkspaces = await Promise.all(connectedProjects.map(async (workspace) => {
        let mediaStorageBytes = 0;
        try {
          mediaStorageBytes = await getAccountMediaStorageBytes(
            db,
            workspace.productKey,
            workspace.accountId,
            req.user.id,
            workspace.id === personalMediaWorkspaceId
          );
        } catch (storageError) {
          storageBreakdownComplete = false;
          console.error(`IyonicDB media storage breakdown failed for ${workspace.productKey}:`, storageError);
        }
        return {
          ...workspace,
          mediaStorageBytes,
          storageBytes: (platformStorage.get(`${workspace.productKey}:${workspace.accountId}`) || 0) + mediaStorageBytes,
        };
      }));
      const platformMediaStorageBytes = accountWorkspaces.reduce((total, workspace) => total + workspace.mediaStorageBytes, 0);
      const currentWallet = wallet.rows[0];
      const walletCurrency = String(currentWallet?.currency || 'USD').toUpperCase();
      const walletRate = IYONICPAY_RATES_TO_USD[walletCurrency];
      res.json({
        projects: databaseProjects,
        accountWorkspaces,
        databaseProjectCount: databaseProjects.length,
        subscription,
        wallet: {
          balance: Number(currentWallet?.balance || 0),
          currency: walletCurrency,
          available: Boolean(currentWallet),
          planCharges: walletRate ? Object.fromEntries(Object.values(PLANS).map((plan) => [plan.id, Math.round(plan.price * walletRate * 100) / 100])) : {},
        },
        usage: {
          requests: Number(usage.rows[0]?.request_count || 0),
          requestLimit: subscription?.requestsPerMonth || 0,
          storageBytes: databaseProjects.reduce((total, project) => total + project.storageBytes, 0) + platformMediaStorageBytes,
          mediaStorageBytes: platformMediaStorageBytes,
          storageBreakdownComplete,
          storageLimitBytes: subscription?.storageBytes || 0,
          periodStart: usage.rows[0]?.period_start || new Date().toISOString().slice(0, 10),
        },
      });
    } catch (error) {
      console.error('IyonicDB overview failed:', error);
      res.status(500).json({ message: 'Could not load the IyonicDB account overview.' });
    }
  });

  app.get('/api/iyonicdb/accounts/:productKey/:accountId/data', authenticateToken, async (req, res) => {
    const { productKey, accountId } = req.params;
    const product = PRODUCT_ACCOUNTS[productKey];
    if (!product) return res.status(404).json({ message: 'Connected product workspace not found.' });
    if (!uuidPattern.test(String(accountId))) return res.status(404).json({ message: 'Workspace not found.' });
    try {
      const identity = await db.query('SELECT id, email FROM users WHERE id = $1', [req.user.id]);
      const accountEmail = String(identity.rows[0]?.email || '').trim().toLowerCase();
      if (!accountEmail) return res.status(401).json({ message: 'Your account email could not be verified. Please sign in again.' });
      if (req.query.email && String(req.query.email).trim().toLowerCase() !== accountEmail) {
        return res.status(403).json({ message: 'The requested email does not match your signed-in account.' });
      }
      // Resolve access through the same workspace list used by /overview. This
      // keeps account IDs and ownership rules consistent across both routes.
      const connectedWorkspaces = await getConnectedProductProjects(db, req.user.id, accountEmail);
      const workspace = connectedWorkspaces.find((item) => item.productKey === productKey && item.accountId === accountId);
      if (!workspace) return res.status(404).json({ message: 'Workspace not found.' });
      const seller = productKey === 'iyonicpay' || accountId === req.user.id
        ? { rows: [] }
        : await db.query('SELECT id, store_name FROM sellers WHERE id = $1', [accountId]);
      const isSellerWorkspace = Boolean(seller.rowCount && accountId !== req.user.id);
      const isPersonalWorkspace = accountId === req.user.id;
      if (productKey === 'iyonicpay' && !isPersonalWorkspace) return res.status(404).json({ message: 'Workspace not found.' });
      const accountOwnerId = isSellerWorkspace ? accountId : req.user.id;
      const tables = await getProductTables(db, productKey);
      const datasets = await Promise.all(tables.map((table) => getProductDataset(db, productKey, table, accountOwnerId, req.user.id, isSellerWorkspace)));
      const accountMedia = await getAccountMedia(db, productKey, accountOwnerId, req.user.id);
      const mediaByUrl = new Map(accountMedia.map((asset) => [asset.url, asset]));
      const findLegacyMedia = (value, key, record, tableName) => {
        if (Array.isArray(value)) return value.forEach((item) => findLegacyMedia(item, key, record, tableName));
        if (value && typeof value === 'object') return Object.entries(value).forEach(([childKey, childValue]) => findLegacyMedia(childValue, childKey, record, tableName));
        if (typeof value !== 'string' || !/^https?:\/\//i.test(value) || !/(image|video|audio|thumbnail|logo|media|file|source_url)/i.test(key)) return;
        if (mediaByUrl.has(value)) return;
        const mediaType = /video/i.test(key) ? 'video' : /audio/i.test(key) ? 'audio' : 'image';
        mediaByUrl.set(value, { id: `${tableName}:${record.id || value}`, originalName: record.name || record.title || value.split('/').pop(), url: value, mediaType, mimeType: '', sizeBytes: 0, createdAt: record.created_at || null, source: tableName });
      };
      datasets.forEach((dataset) => dataset.records.forEach((record) => Object.entries(record).forEach(([key, value]) => findLegacyMedia(value, key, record, dataset.name))));
      const mediaCount = await getAccountMedia(db, productKey, accountOwnerId, req.user.id, false);
      datasets.unshift({ name: 'media', records: [...mediaByUrl.values()], count: Math.max(mediaCount, mediaByUrl.size) });
      const profile = isPersonalWorkspace ? await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]) : null;
      res.json({ productKey, productName: product.name, accountName: seller.rows[0]?.store_name || profile?.rows[0]?.name || 'Personal workspace', datasets });
    } catch (error) {
      console.error('IyonicDB product workspace data failed:', error);
      res.status(500).json({ message: 'Could not load this product workspace data.' });
    }
  });

  app.post('/api/iyonicdb/projects/:projectId/platform-data/sync', authenticateToken, async (req, res) => {
    const subscription = await requirePlan(db, req, res);
    if (!subscription) return;
    const project = await getProject(db, req.user.id, req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    const defaultCheck = await db.query('SELECT is_default FROM iyonicdb_projects WHERE id = $1 AND user_id = $2', [project.id, req.user.id]);
    if (!defaultCheck.rows[0]?.is_default) return res.status(403).json({ message: 'Platform data can only sync to your Default project.' });
    const identity = await db.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    const accountEmail = String(identity.rows[0]?.email || '').trim().toLowerCase();
    if (!accountEmail) return res.status(401).json({ message: 'Your account email could not be verified. Please sign in again.' });
    const sellers = await db.query(
      `SELECT DISTINCT s.id, s.store_name
       FROM sellers s
       LEFT JOIN users owner ON owner.id = s.user_id
       LEFT JOIN seller_managers sm ON sm.id = s.manager_id
       LEFT JOIN users manager ON manager.id = sm.user_id
       WHERE LOWER(owner.email) = LOWER($1) OR LOWER(manager.email) = LOWER($1)
       ORDER BY s.store_name`,
      [accountEmail]
    );
    const personalAccess = await db.query('SELECT product_key FROM user_product_access WHERE user_id = $1', [req.user.id]);
    const personalProductKeys = [...new Set([...personalAccess.rows.map((row) => row.product_key).filter((key) => PRODUCT_ACCOUNTS[key]), 'nlmsongs'])];
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
      await client.query('SELECT id FROM iyonicdb_projects WHERE id = $1 FOR UPDATE', [project.id]);
      await ensureProjectSchema(client, project.id);
      const schema = quoteIdentifier(schemaForProject(project.id));
      const now = new Date().toISOString();
      let recordsSynced = 0;
      let datasetsSynced = 0;
      const platformsSynced = new Set();
      const tableCache = new Map();
      const syncWorkspace = async ({ productKey, accountId, isSellerWorkspace, platformName }) => {
        const product = PRODUCT_ACCOUNTS[productKey];
        if (!tableCache.has(productKey)) tableCache.set(productKey, await getProductTables(db, productKey));
        for (const table of tableCache.get(productKey)) {
          const metadata = await getProductDataset(db, productKey, table, accountId, req.user.id, isSellerWorkspace, false);
          if (!metadata.count) continue;
          platformsSynced.add(productKey);
          const prefix = `account:${productKey}:${accountId}:${table}:`;
          const sourceKeys = [];
          for (let offset = 0; offset < metadata.count; offset += 200) {
            const page = await getProductDataset(db, productKey, table, accountId, req.user.id, isSellerWorkspace, true, 200, offset);
            const values = [];
            const params = [];
            for (const row of page.records) {
              const sourceId = row.id ?? row._id ?? crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex');
              const sourceKey = `${prefix}${String(sourceId)}`;
              sourceKeys.push(sourceKey);
              const document = JSON.stringify({ platform: product.name, platformKey: productKey, platformId: accountId, accountId, platformName, dataset: table, sourceId, data: row, syncedAt: now });
              const base = params.length;
              params.push(project.id, 'platform_data', document, sourceKey);
              values.push(`($${base + 1}, $${base + 2}, $${base + 3}::jsonb, $${base + 4})`);
            }
            if (values.length) {
              await client.query(
                `INSERT INTO ${schema}.iyonicdb_documents (project_id, collection, document, source_key)
                 VALUES ${values.join(', ')}
                 ON CONFLICT (project_id, collection, source_key) WHERE source_key IS NOT NULL
                 DO UPDATE SET document = EXCLUDED.document, updated_at = CURRENT_TIMESTAMP`,
                params
              );
              recordsSynced += values.length;
              const storageBytes = await getUserStorageBytes(client, req.user.id);
              if (storageBytes > subscription.storageBytes) throw Object.assign(new Error('Syncing this platform would exceed your IyonicDB storage allowance. Upgrade your plan or reduce the platform data before syncing again.'), { status: 413 });
            }
          }
          await client.query(
            `DELETE FROM ${schema}.iyonicdb_documents
             WHERE project_id = $1 AND collection = 'platform_data'
               AND left(source_key, length($2)) = $2
               AND NOT (source_key = ANY($3::text[]))`,
            [project.id, prefix, sourceKeys]
          );
          datasetsSynced += 1;
        }
      };
      const sellerProductKeys = Object.keys(PRODUCT_ACCOUNTS).filter((key) => key !== 'iyonicpay');
      for (const seller of sellers.rows) {
        for (const productKey of sellerProductKeys) {
          const productName = `${PRODUCT_ACCOUNTS[productKey].name} · ${seller.store_name}`;
          await syncWorkspace({ productKey, accountId: seller.id, isSellerWorkspace: true, platformName: productName });
        }
      }
      const profile = await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
      for (const productKey of personalProductKeys) {
        await syncWorkspace({ productKey, accountId: req.user.id, isSellerWorkspace: false, platformName: profile.rows[0]?.name || 'Personal account' });
      }
      const storageBytes = await getUserStorageBytes(client, req.user.id);
      await client.query('COMMIT');
      res.json({ platforms: platformsSynced.size, datasetsSynced, recordsSynced, storageBytes, storageLimitBytes: subscription.storageBytes, syncedAt: now });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (error.status) return res.status(error.status).json({ message: error.message });
      console.error('IyonicDB platform sync failed:', error);
      res.status(500).json({ message: 'Could not sync platform data to the Default project.' });
    } finally {
      client.release();
    }
  });

  app.get('/api/iyonicdb/media', authenticateToken, async (req, res) => {
    try {
      const sellers = await db.query(
        `SELECT s.id FROM sellers s
         LEFT JOIN seller_managers sm ON sm.id = s.manager_id
         WHERE s.user_id = $1 OR sm.user_id = $1`,
        [req.user.id]
      );
      const sellerIds = sellers.rows.map((row) => row.id);
      const [savedAssets, productImages, productVideos, sellerLogos, socialImages, songs, streams] = await Promise.all([
        db.query(
          `SELECT original_name, url, mime_type, media_type, size_bytes, created_at, 'uploads' AS source
           FROM iyonic_media_assets
           WHERE user_id = $1 OR seller_id = ANY($2::uuid[])
           ORDER BY created_at DESC`,
          [req.user.id, sellerIds]
        ),
        db.query(
          `SELECT unnest(COALESCE(p.images, ARRAY[]::text[])) AS url, 'image' AS media_type,
                  p.name AS original_name, p.created_at, 'products' AS source
           FROM products p WHERE p.seller_id = ANY($1::uuid[]) AND COALESCE(array_length(p.images, 1), 0) > 0`,
          [sellerIds]
        ),
        db.query(
          `SELECT unnest(COALESCE(p.videos, ARRAY[]::text[])) AS url, 'video' AS media_type,
                  p.name AS original_name, p.created_at, 'products' AS source
           FROM products p WHERE p.seller_id = ANY($1::uuid[]) AND COALESCE(array_length(p.videos, 1), 0) > 0`,
          [sellerIds]
        ),
        db.query(
          `SELECT logo AS url, 'image' AS media_type, store_name AS original_name,
                  updated_at AS created_at, 'store branding' AS source
           FROM sellers WHERE id = ANY($1::uuid[]) AND logo IS NOT NULL AND logo <> ''`,
          [sellerIds]
        ),
        db.query(
          `SELECT image_url AS url, 'image' AS media_type, left(content, 80) AS original_name,
                  created_at, 'social posts' AS source
           FROM social_media_posts WHERE seller_id = ANY($1::uuid[]) AND image_url IS NOT NULL AND image_url <> ''`,
          [sellerIds]
        ),
        db.query(
          `SELECT audio_url AS url, COALESCE(audio_mime_type, 'audio/mpeg') AS mime_type,
                  'audio' AS media_type, title AS original_name, created_at, 'music library' AS source
           FROM nlm_songs WHERE (created_by = $1 OR seller_id = ANY($2::uuid[])) AND audio_url <> ''
           UNION ALL
           SELECT thumbnail_url AS url, COALESCE(thumbnail_mime_type, 'image/jpeg') AS mime_type,
                  'image' AS media_type, title || ' thumbnail' AS original_name, created_at, 'music library' AS source
           FROM nlm_songs WHERE (created_by = $1 OR seller_id = ANY($2::uuid[])) AND thumbnail_url IS NOT NULL AND thumbnail_url <> ''`,
          [req.user.id, sellerIds]
        ),
        db.query(
          `SELECT video_url AS url, 'video' AS media_type, title AS original_name,
                  created_at, 'IxStream' AS source
           FROM ixstream_content WHERE (created_by = $1 OR seller_id = ANY($2::uuid[])) AND video_url <> ''
           UNION ALL
           SELECT thumbnail_url AS url, 'image' AS media_type, title || ' thumbnail' AS original_name,
                  created_at, 'IxStream' AS source
           FROM ixstream_content WHERE (created_by = $1 OR seller_id = ANY($2::uuid[])) AND thumbnail_url IS NOT NULL AND thumbnail_url <> ''`,
          [req.user.id, sellerIds]
        ),
      ]);

      const byUrl = new Map();
      const addAssets = (rows) => rows.forEach((row) => {
        if (!row.url || byUrl.has(row.url)) return;
        const extension = String(row.url).split(/[?#]/)[0].split('.').pop()?.toLowerCase();
        const mimeType = row.mime_type || (row.media_type === 'image' ? `image/${extension || 'jpeg'}` : row.media_type === 'video' ? `video/${extension || 'mp4'}` : row.media_type === 'audio' ? `audio/${extension || 'mpeg'}` : 'application/octet-stream');
        let originalName = row.original_name;
        if (!originalName || originalName.includes('http')) {
          try { originalName = decodeURIComponent(new URL(row.url, 'http://localhost').pathname.split('/').pop() || 'Media file'); }
          catch { originalName = 'Media file'; }
        }
        byUrl.set(row.url, {
          id: row.id || row.url,
          url: row.url,
          originalName,
          mediaType: row.media_type || (mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('video/') ? 'video' : mimeType.startsWith('audio/') ? 'audio' : 'other'),
          mimeType,
          sizeBytes: Number(row.size_bytes || 0),
          createdAt: row.created_at,
          source: row.source || 'library',
        });
      });
      [savedAssets, productImages, productVideos, sellerLogos, socialImages, songs, streams].forEach((result) => addAssets(result.rows));
      res.json([...byUrl.values()].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    } catch (error) {
      console.error('IyonicDB media library failed:', error);
      res.status(500).json({ message: 'Could not load your media library.' });
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
        'INSERT INTO iyonicdb_projects (user_id, name, is_default) VALUES ($1, $2, FALSE) RETURNING id, name, created_at, is_default',
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
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
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
      if (await getUserStorageBytes(client, req.user.id) > subscription.storageBytes) {
        await client.query('ROLLBACK');
        return res.status(413).json({ message: 'The account storage limit for this plan has been reached.' });
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
      res.status(error.status || 500).json({ message: error.status ? error.message : 'The SQL query could not be executed.', code: error.code || undefined });
    }
  });

  app.get('/api/iyonicdb/projects/:projectId/migrations', authenticateToken, async (req, res) => {
    if (!await requirePlan(db, req, res)) return;
    const project = await getProject(db, req.user.id, req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    try {
      const result = await db.query(
        `SELECT name, checksum, statement_count AS "statementCount", applied_at AS "appliedAt"
         FROM public.iyonicdb_migrations WHERE project_id = $1 ORDER BY applied_at DESC, name`,
        [project.id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('IyonicDB console migration history failed:', error);
      res.status(500).json({ message: 'Could not load migration history.', code: error.code || undefined });
    }
  });

  app.post('/api/iyonicdb/projects/:projectId/migrations', authenticateToken, async (req, res) => {
    const subscription = await requirePlan(db, req, res);
    if (!subscription) return;
    const project = await getProject(db, req.user.id, req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const sql = typeof req.body?.sql === 'string' ? req.body.sql.trim() : '';
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(name)) {
      return res.status(400).json({ message: 'Migration name must be 1 to 128 letters, numbers, dots, underscores, or hyphens.' });
    }
    if (!sql) return res.status(400).json({ message: 'Provide the migration SQL.' });
    if (Buffer.byteLength(sql, 'utf8') > 256 * 1024) return res.status(413).json({ message: 'A migration is limited to 256 KB.', code: 'MIGRATION_TOO_LARGE' });

    let statements;
    try {
      statements = splitMigrationSql(sql);
      validateMigrationStatements(statements);
    } catch (error) {
      return res.status(error.status || 400).json({ message: error.message || 'The migration is invalid.', code: error.code || undefined });
    }

    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    const schema = schemaForProject(project.id);
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [project.id]);
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
      await client.query('SELECT id FROM iyonicdb_projects WHERE id = $1 FOR UPDATE', [project.id]);

      const existing = await client.query(
        'SELECT checksum, statement_count, applied_at FROM public.iyonicdb_migrations WHERE project_id = $1 AND name = $2',
        [project.id, name]
      );
      if (existing.rowCount) {
        if (existing.rows[0].checksum !== checksum) {
          await client.query('ROLLBACK');
          return res.status(409).json({ message: 'This migration name was already applied with different SQL. Use a new migration name.', code: 'MIGRATION_NAME_CONFLICT' });
        }
        await client.query('COMMIT');
        return res.json({ name, checksum, statementCount: existing.rows[0].statement_count, appliedAt: existing.rows[0].applied_at, alreadyApplied: true });
      }

      await client.query(`SET LOCAL search_path TO ${quoteIdentifier(schema)}, pg_catalog`);
      await client.query("SET LOCAL statement_timeout = '30s'");
      await client.query("SET LOCAL lock_timeout = '5s'");
      for (const statement of statements) await client.query(statement);

      const tableCount = await client.query(
        `SELECT count(*)::int AS count FROM information_schema.tables
         WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> 'iyonicdb_documents'`,
        [schema]
      );
      if (Number(tableCount.rows[0]?.count || 0) > subscription.tableLimit) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: `This migration would exceed your ${subscription.name} plan limit of ${subscription.tableLimit} tables.`, code: 'TABLE_LIMIT_EXCEEDED' });
      }
      if (await getUserStorageBytes(client, req.user.id) > subscription.storageBytes) {
        await client.query('ROLLBACK');
        return res.status(413).json({ message: 'This migration would exceed your account storage limit.', code: 'STORAGE_LIMIT_EXCEEDED' });
      }

      const applied = await client.query(
        `INSERT INTO public.iyonicdb_migrations (project_id, name, checksum, statement_count)
         VALUES ($1, $2, $3, $4) RETURNING applied_at AS "appliedAt"`,
        [project.id, name, checksum, statements.length]
      );
      await client.query('COMMIT');
      res.status(201).json({ name, checksum, statementCount: statements.length, appliedAt: applied.rows[0].appliedAt, alreadyApplied: false });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (['42P07', '42701', '42710'].includes(error.code)) {
        return res.status(409).json({ message: 'The migration conflicts with an existing database object. No changes were applied.', code: error.code });
      }
      if (['57014', '55P03'].includes(error.code)) {
        return res.status(409).json({ message: 'The migration timed out or could not obtain a database lock. No changes were applied.', code: error.code });
      }
      console.error('IyonicDB console migration failed:', error);
      const userSqlError = ['42601', '42P01', '42703', '42804', '42P16', '23502', '23503', '23505', '23514'].includes(error.code);
      res.status(error.status || (userSqlError ? 400 : 500)).json({
        message: error.status ? error.message : 'The migration failed. No changes were applied.',
        code: error.code || undefined,
      });
    } finally {
      client.release();
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
      const row = await insertSqlRow(db, req.user.id, project.id, req.params.table, req.body?.row, subscription);
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
      const row = await updateSqlRow(db, req.user.id, project.id, req.params.table, req.params.rowId, req.body?.row, subscription);
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

  app.get('/api/iyonicdb/projects/:projectId/documents', authenticateToken, async (req, res) => {
    if (!await requirePlan(db, req, res)) return;
    const project = await getProject(db, req.user.id, req.params.projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    try {
      const result = await db.query(
        `SELECT collection, COUNT(*)::int AS count
         FROM ${quoteIdentifier(schemaForProject(project.id))}.${quoteIdentifier('iyonicdb_documents')}
         WHERE project_id = $1
         GROUP BY collection
         ORDER BY collection`,
        [project.id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('IyonicDB document collection listing failed:', error);
      res.status(500).json({ message: 'Could not load document collections.' });
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
      const document = await insertDocument(db, req.user.id, project.id, req.params.collection, req.body.document, subscription);
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
      const document = await updateDocument(db, req.user.id, project.id, req.params.collection, req.params.documentId, req.body.document, subscription);
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
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
      const subscription = await getCurrentSubscription(db, req.user.id, client);
      const activeKeys = await client.query(
        'SELECT count(*)::int AS count FROM iyonicdb_api_keys WHERE user_id = $1 AND revoked_at IS NULL',
        [req.user.id]
      );
      if (Number(activeKeys.rows[0]?.count || 0) >= subscription.apiKeyLimit) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          message: `Your ${subscription.name} plan allows ${subscription.apiKeyLimit} active API keys. Revoke an existing key or upgrade your plan.`,
          activeKeyCount: Number(activeKeys.rows[0]?.count || 0),
          apiKeyLimit: subscription.apiKeyLimit,
        });
      }
      const result = await client.query(
        `INSERT INTO iyonicdb_api_keys (user_id, project_id, name, key_prefix, key_hash)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, key_prefix, created_at`,
        [req.user.id, project.id, name, key.slice(0, 17), hashKey(key)]
      );
      await client.query('COMMIT');
      res.status(201).json({ ...result.rows[0], secret: key });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('IyonicDB API key creation failed:', error);
      res.status(500).json({ message: 'Could not create the API key.' });
    } finally {
      client.release();
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

  app.patch('/api/iyonicdb/keys/:keyId/project', authenticateToken, async (req, res) => {
    const projectId = req.body?.projectId;
    if (!uuidPattern.test(String(projectId || ''))) return res.status(400).json({ message: 'Choose a valid destination project.' });
    try {
      const project = await getProject(db, req.user.id, projectId);
      if (!project) return res.status(404).json({ message: 'Destination project not found.' });
      const result = await db.query(
        `UPDATE iyonicdb_api_keys
         SET project_id = $1
         WHERE id = $2 AND user_id = $3 AND revoked_at IS NULL
         RETURNING id, project_id`,
        [project.id, req.params.keyId, req.user.id]
      );
      if (!result.rowCount) return res.status(404).json({ message: 'Active API key not found.' });
      res.json({ id: result.rows[0].id, projectId: result.rows[0].project_id, projectName: project.name });
    } catch (error) {
      console.error('IyonicDB API key project change failed:', error);
      res.status(500).json({ message: 'Could not change the API key project.' });
    }
  });

  app.post('/api/iyonicdb/billing/initialize', authenticateToken, async (req, res) => {
    const plan = PLANS[req.body?.planId];
    if (!plan) return res.status(400).json({ message: 'Choose a valid IyonicDB plan.' });
    if (!process.env.PAYSTACK_SECRET_KEY) return res.status(503).json({ message: 'Billing is unavailable because the payment provider is not configured.' });
    try {
      const active = await db.query(
        `SELECT plan_id FROM iyonicdb_subscriptions
         WHERE user_id = $1 AND status = 'active' AND current_period_end > CURRENT_TIMESTAMP
         ORDER BY current_period_end DESC LIMIT 1`,
        [req.user.id]
      );
      if (active.rows[0]?.plan_id === plan.id) return res.status(409).json({ message: 'This plan is already active on your account.' });
      const user = await db.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
      if (!user.rows[0]?.email) return res.status(422).json({ message: 'An account email is required for checkout.' });
      const gateway = Paystack(process.env.PAYSTACK_SECRET_KEY);
      const payment = await new Promise((resolve, reject) => gateway.transaction.initialize({
        email: user.rows[0].email,
        amount: Math.round(plan.price * 100),
        currency: plan.currency,
        channels: ['card', 'mobile_money'],
        metadata: { type: 'iyonicdb_subscription', userId: req.user.id, planId: plan.id },
      }, (error, body) => error ? reject(error) : resolve(body)));
      if (!payment?.status || !payment.data?.reference) {
        return res.status(502).json({ message: 'The payment provider did not return a checkout session.' });
      }
      await db.query(
        `INSERT INTO iyonicdb_payment_attempts (reference, user_id, plan_id, amount, currency)
         VALUES ($1, $2, $3, $4, $5)`,
        [payment.data.reference, req.user.id, plan.id, plan.price, plan.currency]
      );
      res.json({ accessCode: payment.data.access_code, reference: payment.data.reference, amount: Math.round(plan.price * 100), currency: plan.currency, email: user.rows[0].email });
    } catch (error) {
      console.error('IyonicDB payment initialization failed:', error);
      res.status(500).json({ message: 'Could not start IyonicDB checkout.' });
    }
  });

  app.post('/api/iyonicdb/billing/wallet/subscribe', authenticateToken, async (req, res) => {
    const plan = PLANS[req.body?.planId];
    if (!plan) return res.status(400).json({ message: 'Choose a valid IyonicDB plan.' });
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const active = await client.query(
        `SELECT plan_id FROM iyonicdb_subscriptions
         WHERE user_id = $1 AND status = 'active' AND current_period_end > CURRENT_TIMESTAMP
         ORDER BY current_period_end DESC LIMIT 1 FOR UPDATE`,
        [req.user.id]
      );
      if (active.rows[0]?.plan_id === plan.id) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'This plan is already active on your account.' });
      }
      const wallet = await client.query('SELECT id, balance, currency FROM wallets WHERE user_id = $1 FOR UPDATE', [req.user.id]);
      const currentWallet = wallet.rows[0];
      if (!currentWallet) {
        await client.query('ROLLBACK');
        return res.status(402).json({ message: 'No IyonicPay wallet is linked to your account. Open IyonicPay and add funds to subscribe.' });
      }
      const currency = String(currentWallet.currency || 'USD').toUpperCase();
      const rate = IYONICPAY_RATES_TO_USD[currency];
      if (!rate) {
        await client.query('ROLLBACK');
        return res.status(422).json({ message: `IyonicPay subscriptions do not support ${currency} wallets yet. Please use Paystack or a supported wallet currency.` });
      }
      const charge = Math.round(plan.price * rate * 100) / 100;
      if (Number(currentWallet.balance) < charge) {
        await client.query('ROLLBACK');
        return res.status(402).json({ message: `Your IyonicPay balance is too low. This plan costs ${charge.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}.` });
      }
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setUTCDate(periodEnd.getUTCDate() + 30);
      const reference = `idb_wallet_${nanoid(24)}`;
      await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [charge, currentWallet.id]);
      await client.query(
        `INSERT INTO transactions (sender_wallet_id, amount, currency, type, status, description)
         VALUES ($1, $2, $3, 'invoice_payment', 'completed', $4)`,
        [currentWallet.id, charge, currency, `IyonicDB ${plan.name} subscription`]
      );
      await client.query(
        `UPDATE iyonicdb_subscriptions SET status = 'expired'
         WHERE user_id = $1 AND status = 'active'`,
        [req.user.id]
      );
      await client.query(
        `INSERT INTO iyonicdb_subscriptions (user_id, plan_id, status, current_period_start, current_period_end, payment_reference, payment_method)
         VALUES ($1, $2, 'active', $3, $4, $5, 'iyonicpay')`,
        [req.user.id, plan.id, now, periodEnd, reference]
      );
      await client.query(
        `INSERT INTO iyonicdb_payment_attempts (reference, user_id, plan_id, amount, currency, status, completed_at)
         VALUES ($1, $2, $3, $4, $5, 'completed', CURRENT_TIMESTAMP)`,
        [reference, req.user.id, plan.id, plan.price, plan.currency]
      );
      await client.query('COMMIT');
      res.json({ message: `${plan.name} plan activated with IyonicPay.`, subscription: { ...safePlan(plan), status: 'active', currentPeriodEnd: periodEnd }, charged: { amount: charge, currency } });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('IyonicDB IyonicPay subscription failed:', error);
      res.status(500).json({ message: 'Could not activate the subscription with IyonicPay.' });
    } finally {
      client.release();
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
        `UPDATE iyonicdb_subscriptions SET status = 'expired'
         WHERE user_id = $1 AND status = 'active'`,
        [req.user.id]
      );
      await client.query(
        `INSERT INTO iyonicdb_subscriptions (user_id, plan_id, status, current_period_start, current_period_end, payment_reference, payment_method)
         VALUES ($1, $2, 'active', $3, $4, $5, 'paystack')`,
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
  // A key is scoped to exactly one project, so integrations can omit project IDs.
  // Keep the project-qualified routes for backwards compatibility and route the
  // shorter key-only API paths through the same handlers.
  app.use('/api/iyonicdb/v1', authenticateKey, (req, res, next) => {
    if (!req.path.startsWith('/projects/')) {
      req.url = `/projects/${encodeURIComponent(req.iyonicDbKey.projectId)}${req.url}`;
    }
    next();
  });

  app.get('/api/iyonicdb/v1/projects/:projectId/health', (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    res.json({ healthy: true });
  });

  app.get('/api/iyonicdb/v1/projects/:projectId/migrations', async (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    try {
      const result = await db.query(
        `SELECT name, checksum, statement_count AS "statementCount", applied_at AS "appliedAt"
         FROM public.iyonicdb_migrations WHERE project_id = $1 ORDER BY applied_at, name`,
        [req.params.projectId]
      );
      res.set('X-IyonicDB-Migration-Features', 'dry-run,statements,filename,auto-name');
      res.json(result.rows);
    } catch (error) {
      console.error('IyonicDB migration history failed:', error);
      res.status(500).json({ message: 'Could not load migration history.', code: error.code || undefined });
    }
  });

  app.post('/api/iyonicdb/v1/projects/:projectId/migrations', async (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    const { name: requestedName, sql, dryRun } = normalizeMigrationRequest(req.body);
    if (!sql) return res.status(400).json({ message: 'Provide migration SQL as "sql" or as a string array in "statements".', code: 'MIGRATION_SQL_REQUIRED' });
    if (Buffer.byteLength(sql, 'utf8') > 256 * 1024) return res.status(413).json({ message: 'A migration is limited to 256 KB.', code: 'MIGRATION_TOO_LARGE' });

    let statements;
    try {
      statements = splitMigrationSql(sql);
      validateMigrationStatements(statements);
    } catch (error) {
      return res.status(error.status || 400).json({ message: error.message || 'The migration is invalid.', code: error.code || 'INVALID_MIGRATION' });
    }

    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    const name = requestedName || `auto_${checksum.slice(0, 16)}`;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(name)) {
      return res.status(400).json({ message: 'Migration name must be 1 to 128 letters, numbers, dots, underscores, or hyphens.', code: 'INVALID_MIGRATION_NAME' });
    }
    const projectId = req.params.projectId;
    const schema = schemaForProject(projectId);
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [projectId]);
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.iyonicDbKey.userId]);
      await client.query('SELECT id FROM iyonicdb_projects WHERE id = $1 FOR UPDATE', [projectId]);

      const existing = await client.query(
        'SELECT checksum, statement_count, applied_at FROM public.iyonicdb_migrations WHERE project_id = $1 AND name = $2',
        [projectId, name]
      );
      if (existing.rowCount) {
        if (existing.rows[0].checksum !== checksum) {
          await client.query('ROLLBACK');
          return res.status(409).json({ message: 'This migration name was already applied with different SQL. Use a new migration name.', code: 'MIGRATION_NAME_CONFLICT' });
        }
        await client.query('COMMIT');
        return res.json({ name, checksum, statementCount: existing.rows[0].statement_count, appliedAt: existing.rows[0].applied_at, alreadyApplied: true, dryRun });
      }

      await client.query(`SET LOCAL search_path TO ${quoteIdentifier(schema)}, pg_catalog`);
      await client.query("SET LOCAL statement_timeout = '30s'");
      await client.query("SET LOCAL lock_timeout = '5s'");
      for (const statement of statements) await client.query(statement);

      const tableCount = await client.query(
        `SELECT count(*)::int AS count FROM information_schema.tables
         WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> 'iyonicdb_documents'`,
        [schema]
      );
      if (Number(tableCount.rows[0]?.count || 0) > req.iyonicDbKey.subscription.tableLimit) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: `This migration would exceed your ${req.iyonicDbKey.subscription.name} plan limit of ${req.iyonicDbKey.subscription.tableLimit} tables.`, code: 'TABLE_LIMIT_EXCEEDED' });
      }
      if (await getUserStorageBytes(client, req.iyonicDbKey.userId) > req.iyonicDbKey.subscription.storageBytes) {
        await client.query('ROLLBACK');
        return res.status(413).json({ message: 'This migration would exceed your account storage limit.', code: 'STORAGE_LIMIT_EXCEEDED' });
      }

      if (dryRun) {
        await client.query('ROLLBACK');
        return res.json({ name, checksum, statementCount: statements.length, dryRun: true, validated: true, tableCount: Number(tableCount.rows[0]?.count || 0), alreadyApplied: false });
      }

      const applied = await client.query(
        `INSERT INTO public.iyonicdb_migrations (project_id, name, checksum, statement_count)
         VALUES ($1, $2, $3, $4) RETURNING applied_at AS "appliedAt"`,
        [projectId, name, checksum, statements.length]
      );
      await client.query('COMMIT');
      res.status(201).json({ name, checksum, statementCount: statements.length, appliedAt: applied.rows[0].appliedAt, alreadyApplied: false });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (['42P07', '42701', '42710'].includes(error.code)) {
        return res.status(409).json({ message: 'The migration conflicts with an existing database object. No changes were applied.', code: error.code });
      }
      if (['57014', '55P03'].includes(error.code)) {
        return res.status(409).json({ message: 'The migration timed out or could not obtain a database lock. No changes were applied.', code: error.code });
      }
      console.error('IyonicDB migration failed:', error);
      const userSqlError = ['42601', '42P01', '42703', '42804', '42P16', '23502', '23503', '23505', '23514'].includes(error.code);
      res.status(error.status || (userSqlError ? 400 : 500)).json({ message: error.status ? error.message : 'The migration failed. No changes were applied.', code: error.code || 'MIGRATION_FAILED' });
    } finally {
      client.release();
    }
  });

  app.post('/api/iyonicdb/v1/projects/:projectId/query', async (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    try {
      const result = await runSqlSelect(db, req.params.projectId, req.body?.sql, req.body?.params || []);
      res.json(result);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.status ? error.message : 'The SQL query could not be executed.' });
    }
  });

  app.get('/api/iyonicdb/v1/projects/:projectId/tables/:table/rows', async (req, res) => {
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

  app.post('/api/iyonicdb/v1/projects/:projectId/tables/:table/rows', async (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    try {
      const row = await insertSqlRow(db, req.iyonicDbKey.userId, req.params.projectId, req.params.table, req.body?.row, req.iyonicDbKey.subscription);
      res.status(201).json(row);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not save table row.' });
    }
  });

  app.put('/api/iyonicdb/v1/projects/:projectId/tables/:table/rows/:rowId', async (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    try {
      const row = await updateSqlRow(db, req.iyonicDbKey.userId, req.params.projectId, req.params.table, req.params.rowId, req.body?.row, req.iyonicDbKey.subscription);
      res.json(row);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not update table row.' });
    }
  });

  app.delete('/api/iyonicdb/v1/projects/:projectId/tables/:table/rows/:rowId', async (req, res) => {
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

  app.get('/api/iyonicdb/v1/projects/:projectId/documents/:collection', async (req, res) => {
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

  app.post('/api/iyonicdb/v1/projects/:projectId/documents/:collection', async (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    if (!identifierPattern.test(req.params.collection) || !req.body?.document || Array.isArray(req.body.document) || typeof req.body.document !== 'object') {
      return res.status(400).json({ message: 'Provide a valid collection and JSON object document.' });
    }
    try {
      const document = await insertDocument(db, req.iyonicDbKey.userId, req.params.projectId, req.params.collection, req.body.document, req.iyonicDbKey.subscription);
      res.status(201).json(document);
    } catch (error) {
      if (error.status) return res.status(error.status).json({ message: error.message });
      console.error('IyonicDB API document creation failed:', error);
      res.status(500).json({ message: 'Could not save the document.' });
    }
  });

  app.put('/api/iyonicdb/v1/projects/:projectId/documents/:collection/:documentId', async (req, res) => {
    if (req.params.projectId !== req.iyonicDbKey.projectId) return res.status(403).json({ message: 'This key cannot access the requested project.' });
    if (!identifierPattern.test(req.params.collection) || !req.body?.document || Array.isArray(req.body.document) || typeof req.body.document !== 'object') {
      return res.status(400).json({ message: 'Provide a valid collection and JSON object document.' });
    }
    try {
      const document = await updateDocument(db, req.iyonicDbKey.userId, req.params.projectId, req.params.collection, req.params.documentId, req.body.document, req.iyonicDbKey.subscription);
      res.json(document);
    } catch (error) {
      res.status(error.status || 500).json({ message: error.status ? error.message : 'Could not update document.' });
    }
  });

  app.delete('/api/iyonicdb/v1/projects/:projectId/documents/:collection/:documentId', async (req, res) => {
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
