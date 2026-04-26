const pkg = require('pg');
const { Pool } = pkg;
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Adding columns...');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(255)');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(255)');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50)');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE');
    await client.query("ALTER TABLE sellers ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD'");
    await client.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD'");
    await client.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD'");
    
    // Product columns
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS videos TEXT[]');
    await client.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS urls TEXT[]');

    // Seller Managers columns
    await client.query('ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE');
    await client.query('ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS subscription JSONB DEFAULT \'{"plan": "starter", "status": "active", "startDate": null, "endDate": null}\'::JSONB');
    await client.query('ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS pricing_config JSONB');
    await client.query('ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)');
    await client.query('ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS description TEXT');
    await client.query('ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS logo TEXT');
    await client.query('ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE');

    // Categories table
    await client.query(`
        CREATE TABLE IF NOT EXISTS categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(seller_id, name)
        )
    `);
    
    await client.query('DROP TRIGGER IF EXISTS update_categories_updated_at ON categories');
    await client.query('CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()');

    console.log('✅ Columns and tables added successfully');
    
    // Update role constraint
    try {
        await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        await client.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('seller', 'seller_manager', 'manager_admin', 'customer'))");
        console.log('✅ Role constraint updated');
    } catch (e) {
        console.log('⚠️ Constraint update note:', e.message);
    }

    // Update orders status constraint
    try {
        await client.query('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check');
        await client.query("ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'refunded'))");
        console.log('✅ Orders status constraint updated');
    } catch (e) {
        console.log('⚠️ Orders status constraint update note:', e.message);
    }

    // Update wallets table to have UNIQUE user_id
    try {
        console.log('Cleaning up duplicate wallets...');
        await client.query(`
            DELETE FROM wallets 
            WHERE id IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY balance DESC, created_at DESC) as rn
                    FROM wallets
                ) t WHERE t.rn > 1
            )
        `);
        console.log('✅ Duplicate wallets removed');
        
        await client.query('ALTER TABLE wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id)');
        console.log('✅ Wallets unique constraint added');
    } catch (e) {
        console.log('⚠️ Wallets constraint note:', e.message);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
