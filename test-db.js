import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const databaseUrl = process.env.DATABASE_URL;

console.log('Testing connection to:', databaseUrl);

const pool = new Pool({
  connectionString: databaseUrl,
});

async function test() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Connection successful:', res.rows[0]);

    const uuidRes = await pool.query('SELECT gen_random_uuid()');
    console.log('✅ gen_random_uuid() works:', uuidRes.rows[0]);

    const usersRes = await pool.query('SELECT count(*) FROM users');
    console.log('User count:', usersRes.rows[0].count);

    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in DB:', tablesRes.rows.map(r => r.table_name));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

test();
