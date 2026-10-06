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
        ALTER TABLE nlm_songs ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_nlm_songs_seller_created ON nlm_songs(seller_id, created_at DESC);

        CREATE TABLE IF NOT EXISTS nlm_playlists (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          cover_url TEXT,
          is_public BOOLEAN NOT NULL DEFAULT FALSE,
          track_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_nlm_playlists_user ON nlm_playlists(user_id);

        CREATE TABLE IF NOT EXISTS nlm_playlist_items (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          playlist_id UUID REFERENCES nlm_playlists(id) ON DELETE CASCADE NOT NULL,
          track_id UUID REFERENCES nlm_songs(id) ON DELETE CASCADE NOT NULL,
          position INTEGER NOT NULL,
          added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_nlm_playlist_items_playlist ON nlm_playlist_items(playlist_id, position);
        CREATE INDEX IF NOT EXISTS idx_nlm_playlist_items_track ON nlm_playlist_items(track_id);

        CREATE TABLE IF NOT EXISTS nlm_listening_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
          track_id UUID REFERENCES nlm_songs(id) ON DELETE CASCADE,
          played_seconds NUMERIC(10,2) DEFAULT 0,
          duration NUMERIC(10,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_nlm_history_user_created ON nlm_listening_history(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_nlm_history_track ON nlm_listening_history(track_id);

        CREATE TABLE IF NOT EXISTS nlm_play_counts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
          track_id UUID REFERENCES nlm_songs(id) ON DELETE CASCADE,
          play_date DATE NOT NULL,
          count INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_nlm_play_counts_track_date ON nlm_play_counts(track_id, play_date);

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
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS acquired_themes JSONB NOT NULL DEFAULT '[]'::JSONB;
        UPDATE sellers SET acquired_themes = jsonb_build_array(theme->>'selectedTheme')
          WHERE theme->>'selectedTheme' IN ('tamira-salon', 'spa-retreat', 'elite-consulting', 'creative-studio', 'modern-wellness', 'nlmsongs', 'utorme', 'homeworker', 'car-rental', 'restaurant', 'instagram-vip', 'ixstream', 'tspp')
            AND NOT (COALESCE(acquired_themes, '[]'::jsonb) ? (theme->>'selectedTheme'));
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{"facebook": "", "instagram": "", "twitter": "", "linkedin": "", "youtube": "", "tiktok": ""}'::JSONB;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS contact_info JSONB DEFAULT '{"email": "", "phone": "", "address": "", "whatsapp": ""}'::JSONB;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS payment_gateways JSONB DEFAULT '[]'::JSONB;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS additional_pages JSONB DEFAULT '[]'::JSONB;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS requested_subdomain VARCHAR(255);
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS delivery_locations JSONB DEFAULT '[]'::JSONB;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS payment_terms JSONB DEFAULT '{"methods": ["site"], "depositPercentage": 50, "rules": "all"}'::JSONB;
        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES seller_managers(id) ON DELETE SET NULL;

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

        -- Ensure orders columns exist
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15, 2);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_total DECIMAL(15, 2);
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount JSONB;
         ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(15, 2) DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_location TEXT;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(15, 2) DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(15, 2) DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'site';
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES seller_managers(id) ON DELETE SET NULL;
        
        -- Create unique constraint for user-seller relationship if it doesn't exist
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_customers_user_seller') THEN
                ALTER TABLE customers ADD CONSTRAINT idx_customers_user_seller UNIQUE (user_id, seller_id);
            END IF;
        END $$;

        -- Password Reset Tokens table
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
            token VARCHAR(6),
            reset_token VARCHAR(100),
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Password reset indexes
        CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_password_reset_reset_token ON password_reset_tokens(reset_token);

        CREATE TABLE IF NOT EXISTS manager_invitations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          commission_rate DECIMAL(5, 2) DEFAULT 0.05,
          invitation_token VARCHAR(100) UNIQUE NOT NULL,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          accepted_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_manager_invitations_email ON manager_invitations(email);
        CREATE INDEX IF NOT EXISTS idx_manager_invitations_status ON manager_invitations(status);

        -- Ensure bots columns exist
        ALTER TABLE bots ADD COLUMN IF NOT EXISTS last_trained TIMESTAMP WITH TIME ZONE;
        ALTER TABLE bots ADD COLUMN IF NOT EXISTS widget_config JSONB DEFAULT '{"primaryColor": "#3b82f6", "greeting": "Hello! How can I help you today?", "bubbleIcon": "MessageSquare"}'::JSONB;
        ALTER TABLE bots ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
        ALTER TABLE bots ADD COLUMN IF NOT EXISTS deployments INTEGER DEFAULT 0;
        ALTER TABLE bots ADD COLUMN IF NOT EXISTS interactions INTEGER DEFAULT 0;
        ALTER TABLE bots ADD COLUMN IF NOT EXISTS custom_responses JSONB DEFAULT '{}'::JSONB;
        ALTER TABLE bots ADD COLUMN IF NOT EXISTS personality JSONB DEFAULT '{"tone": "professional", "style": "helpful"}'::JSONB;
        ALTER TABLE bots ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{"description": "", "responseLength": "balanced", "language": "English", "instructions": "", "allowedKnowledge": ["business", "products", "policies", "faqs", "documents"], "permissions": {}, "enabledActions": [], "escalation": {"enabled": true, "afterRepeatedFailures": 2}, "welcomeMessage": "", "suggestedQuestions": []}'::JSONB;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_bots_one_active_per_category
          ON bots (seller_id, type) WHERE status = 'active';

        CREATE TABLE IF NOT EXISTS bot_knowledge_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(), seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL, document_type VARCHAR(50) NOT NULL DEFAULT 'text', source VARCHAR(100) NOT NULL DEFAULT 'seller',
          source_url TEXT, content TEXT NOT NULL, metadata JSONB DEFAULT '{}'::JSONB,
          status VARCHAR(30) NOT NULL DEFAULT 'active', created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_bot_knowledge_documents_seller_created ON bot_knowledge_documents (seller_id, created_at DESC);
        CREATE TABLE IF NOT EXISTS bot_faqs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(), seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
          question TEXT NOT NULL, answer TEXT NOT NULL, category VARCHAR(100), source VARCHAR(100) DEFAULT 'seller',
          status VARCHAR(30) NOT NULL DEFAULT 'active', created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_bot_faqs_seller_status ON bot_faqs (seller_id, status);
        CREATE TABLE IF NOT EXISTS bot_conversations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(), seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
          bot_id UUID REFERENCES bots(id) ON DELETE SET NULL, session_id VARCHAR(255), customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'active', resolution_status VARCHAR(30) DEFAULT 'unresolved', metadata JSONB DEFAULT '{}'::JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_bot_conversations_seller_created ON bot_conversations (seller_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_bot_conversations_bot ON bot_conversations (bot_id);
        CREATE TABLE IF NOT EXISTS bot_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id UUID NOT NULL REFERENCES bot_conversations(id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL, content TEXT NOT NULL, sources JSONB DEFAULT '[]'::JSONB, tool_calls JSONB DEFAULT '[]'::JSONB,
          metadata JSONB DEFAULT '{}'::JSONB, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_bot_messages_conversation_created ON bot_messages (conversation_id, created_at);
        CREATE TABLE IF NOT EXISTS bot_knowledge_gaps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(), seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
          bot_id UUID REFERENCES bots(id) ON DELETE SET NULL, question TEXT NOT NULL, frequency INTEGER NOT NULL DEFAULT 1,
          last_asked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, suggested_category VARCHAR(100), sample_response TEXT,
          status VARCHAR(30) NOT NULL DEFAULT 'unresolved', created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, UNIQUE (seller_id, question)
        );
        CREATE INDEX IF NOT EXISTS idx_bot_knowledge_gaps_seller_status ON bot_knowledge_gaps (seller_id, status, frequency DESC);

        -- Cheques table
        CREATE TABLE IF NOT EXISTS cheques (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            issuer_id UUID REFERENCES users(id) ON DELETE CASCADE,
            recipient_email VARCHAR(255),
            amount DECIMAL(15, 2) NOT NULL,
            currency VARCHAR(10) DEFAULT 'USD',
            token VARCHAR(100) UNIQUE NOT NULL,
            pin_hash TEXT NOT NULL,
            include_pin_in_email BOOLEAN DEFAULT FALSE,
            status VARCHAR(50) DEFAULT 'issued' CHECK (status IN ('issued', 'claimed', 'cancelled', 'expired')),
            expires_at TIMESTAMP WITH TIME ZONE,
            claimed_by UUID REFERENCES users(id) ON DELETE SET NULL,
            claimed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Ensure include_pin_in_email column exists for existing cheques table
        ALTER TABLE cheques ADD COLUMN IF NOT EXISTS include_pin_in_email BOOLEAN DEFAULT FALSE;

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

        -- Admin Activities table
        CREATE TABLE IF NOT EXISTS admin_activities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            action VARCHAR(100) NOT NULL,
            description TEXT NOT NULL,
            entity_type VARCHAR(50),
            entity_id UUID,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            user_name VARCHAR(255),
            user_email VARCHAR(255),
            severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),
            metadata JSONB DEFAULT '{}'::JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE admin_activities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

        CREATE INDEX IF NOT EXISTS idx_admin_activities_created_at ON admin_activities(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_admin_activities_action ON admin_activities(action);

        ALTER TABLE sellers ADD COLUMN IF NOT EXISTS auto_renew JSONB DEFAULT '{"iyonicshop": {"enabled": false, "plan": null}, "iyonicbots": {"enabled": false, "plan": null}}'::JSONB;
        CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON sellers(user_id);
        CREATE INDEX IF NOT EXISTS idx_sellers_auto_renew ON sellers USING GIN (auto_renew);

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

        -- IxStream content tables
        CREATE TABLE IF NOT EXISTS ixstream_content (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          type VARCHAR(20) NOT NULL CHECK (type IN ('movie', 'tvshow')),
          genre VARCHAR(100) NOT NULL DEFAULT '',
          tags TEXT[] NOT NULL DEFAULT '{}',
          release_year INTEGER,
          duration INTEGER,
          rating DECIMAL(3,1) DEFAULT 0,
          thumbnail_url TEXT,
          video_url TEXT NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_ixstream_content_active_created ON ixstream_content(is_active, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_ixstream_content_seller ON ixstream_content(seller_id);

        CREATE TABLE IF NOT EXISTS ixstream_seasons (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          content_id UUID NOT NULL REFERENCES ixstream_content(id) ON DELETE CASCADE,
          season_number INTEGER NOT NULL,
          title VARCHAR(255),
          description TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_ixstream_seasons_content ON ixstream_seasons(content_id);

        CREATE TABLE IF NOT EXISTS ixstream_episodes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          season_id UUID NOT NULL REFERENCES ixstream_seasons(id) ON DELETE CASCADE,
          episode_number INTEGER NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          duration INTEGER,
          video_url TEXT NOT NULL,
          thumbnail_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_ixstream_episodes_season ON ixstream_episodes(season_id);

        CREATE TABLE IF NOT EXISTS ixstream_subscription_plans (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          price_cents INTEGER NOT NULL,
          currency VARCHAR(10) NOT NULL DEFAULT 'USD',
          interval_type VARCHAR(20) NOT NULL CHECK (interval_type IN ('day', 'week', 'month', 'year')),
          interval_count INTEGER NOT NULL DEFAULT 1,
          features TEXT[] NOT NULL DEFAULT '{}',
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          sort_order INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_ixstream_plans_seller ON ixstream_subscription_plans(seller_id);

        CREATE TABLE IF NOT EXISTS ixstream_subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
          plan_id UUID NOT NULL REFERENCES ixstream_subscription_plans(id),
          status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'expired')),
          current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
          current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
          cancel_at_period_end BOOLEAN DEFAULT FALSE,
          payment_reference VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_ixstream_subscriptions_user ON ixstream_subscriptions(user_id);
        CREATE INDEX IF NOT EXISTS idx_ixstream_subscriptions_seller ON ixstream_subscriptions(seller_id);

        -- IxStream content tables
        CREATE TABLE IF NOT EXISTS ixstream_content (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            type VARCHAR(20) NOT NULL CHECK (type IN ('movie', 'tvshow')),
            genre VARCHAR(100) NOT NULL DEFAULT '',
            tags TEXT[] NOT NULL DEFAULT '{}',
            release_year INTEGER,
            duration INTEGER,
            rating DECIMAL(3,1) DEFAULT 0,
            thumbnail_url TEXT,
            video_url TEXT NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_ixstream_content_active_created ON ixstream_content(is_active, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_ixstream_content_seller ON ixstream_content(seller_id);

        CREATE TABLE IF NOT EXISTS ixstream_seasons (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            content_id UUID NOT NULL REFERENCES ixstream_content(id) ON DELETE CASCADE,
            season_number INTEGER NOT NULL,
            title VARCHAR(255),
            description TEXT NOT NULL DEFAULT '',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_ixstream_seasons_content ON ixstream_seasons(content_id);

        CREATE TABLE IF NOT EXISTS ixstream_episodes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            season_id UUID NOT NULL REFERENCES ixstream_seasons(id) ON DELETE CASCADE,
            episode_number INTEGER NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            duration INTEGER,
            video_url TEXT NOT NULL,
            thumbnail_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_ixstream_episodes_season ON ixstream_episodes(season_id);

        CREATE TABLE IF NOT EXISTS ixstream_subscription_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            price_cents INTEGER NOT NULL,
            currency VARCHAR(10) NOT NULL DEFAULT 'USD',
            interval_type VARCHAR(20) NOT NULL CHECK (interval_type IN ('day', 'week', 'month', 'year')),
            interval_count INTEGER NOT NULL DEFAULT 1,
            features TEXT[] NOT NULL DEFAULT '{}',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_ixstream_plans_seller ON ixstream_subscription_plans(seller_id);

        CREATE TABLE IF NOT EXISTS ixstream_subscriptions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL,
            plan_id UUID NOT NULL REFERENCES ixstream_subscription_plans(id),
            status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'expired')),
            current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
            current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
            cancel_at_period_end BOOLEAN DEFAULT FALSE,
            payment_reference VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_ixstream_subscriptions_user ON ixstream_subscriptions(user_id);
        CREATE INDEX IF NOT EXISTS idx_ixstream_subscriptions_seller ON ixstream_subscriptions(seller_id);

        -- TSPP Teacher Profiles table
        CREATE TABLE IF NOT EXISTS tspp_teacher_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            subject_area VARCHAR(255),
            grade_level VARCHAR(100),
            bio TEXT,
            website TEXT,
            years_experience INTEGER,
            verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_tspp_teacher_profiles_user ON tspp_teacher_profiles(user_id);

        -- TSPP Documents table
        CREATE TABLE IF NOT EXISTS tspp_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            document_type VARCHAR(50) NOT NULL,
            file_url TEXT NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_size INTEGER,
            mime_type VARCHAR(100),
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
            reviewed_by UUID REFERENCES users(id),
            reviewed_at TIMESTAMP WITH TIME ZONE,
            rejection_reason TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_tspp_documents_user ON tspp_documents(user_id);
        CREATE INDEX IF NOT EXISTS idx_tspp_documents_type ON tspp_documents(document_type);
        CREATE INDEX IF NOT EXISTS idx_tspp_documents_status ON tspp_documents(status);
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