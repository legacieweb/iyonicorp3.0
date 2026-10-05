import bcrypt from 'bcryptjs';
import db from './db.js';
import { toCamelObject, toCamelArray, getAuthenticatedSellerId as findAuthenticatedSellerId } from './helpers.js';

export function mountPosRoutes(app, authenticateToken, io) {
  const POS = (req, res, next) => {
    if (req.user && (req.user.sellerId || req.user.seller_id)) {
      req.sellerId = req.user.sellerId || req.user.seller_id;
      return next();
    }
    res.status(401).json({ message: 'No active seller selected.' });
  };

  app.get('/api/pos/employees', authenticateToken, POS, async (req, res) => {
    try {
      const result = await db.query(
        'SELECT * FROM pos_employees WHERE seller_id = $1 ORDER BY name',
        [req.sellerId]
      );
      res.json(result.rows.map(toCamelObject));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/pos/employees', authenticateToken, POS, async (req, res) => {
    const { name, role, pin } = req.body;
    if (!name || !role) {
      return res.status(400).json({ message: 'Name and role are required.' });
    }
    try {
      const pinHash = pin ? await bcrypt.hash(pin, 10) : null;
      const result = await db.query(
        'INSERT INTO pos_employees (seller_id, name, role, pin_hash, active) VALUES ($1, $2, $3, $4, TRUE) RETURNING *',
        [req.sellerId, name, role, pinHash]
      );
      res.status(201).json(toCamelObject(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/pos/employees/:id', authenticateToken, POS, async (req, res) => {
    try {
      const result = await db.query(
        'SELECT * FROM pos_employees WHERE id = $1 AND seller_id = $2',
        [req.params.id, req.sellerId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Employee not found.' });
      res.json(toCamelObject(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.put('/api/pos/employees/:id', authenticateToken, POS, async (req, res) => {
    const { name, role, active, photo } = req.body;
    try {
      const result = await db.query(
        `UPDATE pos_employees SET name = $1, role = $2, active = $3, photo = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 AND seller_id = $6 RETURNING *`,
        [name, role, active, photo, req.params.id, req.sellerId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Employee not found.' });
      res.json(toCamelObject(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/pos/employees/:id/pin', authenticateToken, POS, async (req, res) => {
    const { pin } = req.body;
    if (!pin || pin.length < 4) {
      return res.status(400).json({ message: 'PIN must be at least 4 digits.' });
    }
    try {
      const pinHash = await bcrypt.hash(pin, 10);
      const result = await db.query(
        'UPDATE pos_employees SET pin_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND seller_id = $3 RETURNING *',
        [pinHash, req.params.id, req.sellerId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Employee not found.' });
      res.json({ message: 'PIN updated.' });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/pos/employees/:id', authenticateToken, POS, async (req, res) => {
    try {
      const result = await db.query(
        'DELETE FROM pos_employees WHERE id = $1 AND seller_id = $2 RETURNING id',
        [req.params.id, req.sellerId]
      );
      if (result.rowCount === 0) return res.status(404).json({ message: 'Employee not found.' });
      res.json({ message: 'Employee deleted.' });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/pos/employees/verify-pin', authenticateToken, POS, async (req, res) => {
    const { employeeId, pin } = req.body;
    if (!employeeId || !pin) {
      return res.status(400).json({ message: 'Employee ID and PIN are required.' });
    }
    try {
      const result = await db.query(
        'SELECT * FROM pos_employees WHERE id = $1 AND seller_id = $2 AND active = TRUE',
        [employeeId, req.sellerId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Employee not found.' });
      const employee = result.rows[0];
      const valid = await bcrypt.compare(pin, employee.pin_hash || '');
      if (!valid) return res.status(401).json({ message: 'Invalid PIN.' });
      res.json({ id: employee.id, name: employee.name, role: employee.role });
    } catch (err) {
      console.error('Failed to verify POS employee PIN:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Tables
  app.get('/api/pos/tables', authenticateToken, POS, async (req, res) => {
    try {
      const result = await db.query(
        'SELECT * FROM pos_tables WHERE seller_id = $1 ORDER BY table_number::int',
        [req.sellerId]
      );
      res.json(result.rows.map(toCamelObject));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/pos/tables', authenticateToken, POS, async (req, res) => {
    const { tableNumber, seats, section } = req.body;
    try {
      const result = await db.query(
        `INSERT INTO pos_tables (seller_id, table_number, seats, section, status)
         VALUES ($1, $2, $3, $4, 'available') RETURNING *`,
        [req.sellerId, tableNumber, seats || 4, section || '']
      );
      res.status(201).json(toCamelObject(result.rows[0]));
      io?.to(`seller:${req.sellerId}`).emit('table:created', toCamelObject(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/pos/tables/:id/status', authenticateToken, POS, async (req, res) => {
    const { status } = req.body;
    try {
      const result = await db.query(
        `UPDATE pos_tables SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND seller_id = $3 RETURNING *`,
        [status, req.params.id, req.sellerId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Table not found.' });
      const table = toCamelObject(result.rows[0]);
      io?.to(`seller:${req.sellerId}`).emit('table:status', table);
      res.json(table);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.patch('/api/pos/tables/:id/assign', authenticateToken, POS, async (req, res) => {
    const { employeeId, orderId } = req.body;
    try {
      const result = await db.query(
        `UPDATE pos_tables SET assigned_employee_id = $1, current_order_id = $2,
         status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND seller_id = $5 RETURNING *`,
        [employeeId || null, orderId || null, employeeId ? 'occupied' : 'available', req.params.id, req.sellerId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Table not found.' });
      const table = toCamelObject(result.rows[0]);
      io?.to(`seller:${req.sellerId}`).emit('table:updated', table);
      res.json(table);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Shifts
  app.get('/api/pos/shifts/open', authenticateToken, POS, async (req, res) => {
    try {
      const result = await db.query(
        'SELECT * FROM pos_shifts WHERE seller_id = $1 AND status = $1 ORDER BY started_at DESC LIMIT 1',
        [req.sellerId]
      );
      res.json(result.rows.map(toCamelObject));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/pos/shifts/open', authenticateToken, POS, async (req, res) => {
    const { employeeId, openingFloat } = req.body;
    try {
      const result = await db.query(
        `INSERT INTO pos_shifts (employee_id, seller_id, opening_float, status)
         VALUES ($1, $2, $3, 'open') RETURNING *`,
        [employeeId, req.sellerId, openingFloat || 0]
      );
      res.status(201).json(toCamelObject(result.rows[0]));
      io?.to(`seller:${req.sellerId}`).emit('shift:opened', toCamelObject(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/pos/shifts/:id/close', authenticateToken, POS, async (req, res) => {
    const { closingAmount } = req.body;
    try {
      const shiftResult = await db.query(
        'SELECT * FROM pos_shifts WHERE id = $1 AND seller_id = $2',
        [req.params.id, req.sellerId]
      );
      if (shiftResult.rows.length === 0) return res.status(404).json({ message: 'Shift not found.' });
      const shift = shiftResult.rows[0];
      const cashCounted = (Number(shift.cash_sales) || 0) + Number(shift.opening_float || 0);
      const variance = Number(closingAmount || 0) - cashCounted;

      const result = await db.query(
        `UPDATE pos_shifts SET ended_at = CURRENT_TIMESTAMP, closing_amount = $1,
         cash_counted = $2, variance = $3, status = 'closed'
         WHERE id = $4 RETURNING *`,
        [closingAmount, cashCounted, variance, req.params.id]
      );
      res.json(toCamelObject(result.rows[0]));
      io?.to(`seller:${req.sellerId}`).emit('shift:closed', toCamelObject(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/pos/shifts/:id/cash-sale', authenticateToken, POS, async (req, res) => {
    const { amount } = req.body;
    try {
      await db.query(
        `UPDATE pos_shifts SET cash_sales = cash_sales + $1 WHERE id = $2 AND seller_id = $3 AND status = 'open'`,
        [amount, req.params.id, req.sellerId]
      );
      res.json({ message: 'Cash sale recorded.' });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Inventory
  app.get('/api/pos/inventory', authenticateToken, POS, async (req, res) => {
    try {
      const result = await db.query(
        'SELECT * FROM pos_inventory WHERE seller_id = $1 ORDER BY name',
        [req.sellerId]
      );
      res.json(result.rows.map(toCamelObject));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/pos/inventory/low-stock', authenticateToken, POS, async (req, res) => {
    try {
      const result = await db.query(
        'SELECT * FROM pos_inventory WHERE seller_id = $1 AND current_stock <= low_stock_threshold ORDER BY name',
        [req.sellerId]
      );
      res.json(result.rows.map(toCamelObject));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/pos/inventory', authenticateToken, POS, async (req, res) => {
    const { name, category, unit, lowStockThreshold, cost, supplier } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required.' });
    try {
      const result = await db.query(
        `INSERT INTO pos_inventory (seller_id, name, category, unit, low_stock_threshold, cost, supplier)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [req.sellerId, name, category || 'general', unit || 'pcs', lowStockThreshold || 0, cost || 0, supplier || null]
      );
      res.status(201).json(toCamelObject(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.put('/api/pos/inventory/:id', authenticateToken, POS, async (req, res) => {
    const { name, category, currentStock, unit, lowStockThreshold, cost, supplier } = req.body;
    try {
      const result = await db.query(
        `UPDATE pos_inventory SET name = $1, category = $2, current_stock = $3, unit = $4,
         low_stock_threshold = $5, cost = $6, supplier = $7, updated_at = CURRENT_TIMESTAMP
         WHERE id = $8 AND seller_id = $9 RETURNING *`,
        [name, category, currentStock, unit, lowStockThreshold, cost, supplier, req.params.id, req.sellerId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found.' });
      res.json(toCamelObject(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/pos/inventory/:id/adjust', authenticateToken, POS, async (req, res) => {
    const { quantity, reason, type } = req.body;
    const qty = Number(quantity);
    if (!type || !['restock', 'usage', 'adjustment'].includes(type)) {
      return res.status(400).json({ message: 'Invalid adjustment type.' });
    }
    try {
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        const adjResult = await client.query(
          `INSERT INTO pos_inventory_adjustments (item_id, seller_id, type, quantity, reason)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [req.params.id, req.sellerId, type, qty, reason || '']
        );
        const adj = qty * (type === 'restock' ? 1 : -1);
        const itemResult = await client.query(
          `UPDATE pos_inventory SET current_stock = current_stock + $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND seller_id = $3 RETURNING *`,
          [adj, req.params.id, req.sellerId]
        );
        await client.query('COMMIT');
        res.json(toCamelObject(itemResult.rows[0]));
      } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Server error' });
      } finally {
        client.release();
      }
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Loyalty
  app.get('/api/pos/loyalty/customer/:customerId', authenticateToken, POS, async (req, res) => {
    try {
      let result = await db.query(
        'SELECT * FROM pos_loyalty WHERE customer_id = $1 AND seller_id = $2',
        [req.params.customerId, req.sellerId]
      );
      if (result.rows.length === 0) {
        result = await db.query(
          `INSERT INTO pos_loyalty (customer_id, seller_id, points_balance, lifetime_points, tier)
           VALUES ($1, $2, 0, 0, 'bronze') RETURNING *`,
          [req.params.customerId, req.sellerId]
        );
      }
      res.json(toCamelObject(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/pos/loyalty/earn', authenticateToken, POS, async (req, res) => {
    const { customerId, orderId, points } = req.body;
    try {
      let result = await db.query(
        'SELECT * FROM pos_loyalty WHERE customer_id = $1 AND seller_id = $2',
        [customerId, req.sellerId]
      );
      if (result.rows.length === 0) {
        result = await db.query(
          `INSERT INTO pos_loyalty (customer_id, seller_id, points_balance, lifetime_points, tier)
           VALUES ($1, $2, 0, 0, 'bronze') RETURNING *`,
          [customerId, req.sellerId]
        );
      }
      const current = result.rows[0];
      const newBalance = (Number(current.points_balance) || 0) + Number(points);
      const lifetime = (Number(current.lifetime_points) || 0) + Number(points);
      let tier = 'bronze';
      if (lifetime >= 2000) tier = 'gold';
      else if (lifetime >= 500) tier = 'silver';

      const updated = await db.query(
        `UPDATE pos_loyalty SET points_balance = $1, lifetime_points = $2, tier = $3, updated_at = CURRENT_TIMESTAMP
         WHERE customer_id = $4 AND seller_id = $5 RETURNING *`,
        [newBalance, lifetime, tier, customerId, req.sellerId]
      );
      await db.query(
        `INSERT INTO pos_loyalty_transactions (loyalty_id, order_id, points_earned)
         VALUES ((SELECT id FROM pos_loyalty WHERE customer_id = $1 AND seller_id = $2), $3, $4)`,
        [customerId, req.sellerId, orderId, Number(points)]
      );
      res.json(toCamelObject(updated.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/pos/loyalty/redeem', authenticateToken, POS, async (req, res) => {
    const { customerId, orderId, points } = req.body;
    const pts = Number(points);
    try {
      const result = await db.query(
        'SELECT * FROM pos_loyalty WHERE customer_id = $1 AND seller_id = $2 FOR UPDATE',
        [customerId, req.sellerId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Loyalty record not found.' });
      const current = result.rows[0];
      if ((Number(current.points_balance) || 0) < pts) {
        return res.status(400).json({ message: 'Insufficient points.' });
      }
      const newBalance = (Number(current.points_balance) || 0) - pts;
      const updated = await db.query(
        `UPDATE pos_loyalty SET points_balance = $1, updated_at = CURRENT_TIMESTAMP
         WHERE customer_id = $2 AND seller_id = $3 RETURNING *`,
        [newBalance, customerId, req.sellerId]
      );
      await db.query(
        `INSERT INTO pos_loyalty_transactions (loyalty_id, order_id, points_redeemed)
         VALUES ((SELECT id FROM pos_loyalty WHERE customer_id = $1 AND seller_id = $2), $3, $4)`,
        [customerId, req.sellerId, orderId, pts]
      );
      res.json(toCamelObject(updated.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Kitchen Orders
  app.get('/api/pos/kitchen/orders', authenticateToken, POS, async (req, res) => {
    try {
      const result = await db.query(
        `SELECT o.*, s.store_name FROM orders o
         JOIN sellers s ON o.seller_id = s.id
         WHERE o.seller_id = $1 AND o.status IN ('pending', 'processing')
         ORDER BY o.created_at DESC`,
        [req.sellerId]
      );
      res.json(result.rows.map(toCamelObject));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Analytics
  app.get('/api/pos/analytics/sales', authenticateToken, POS, async (req, res) => {
    try {
      const { range = '7' } = req.query;
      const days = parseInt(range, 10);
      const result = await db.query(
        `SELECT DATE(created_at) as day, SUM(total) as revenue, COUNT(*) as orders
         FROM orders WHERE seller_id = $1 AND created_at >= NOW() - INTERVAL '1 day' * $2
         GROUP BY DATE(created_at) ORDER BY day`,
        [req.sellerId, days]
      );
      res.json(result.rows.map(r => ({ day: r.day, revenue: Number(r.revenue), orders: Number(r.orders) })));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/pos/analytics/payment-methods', authenticateToken, POS, async (req, res) => {
    try {
      const result = await db.query(
        `SELECT payment_method, COUNT(*) as transactions, SUM(total) as amount
         FROM orders WHERE seller_id = $1 AND status IN ('processing', 'shipped', 'delivered')
         GROUP BY payment_method`,
        [req.sellerId]
      );
      res.json(result.rows.map(r => ({ method: r.payment_method, transactions: Number(r.transactions), amount: Number(r.amount) })));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Event Log
  app.get('/api/pos/events', authenticateToken, POS, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit || 100, 10);
      const result = await db.query(
        `SELECT * FROM pos_event_log WHERE seller_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [req.sellerId, limit]
      );
      res.json(result.rows.map(toCamelObject));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/pos/events', authenticateToken, POS, async (req, res) => {
    const { level, source, message, orderId, userId } = req.body;
    try {
      await db.query(
        `INSERT INTO pos_event_log (seller_id, level, source, message, order_id, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.sellerId, level || 'info', source, message, orderId || null, userId || null]
      );
      res.status(201).json({ message: 'Event logged.' });
      io?.to(`seller:${req.sellerId}`).emit('event:new', { level, source, message });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  console.log('✅ POS routes mounted');
}

async function getAuthenticatedSellerId(userId) {
  return findAuthenticatedSellerId(db, userId);
}

export { getAuthenticatedSellerId };
