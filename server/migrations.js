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

    console.log('✅ Migrations completed successfully');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    process.exit();
  }
}

runMigrations();
