import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { mountIyonicDbRoutes, runSqlSelect } from './iyonicdbRoutes.js';

const projectId = '35e6cf75-42b5-4ffb-9e7e-9a07bdbf7b32';

const makeClient = () => {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('information_schema.columns')) {
        return {
          rows: ['id', 'owner_id', 'label', 'created_at'].map((column_name) => ({ column_name })),
          rowCount: 4,
        };
      }
      return {
        rows: [{ id: 'row-id', label: 'stored value' }],
        rowCount: 1,
        fields: [{ name: 'id' }, { name: 'label' }],
      };
    },
  };
};

test('runs parameterized SELECT inside the project schema', async () => {
  const client = makeClient();
  const result = await runSqlSelect(
    client,
    projectId,
    'SELECT id, label FROM notes WHERE owner_id = $1 ORDER BY id DESC LIMIT 25',
    ['owner-1']
  );

  assert.deepEqual(result.rows, [{ id: 'row-id', label: 'stored value' }]);
  assert.equal(result.rowCount, 1);
  assert.match(client.calls[1].sql, /FROM "idb_35e6cf7542b54ffb9e7e9a07bdbf7b32"\."notes"/);
  assert.deepEqual(client.calls[1].params, ['owner-1']);
});

test('rejects arbitrary statements, qualified relations, and SQL functions', async () => {
  const client = makeClient();
  await assert.rejects(runSqlSelect(client, projectId, 'SELECT * FROM notes; DROP TABLE users', []), { status: 400 });
  await assert.rejects(runSqlSelect(client, projectId, 'SELECT * FROM public.users', []), { status: 400 });
  await assert.rejects(runSqlSelect(client, projectId, 'SELECT pg_sleep(1) FROM notes', []), { status: 400 });
});

test('requires sequential parameters and columns owned by the project table', async () => {
  const client = makeClient();
  await assert.rejects(
    runSqlSelect(client, projectId, 'SELECT * FROM notes WHERE owner_id = $2', ['owner-1']),
    { status: 400 }
  );
  await assert.rejects(
    runSqlSelect(client, projectId, 'SELECT password FROM notes', []),
    { status: 400 }
  );
});

test('rejects access to internal document storage and caps result limits', async () => {
  const client = makeClient();
  await assert.rejects(runSqlSelect(client, projectId, 'SELECT * FROM iyonicdb_documents', []), { status: 400 });
  await runSqlSelect(client, projectId, 'SELECT * FROM notes LIMIT 9000', []);
  assert.match(client.calls[1].sql, /LIMIT 500$/);
});

test('serves the configured live USD plan limits from the API', async () => {
  const app = express();
  mountIyonicDbRoutes(app, () => {}, {}, () => {}, Promise.resolve(true));
  const server = app.listen(0);
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/iyonicdb/plans`);
    const plans = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(plans.map(({ id, price, storageGb, requestsPerMonth }) => ({ id, price, storageGb, requestsPerMonth })), [
      { id: 'launch', price: 10, storageGb: 2, requestsPerMonth: 1_000_000 },
      { id: 'growth', price: 35, storageGb: 10, requestsPerMonth: 10_000_000 },
      { id: 'scale', price: 70, storageGb: 50, requestsPerMonth: 50_000_000 },
    ]);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
