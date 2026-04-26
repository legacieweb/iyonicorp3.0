import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration...');
    await client.query('BEGIN');

    const columns = [
      ['first_name', 'VARCHAR(255)'],
      ['last_name', 'VARCHAR(255)'],
      ['phone_number', 'VARCHAR(50)'],
      ['username', 'VARCHAR(255) UNIQUE'],
      ['last_selected_store_id', 'UUID REFERENCES sellers(id) ON DELETE SET NULL'],
      ['iyonicpay_opt_in', 'BOOLEAN DEFAULT FALSE']
    ];

    for (const [name, type] of columns) {
      try {
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${name} ${type}`);
        console.log(`✅ Column ${name} checked/added`);
      } catch (err) {
        console.error(`❌ Error adding column ${name}:`, err.message);
      }
    }

    // Add invoice_id and order_id to transactions
    try {
      await client.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL');
      await client.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL');
      console.log('✅ Columns checked/added to transactions');
    } catch (err) {
      console.error('❌ Error adding columns to transactions:', err.message);
    }

    try {
      await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
      await client.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('seller', 'seller_manager', 'manager_admin', 'customer'))");
      console.log('✅ Role constraint updated');
    } catch (err) {
      console.error('❌ Error updating role constraint:', err.message);
    }

    try {
      await client.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL');
      await client.query("ALTER TABLE invoices ADD COLUMN IF NOT EXISTS theme VARCHAR(50) DEFAULT 'indigo'");
      console.log('✅ Columns checked/added to invoices');
    } catch (err) {
      console.error('❌ Error adding columns to invoices:', err.message);
    }

    // Ensure IyonicPay tables and new features exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
          balance DECIMAL(15, 2) DEFAULT 0.00,
          currency VARCHAR(10) DEFAULT 'USD',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS transactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sender_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
          receiver_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
          amount DECIMAL(15, 2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'NGN',
          type VARCHAR(50),
          status VARCHAR(50) DEFAULT 'completed',
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
          amount DECIMAL(15, 2) NOT NULL,
          description TEXT,
          theme VARCHAR(50) DEFAULT 'indigo',
          status VARCHAR(50) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'cancelled')),
          link_token VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS withdrawals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          amount DECIMAL(15, 2) NOT NULL,
          bank_details JSONB NOT NULL,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS api_keys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
          api_key VARCHAR(255) UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Update Transactions constraints (simplified)
      ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
      ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('send', 'receive', 'request', 'deposit', 'withdrawal', 'invoice_payment', 'refund'));

      ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
      ALTER TABLE transactions ADD CONSTRAINT transactions_status_check CHECK (status IN ('pending', 'completed', 'cancelled', 'requested', 'failed'));

      -- Ensure bots table exists with all columns
      CREATE TABLE IF NOT EXISTS bots (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN ('support-pro', 'sales-genie', 'tech-guru')),
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
          training_data TEXT,
          deployments INTEGER DEFAULT 0,
          last_trained TIMESTAMP WITH TIME ZONE,
          widget_config JSONB DEFAULT '{"primaryColor": "#3b82f6", "greeting": "Hello! How can I help you today?", "bubbleIcon": "MessageSquare"}'::JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE bots ADD COLUMN IF NOT EXISTS widget_config JSONB DEFAULT '{"primaryColor": "#3b82f6", "greeting": "Hello! How can I help you today?", "bubbleIcon": "MessageSquare"}'::JSONB;
      ALTER TABLE bots ADD COLUMN IF NOT EXISTS last_trained TIMESTAMP WITH TIME ZONE;
      ALTER TABLE bots ADD COLUMN IF NOT EXISTS deployments INTEGER DEFAULT 0;
      ALTER TABLE bots ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'NGN';

      -- Ensure discounts table exists
      CREATE TABLE IF NOT EXISTS discounts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
          code VARCHAR(100),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping', 'cross_discount')),
          value DECIMAL(15, 2) DEFAULT 0,
          min_requirement JSONB DEFAULT NULL,
          buy_x_get_y JSONB DEFAULT NULL,
          cross_discount JSONB DEFAULT NULL,
          applies_to VARCHAR(50) NOT NULL CHECK (applies_to IN ('all_products', 'specific_products', 'specific_categories')),
          product_ids UUID[] DEFAULT NULL,
          category_ids VARCHAR(100)[] DEFAULT NULL,
          usage_limit INTEGER DEFAULT NULL,
          usage_count INTEGER DEFAULT 0,
          min_spend DECIMAL(15, 2) DEFAULT NULL,
          min_quantity INTEGER DEFAULT NULL,
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'scheduled', 'expired')),
          start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      DROP TRIGGER IF EXISTS update_discounts_updated_at ON discounts;
      CREATE TRIGGER update_discounts_updated_at BEFORE UPDATE ON discounts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    `);
    console.log('✅ IyonicPay tables and features checked/created');

    await client.query('COMMIT');
    console.log('🚀 Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
