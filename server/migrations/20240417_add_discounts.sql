-- Create Discounts table
CREATE TABLE IF NOT EXISTS discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES sellers(id) ON DELETE CASCADE,
    code VARCHAR(100), -- If null, it's an automatic discount
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

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_discounts_updated_at ON discounts;
CREATE TRIGGER update_discounts_updated_at BEFORE UPDATE ON discounts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
