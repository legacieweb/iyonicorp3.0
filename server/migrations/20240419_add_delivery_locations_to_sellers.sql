ALTER TABLE sellers ADD COLUMN IF NOT EXISTS delivery_locations JSONB DEFAULT '[]'::JSONB;  
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS payment_terms JSONB DEFAULT '{\"methods\": [\"site\"], \"depositPercentage\": 50, \"rules\": \"all\"}'::JSONB; 
