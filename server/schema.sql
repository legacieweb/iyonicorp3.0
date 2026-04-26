-- Iyonicorp Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone_number VARCHAR(50),
    username VARCHAR(255) UNIQUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    last_selected_store_id UUID,
    role VARCHAR(50) NOT NULL CHECK (role IN ('seller', 'seller_manager', 'manager_admin', 'customer')),
    iyonicpay_opt_in BOOLEAN DEFAULT FALSE,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sellers table
CREATE TABLE IF NOT EXISTS sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(255) UNIQUE NOT NULL,
    shop_type VARCHAR(50) DEFAULT 'product' CHECK (shop_type IN ('product', 'service')),
    description TEXT,
    logo TEXT,
    shipping_policy TEXT,
    return_policy TEXT,
    privacy_policy TEXT,
    terms_of_service TEXT,
    additional_pages JSONB DEFAULT '[]'::JSONB,
    theme JSONB DEFAULT '{"primaryColor": "#3b82f6", "secondaryColor": "#1e40af", "fontFamily": "Inter"}'::JSONB,
    social_links JSONB DEFAULT '{"facebook": "", "instagram": "", "twitter": "", "linkedin": "", "youtube": "", "tiktok": ""}'::JSONB,
    contact_info JSONB DEFAULT '{"email": "", "phone": "", "address": "", "whatsapp": ""}'::JSONB,
    currency VARCHAR(10) DEFAULT 'USD',
    delivery_locations JSONB DEFAULT '[]'::JSONB,
    payment_terms JSONB DEFAULT '{"methods": ["site"], "depositPercentage": 50, "rules": "all"}'::JSONB,
    subscription JSONB DEFAULT '{"plan": "starter", "status": "active", "startDate": null, "endDate": null}'::JSONB,
    stats JSONB DEFAULT '{"totalProducts": 0, "totalOrders": 0, "totalRevenue": 0, "totalCustomers": 0}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seller Managers table
CREATE TABLE IF NOT EXISTS seller_managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    commission_rate DECIMAL(5, 2) DEFAULT 0.05,
    total_sellers INTEGER DEFAULT 0,
    active_sellers INTEGER DEFAULT 0,
    total_revenue DECIMAL(15, 2) DEFAULT 0,
    total_commission DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(15, 2) NOT NULL,
    category VARCHAR(100),
    type VARCHAR(50) DEFAULT 'product' CHECK (type IN ('product', 'service')),
    images TEXT[],
    videos TEXT[],
    urls TEXT[],
    stock INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, seller_id)
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    items JSONB NOT NULL,
    total DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'refunded')),
    refund_reason TEXT,
    shipping_address JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Refund Requests table
CREATE TABLE IF NOT EXISTS refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_sellers_updated_at ON sellers;
CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON sellers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_seller_managers_updated_at ON seller_managers;
CREATE TRIGGER update_seller_managers_updated_at BEFORE UPDATE ON seller_managers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(seller_id, name)
);

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- IyonicPay Wallets
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- IyonicPay Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
    receiver_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
    amount DECIMAL(15, 2) NOT NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    type VARCHAR(50) CHECK (type IN ('send', 'receive', 'request', 'deposit', 'withdrawal', 'invoice_payment', 'refund')),
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'requested', 'failed')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    bank_details JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_withdrawals_updated_at ON withdrawals;
CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON withdrawals FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- IyonicPay Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    description TEXT,
    theme VARCHAR(50) DEFAULT 'professional',
    link_token VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'cancelled')),
    is_reusable BOOLEAN DEFAULT FALSE,
    usage_limit INTEGER DEFAULT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- IyonicBots table
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

DROP TRIGGER IF EXISTS update_bots_updated_at ON bots;
CREATE TRIGGER update_bots_updated_at BEFORE UPDATE ON bots FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Messages table (Contact Form submissions)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_selected_store_id UUID;
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_last_selected_store') THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_last_selected_store FOREIGN KEY (last_selected_store_id) REFERENCES sellers(id) ON DELETE SET NULL;
    END IF;
END $$;

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
    provider VARCHAR(50) NOT NULL, -- smtp, sendgrid, mailgun, aws-ses, sendinblue, postmark
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
    category VARCHAR(50) DEFAULT 'custom', -- transactional, promotional, notification, welcome, abandoned_cart, custom
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
    recipient_type VARCHAR(50) NOT NULL, -- all, segment, custom
    segment_filter JSONB,
    custom_recipients JSONB, -- Array of emails
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, sending, sent, cancelled, failed
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

-- Triggers for new tables
DROP TRIGGER IF EXISTS update_social_media_accounts_updated_at ON social_media_accounts;
CREATE TRIGGER update_social_media_accounts_updated_at BEFORE UPDATE ON social_media_accounts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_marketing_settings_updated_at ON email_marketing_settings;
CREATE TRIGGER update_email_marketing_settings_updated_at BEFORE UPDATE ON email_marketing_settings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_campaigns_updated_at ON email_campaigns;
CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

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
    status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, posting, posted, failed
    post_url TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_social_media_posts_updated_at ON social_media_posts;
CREATE TRIGGER update_social_media_posts_updated_at BEFORE UPDATE ON social_media_posts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
