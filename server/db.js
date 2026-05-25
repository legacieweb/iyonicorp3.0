import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

// ✅ Safe handling of DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not defined in .env');
}

// ✅ Detect SSL only if needed (for cloud DBs)
const useSSL =
  databaseUrl &&
  (databaseUrl.includes('sslmode=require') || databaseUrl.includes('ssl=true'));

// ✅ Create pool safely
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

// ✅ Test connection immediately (helps debugging)
pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL'))
  .catch(err => console.error('❌ PostgreSQL connection error:', err.message));

// Query helper
export const query = (text, params) => pool.query(text, params);

// Initialize DB schema
export const initDb = async () => {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');

    if (!fs.existsSync(schemaPath)) {
      console.warn('⚠️ schema.sql not found, skipping DB init');
      return;
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Wrap schema in a transaction to ensure atomicity
    await pool.query('BEGIN');
    try {
      await pool.query(schema);

      // Ensure new columns exist for existing tables
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_selected_store_id UUID REFERENCES sellers(id) ON DELETE SET NULL;
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('seller', 'seller_manager', 'manager_admin', 'customer'));
        
        -- Update orders status check constraint
        ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
        ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'refunded'));
        
        -- Ensure sellers columns exist
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS shop_type VARCHAR(50) DEFAULT 'product' CHECK (shop_type IN ('product', 'service'));
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS shipping_policy TEXT;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS return_policy TEXT;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS privacy_policy TEXT;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS terms_of_service TEXT;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{"primaryColor": "#3b82f6", "secondaryColor": "#1e40af", "fontFamily": "Inter"}'::JSONB;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{"facebook": "", "instagram": "", "twitter": "", "linkedin": "", "youtube": "", "tiktok": ""}'::JSONB;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{"email": "", "phone": "", "address": "", "whatsapp": ""}'::JSONB;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS payment_gateways JSONB DEFAULT '[]'::JSONB;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS additional_pages JSONB DEFAULT '[]'::JSONB;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS requested_subdomain VARCHAR(255);
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS delivery_locations JSONB DEFAULT '[]'::JSONB;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS payment_terms JSONB DEFAULT '{"methods": ["site"], "depositPercentage": 50, "rules": "all"}'::JSONB;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES seller_managers(id) ON DELETE SET NULL;
        
        -- Ensure products columns exist
        ALTER TABLE products ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'product' CHECK (type IN ('product', 'service'));
        ALTER TABLE products ADD COLUMN IF NOT EXISTS videos TEXT[] DEFAULT '{}';
        ALTER TABLE products ADD COLUMN IF NOT EXISTS urls TEXT[] DEFAULT '{}';

        -- Ensure seller_managers columns exist
        ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
        ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
        ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS logo TEXT;
        ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS pricing_config JSONB DEFAULT '{"plans": {"starter": {"price": 29, "status": "active", "features": ["Up to 50 products", "Basic analytics", "Email support"]}, "professional": {"price": 79, "status": "active", "features": ["Unlimited products", "Advanced analytics", "Priority support", "Custom domain"]}, "enterprise": {"price": 199, "status": "active", "features": ["Everything in Pro", "White-label options", "Dedicated support", "API access"]}}, "currency": "USD", "billingCycle": "monthly", "customBranding": true}'::JSONB;

        -- Ensure customers columns exist
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES seller_managers(id) ON DELETE SET NULL;
        
        -- Create unique constraint for user-seller relationship if it doesn't exist
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_customers_user_seller') THEN
                ALTER TABLE customers ADD CONSTRAINT idx_customers_user_seller UNIQUE (user_id, seller_id);
            END IF;
        END $$;

        -- Ensure bots columns exist
        ALTER TABLE bots ADD COLUMN IF NOT EXISTS last_trained TIMESTAMP WITH TIME ZONE;
        ALTER TABLE bots ADD COLUMN IF NOT EXISTS widget_config JSONB DEFAULT '{"primaryColor": "#3b82f6", "greeting": "Hello! How can I help you today?", "bubbleIcon": "MessageSquare"}'::JSONB;
        ALTER TABLE bots ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
        ALTER TABLE bots ADD COLUMN IF NOT EXISTS deployments INTEGER DEFAULT 0;
        ALTER TABLE bots ADD COLUMN IF NOT EXISTS interactions INTEGER DEFAULT 0;

        -- Cheques table
        CREATE TABLE IF NOT EXISTS cheques (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            issuer_id UUID REFERENCES users(id) ON DELETE CASCADE,
            recipient_email VARCHAR(255),
            amount DECIMAL(15, 2) NOT NULL,
            currency VARCHAR(10) DEFAULT 'USD',
            token VARCHAR(100) UNIQUE NOT NULL,
            pin_hash TEXT NOT NULL,
            status VARCHAR(50) DEFAULT 'issued' CHECK (status IN ('issued', 'claimed', 'cancelled', 'expired')),
            expires_at TIMESTAMP WITH TIME ZONE,
            claimed_by UUID REFERENCES users(id) ON DELETE SET NULL,
            claimed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Ensure invoices has is_reusable and usage columns
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_reusable BOOLEAN DEFAULT FALSE;
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS usage_limit INTEGER DEFAULT NULL;
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

        -- Ensure avatar column exists
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;

        -- Ensure global theme column exists
        ALTER TABLE users ADD COLUMN IF NOT EXISTS iyonicpay_theme VARCHAR(50) DEFAULT 'professional';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS iyonicpay_opt_in BOOLEAN DEFAULT FALSE;

        -- Ensure invoices custom text columns exist
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS custom_title VARCHAR(255);
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS custom_button_text VARCHAR(100);

        -- Ensure orders refund_reason column exists
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reason TEXT;

        -- Ensure transactions currency column exists
        ALTER TABLE transactions ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';

        -- User Addresses table
        CREATE TABLE IF NOT EXISTS user_addresses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL, -- e.g., "Home", "Office"
            recipient_name VARCHAR(255) NOT NULL,
            phone_number VARCHAR(50) NOT NULL,
            street_address TEXT NOT NULL,
            city VARCHAR(100) NOT NULL,
            state VARCHAR(100),
            postal_code VARCHAR(20),
            country VARCHAR(100) NOT NULL,
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Social Media Accounts table
        CREATE TABLE IF NOT EXISTS social_media_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
            platform VARCHAR(50) NOT NULL,
            username VARCHAR(255) NOT NULL,
            profile_url TEXT,
            access_token TEXT,
            refresh_token TEXT,
            expires_at TIMESTAMP WITH TIME ZONE,
            followers INTEGER DEFAULT 0,
            is_connected BOOLEAN DEFAULT TRUE,
            last_synced TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(seller_id, platform)
        );

        -- Email Marketing Settings table
        CREATE TABLE IF NOT EXISTS email_marketing_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE UNIQUE,
            provider VARCHAR(50) NOT NULL,
            from_email VARCHAR(255) NOT NULL,
            from_name VARCHAR(255) NOT NULL,
            reply_to VARCHAR(255),
            smtp_host VARCHAR(255),
            smtp_port INTEGER,
            smtp_user VARCHAR(255),
            smtp_password TEXT,
            api_key TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            is_verified BOOLEAN DEFAULT FALSE,
            sent_count INTEGER DEFAULT 0,
            last_used_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Email Templates table
        CREATE TABLE IF NOT EXISTS email_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            slug VARCHAR(255) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            html_content TEXT NOT NULL,
            plain_text_content TEXT,
            category VARCHAR(50) DEFAULT 'custom',
            is_default BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            variables JSONB DEFAULT '[]'::JSONB,
            preview_image TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(seller_id, slug)
        );

        -- Email Campaigns table
        CREATE TABLE IF NOT EXISTS email_campaigns (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            html_content TEXT NOT NULL,
            plain_text_content TEXT,
            template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
            recipient_type VARCHAR(50) NOT NULL,
            segment_filter JSONB,
            custom_recipients JSONB,
            scheduled_at TIMESTAMP WITH TIME ZONE,
            sent_at TIMESTAMP WITH TIME ZONE,
            status VARCHAR(50) DEFAULT 'draft',
            total_recipients INTEGER DEFAULT 0,
            delivered_count INTEGER DEFAULT 0,
            opened_count INTEGER DEFAULT 0,
            clicked_count INTEGER DEFAULT 0,
            bounced_count INTEGER DEFAULT 0,
            complaint_count INTEGER DEFAULT 0,
            unsubscribe_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Social Media Posts table
        CREATE TABLE IF NOT EXISTS social_media_posts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
            account_id UUID REFERENCES social_media_accounts(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            image_url TEXT,
            link_url TEXT,
            scheduled_at TIMESTAMP WITH TIME ZONE,
            posted_at TIMESTAMP WITH TIME ZONE,
            status VARCHAR(50) DEFAULT 'draft',
            post_url TEXT,
            error_message TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Discounts table
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

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_sellers_manager_id ON sellers(manager_id);
        CREATE INDEX IF NOT EXISTS idx_seller_managers_slug ON seller_managers(slug);
        CREATE INDEX IF NOT EXISTS idx_customers_manager_id ON customers(manager_id);
      `);

      await pool.query('COMMIT');
      console.log('✅ Database schema initialized and updated');
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
  }
};

export default {
  query,
  initDb,
  pool
};