-- Add refund_reason column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reason TEXT;

-- Update CHECK constraint to include refund_requested status
DO $$
BEGIN
  -- Try to drop and recreate the constraint with the new status
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_status_check' AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_status_check;
  END IF;
  
  ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refund_requested', 'refunded'));
END $$;