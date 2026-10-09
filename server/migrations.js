import db from './db.js';

async function runMigrations() {
  console.log('Running migrations...');
  try {
    // Add shop_type to sellers if it doesn't exist
    await db.query(`
      ALTER TABLE sellers 
      ADD COLUMN IF NOT EXISTS shop_type VARCHAR(50) DEFAULT 'product' 
      CHECK (shop_type IN ('product', 'service'));
    `);

    await db.query(`
      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS acquired_themes JSONB NOT NULL DEFAULT '[]'::JSONB;
      UPDATE sellers SET acquired_themes = jsonb_build_array(theme->>'selectedTheme')
        WHERE theme->>'selectedTheme' IN ('tamira-salon', 'spa-retreat', 'elite-consulting', 'creative-studio', 'modern-wellness', 'nlmsongs', 'utorme', 'homeworker', 'car-rental', 'restaurant', 'instagram-vip', 'ixstream', 'tspp', 'sms')
          AND NOT (COALESCE(acquired_themes, '[]'::jsonb) ? (theme->>'selectedTheme'));
      UPDATE sellers SET acquired_themes = COALESCE(acquired_themes, '[]'::jsonb) || '"sms"'::jsonb
        WHERE theme->>'selectedTheme' = 'sms'
          AND NOT (COALESCE(acquired_themes, '[]'::jsonb) ? 'sms');
      UPDATE sellers SET acquired_themes = COALESCE((
          SELECT jsonb_agg(elem) FROM jsonb_array_elements(acquired_themes) AS t(elem) WHERE elem::text != '"sms"'
        ), '[]'::jsonb)
        WHERE theme->>'selectedTheme' != 'sms'
          AND COALESCE(acquired_themes, '[]'::jsonb) ? 'sms';
      CREATE TABLE IF NOT EXISTS vip_theme_purchases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        theme_id VARCHAR(100) NOT NULL,
        reference VARCHAR(255) NOT NULL UNIQUE,
        amount DECIMAL(12, 2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS vip_theme_offers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        theme_id VARCHAR(100) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
        message TEXT NOT NULL DEFAULT '',
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add type to products if it doesn't exist
    await db.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'product' 
      CHECK (type IN ('product', 'service')),
      ADD COLUMN IF NOT EXISTS videos TEXT[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS urls TEXT[] DEFAULT '{}';
    `);

    // Add domain approval columns to sellers
    await db.query(`
      ALTER TABLE sellers
      ADD COLUMN IF NOT EXISTS requested_subdomain VARCHAR(255),
      ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{"primaryColor": "#3b82f6", "secondaryColor": "#1e40af", "fontFamily": "Inter"}'::JSONB,
      ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{"facebook": "", "instagram": "", "twitter": "", "linkedin": "", "youtube": "", "tiktok": ""}'::JSONB,
      ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{"email": "", "phone": "", "address": "", "whatsapp": ""}'::JSONB,
      ADD COLUMN IF NOT EXISTS additional_pages JSONB DEFAULT '[]'::JSONB;
    `);

    // Add manager_id to sellers table (links seller to their manager)
    await db.query(`
      ALTER TABLE sellers ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES seller_managers(id) ON DELETE SET NULL;
    `);

    // Add unique slug to seller_managers (their unique URL identifier)
    await db.query(`
      ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
    `);
    await db.query(`
      ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
    `);
    await db.query(`
      ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS description TEXT;
    `);
    await db.query(`
      ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS logo TEXT;
    `);
    await db.query(`
      ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    `);

    // Add pricing configuration to seller_managers
    await db.query(`
      ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS pricing_config JSONB DEFAULT '{
        "plans": {
          "starter": {"price": 29, "status": "active", "features": ["Up to 50 products", "Basic analytics", "Email support"]},
          "professional": {"price": 79, "status": "active", "features": ["Unlimited products", "Advanced analytics", "Priority support", "Custom domain"]},
          "enterprise": {"price": 199, "status": "active", "features": ["Everything in Pro", "White-label options", "Dedicated support", "API access"]}
        },
        "currency": "USD",
        "billingCycle": "monthly",
        "customBranding": true
      }'::JSONB;
    `);

    // SMS subscription plans and school subscriptions
    await db.query(`
      CREATE TABLE IF NOT EXISTS sms_subscription_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price_cents INTEGER NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        interval_type VARCHAR(20) NOT NULL DEFAULT 'month' CHECK (interval_type IN ('month', 'year')),
        features JSONB DEFAULT '[]'::JSONB,
        max_students INTEGER,
        max_teachers INTEGER,
        max_classes INTEGER,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sms_subscription_plans_active ON sms_subscription_plans(is_active);
      CREATE INDEX IF NOT EXISTS idx_sms_subscription_plans_sort ON sms_subscription_plans(sort_order);

      CREATE TABLE IF NOT EXISTS sms_school_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL UNIQUE REFERENCES sellers(id) ON DELETE CASCADE,
        plan_id UUID NOT NULL REFERENCES sms_subscription_plans(id),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
        current_period_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        current_period_end TIMESTAMP WITH TIME ZONE,
        cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sms_school_subscriptions_seller ON sms_school_subscriptions(seller_id);
      CREATE INDEX IF NOT EXISTS idx_sms_school_subscriptions_plan ON sms_school_subscriptions(plan_id);
      CREATE INDEX IF NOT EXISTS idx_sms_school_subscriptions_status ON sms_school_subscriptions(status);

      INSERT INTO sms_subscription_plans (name, description, price_cents, currency, interval_type, features, max_students, max_teachers, max_classes, sort_order, is_active) VALUES
        ('Starter', 'Perfect to get started with SMS', 0, 'USD', 'month', '["Up to 100 students", "Up to 10 teachers", "Up to 5 classes", "Basic attendance", "Student records"]', 100, 10, 5, 0, TRUE),
        ('Growth', 'For growing schools needing more capacity', 4900, 'USD', 'month', '["Up to 500 students", "Up to 50 teachers", "Unlimited classes & sections", "Advanced attendance", "Fee management", "Grade tracking"]', 500, 50, NULL, 1, TRUE),
        ('Pro', 'For established schools with full features', 9900, 'USD', 'month', '["Up to 2,000 students", "Up to 200 teachers", "Unlimited everything", "API access", "Timetable & scheduling", "Exam management", "Messaging & announcements"]', 2000, 200, NULL, 2, TRUE),
        ('Enterprise', 'For large institutions with premium support', 29900, 'USD', 'month', '["Unlimited students & teachers", "White-label customization", "Dedicated account manager", "Custom integrations", "Priority 24/7 support"]', NULL, NULL, NULL, 3, TRUE)
      ON CONFLICT DO NOTHING;
    `);

    // Add manager-specific customer tracking
    await db.query(`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES seller_managers(id) ON DELETE SET NULL;
    `);

    // Create indexes for faster lookups
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_sellers_manager_id ON sellers(manager_id);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_seller_managers_slug ON seller_managers(slug);
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_manager_id ON customers(manager_id);
    `);

    // Auto-generate slugs for existing seller_managers
    await db.query(`
      UPDATE seller_managers 
      SET slug = 'manager-' || SUBSTRING(id::text, 1, 8)
      WHERE slug IS NULL;
    `);

    // Create Apex POS tables
    await db.query(`
      CREATE TABLE IF NOT EXISTS pos_employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'manager', 'admin', 'cashier', 'kitchen', 'server')),
        pin_hash TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        hours_this_week INTEGER DEFAULT 0,
        total_sales DECIMAL(12,2) DEFAULT 0,
        photo TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_pos_employees_seller ON pos_employees(seller_id);

      CREATE TABLE IF NOT EXISTS pos_tables (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        table_number VARCHAR(50) NOT NULL,
        seats INTEGER DEFAULT 4,
        status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'seated', 'ordering', 'served')),
        section VARCHAR(100),
        current_order_id UUID,
        assigned_employee_id UUID REFERENCES pos_employees(id),
        customer_count INTEGER,
        reserved_at TIMESTAMP WITH TIME ZONE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_pos_tables_seller ON pos_tables(seller_id);
      CREATE INDEX IF NOT EXISTS idx_pos_tables_status ON pos_tables(status);

      CREATE TABLE IF NOT EXISTS pos_shifts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES pos_employees(id),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP WITH TIME ZONE,
        opening_float DECIMAL(12,2) NOT NULL DEFAULT 0,
        closing_amount DECIMAL(12,2),
        cash_sales DECIMAL(12,2) DEFAULT 0,
        card_sales DECIMAL(12,2) DEFAULT 0,
        cash_counted DECIMAL(12,2),
        variance DECIMAL(12,2),
        status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
      );
      CREATE INDEX IF NOT EXISTS idx_pos_shifts_seller ON pos_shifts(seller_id);
      CREATE INDEX IF NOT EXISTS idx_pos_shifts_employee ON pos_shifts(employee_id);
      CREATE INDEX IF NOT EXISTS idx_pos_shifts_status ON pos_shifts(status);

      CREATE TABLE IF NOT EXISTS pos_inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        current_stock DECIMAL(12,3) DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'pcs',
        low_stock_threshold DECIMAL(12,3) DEFAULT 0,
        cost DECIMAL(12,2) DEFAULT 0,
        supplier TEXT,
        last_restocked TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_pos_inventory_seller ON pos_inventory(seller_id);

      CREATE TABLE IF NOT EXISTS pos_inventory_adjustments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        item_id UUID NOT NULL REFERENCES pos_inventory(id) ON DELETE CASCADE,
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL CHECK (type IN ('restock', 'usage', 'adjustment')),
        quantity DECIMAL(12,3) NOT NULL,
        reason TEXT,
        employee_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pos_loyalty (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID,
        customer_phone VARCHAR(50),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        points_balance INTEGER NOT NULL DEFAULT 0,
        lifetime_points INTEGER NOT NULL DEFAULT 0,
        tier VARCHAR(20) DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_pos_loyalty_seller ON pos_loyalty(seller_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_loyalty_seller_phone ON pos_loyalty(seller_id, customer_phone) WHERE customer_phone IS NOT NULL;

      CREATE TABLE IF NOT EXISTS pos_loyalty_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        loyalty_id UUID NOT NULL REFERENCES pos_loyalty(id) ON DELETE CASCADE,
        order_id UUID,
        points_earned INTEGER NOT NULL DEFAULT 0,
        points_redeemed INTEGER NOT NULL DEFAULT 0,
        note TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pos_event_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
        level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'error', 'success')),
        source VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        order_id UUID,
        user_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_pos_event_log_seller ON pos_event_log(seller_id);
    `);

    // Add audio/thumbnail bytea columns to nlm_songs for database-stored media
    await db.query(`
      ALTER TABLE nlm_songs
        ADD COLUMN IF NOT EXISTS audio_data BYTEA,
        ADD COLUMN IF NOT EXISTS audio_mime_type TEXT,
        ADD COLUMN IF NOT EXISTS thumbnail_data BYTEA,
        ADD COLUMN IF NOT EXISTS thumbnail_mime_type TEXT;
    `);

    console.log('✅ Migrations completed successfully');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    process.exit();
  }
}

runMigrations();
