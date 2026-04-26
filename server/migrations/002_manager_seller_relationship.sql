-- Migration: Add manager-seller relationship and manager features
-- Run this after the initial schema is created

-- Add manager_id to sellers table (links seller to their manager)
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES seller_managers(id) ON DELETE SET NULL;

-- Add unique slug to seller_managers (their unique URL identifier)
ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;
ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE seller_managers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add pricing configuration to seller_managers
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

-- Add manager-specific customer tracking
ALTER TABLE customers ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES seller_managers(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sellers_manager_id ON sellers(manager_id);
CREATE INDEX IF NOT EXISTS idx_seller_managers_slug ON seller_managers(slug);
CREATE INDEX IF NOT EXISTS idx_customers_manager_id ON customers(manager_id);

-- Auto-generate slugs for existing seller_managers
UPDATE seller_managers 
SET slug = 'manager-' || SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL;
