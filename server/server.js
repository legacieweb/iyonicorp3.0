import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import PaystackFactory from 'paystack';
import multer from 'multer';
import nodemailer from 'nodemailer';
import { nanoid } from 'nanoid';
import db, { initDb } from './db.js';
import * as mailer from './mailer.js';
import { triggerAutomation } from './automations.js';

const Paystack = PaystackFactory.default || PaystackFactory;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to check if seller has configured email
async function hasSellerEmailConfig(sellerId) {
  try {
    const settingsRes = await db.query(
      'SELECT id FROM email_marketing_settings WHERE seller_id = $1 AND is_active = TRUE',
      [sellerId]
    );
    return settingsRes.rows.length > 0;
  } catch (err) {
    console.error('Error checking seller email config:', err);
    return false;
  }
}

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'iyonicorp_secret_key';

// Helper to format price
const formatPrice = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
};

app.use(cors());
app.use(express.json());

// Special CORS for embed endpoints
app.use('/api/embed', cors());

// Multer Configuration for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed!'));
    }
  }
});

// Serving static files from public/uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ✅ Serve built frontend files from 'dist' directory
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// ✅ Catch-all route to serve index.html for React Router
app.get(/.*/, (req, res, next) => {
  // If it's an API request, don't serve index.html (let it fall through or 404)
  if (req.url.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// ✅ NEW: Log database connection (for debugging in Coolify)
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Loaded ✅" : "Missing ❌");

// Initialize Database
initDb().then(() => {
  seedDefaultTemplates();
  startBackgroundJobs();
});

// Seed default email templates
const seedDefaultTemplates = async () => {
  try {
    const existing = await db.query('SELECT count(*) FROM email_templates WHERE is_default = TRUE');
    if (parseInt(existing.rows[0].count) > 0) {
      return;
    }

    const defaultTemplates = [
      {
        name: 'Order Confirmation',
        slug: 'order-confirmation',
        subject: 'Order Confirmed - #{{orderId}} from {{storeName}}',
        category: 'transactional',
        htmlContent: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
<h1 style="color: #10b981;">Order Confirmed!</h1>
<p>Hello {{customerName}},</p>
<p>Thank you for your purchase from <strong>{{storeName}}</strong>!</p>
<p>Your order <strong>#{{orderId}}</strong> has been confirmed and is being processed.</p>

<h2 style="margin-top: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px;">Order Details</h2>
<div style="margin: 20px 0;">
{{items}}
</div>

<p style="font-size: 18px; font-weight: bold; text-align: right;">Total: ${{orderTotal}}</p>

<p style="margin-top: 30px;">We will notify you when your order ships.</p>
<p style="color: #888; font-size: 12px; margin-top: 40px;">Thank you for shopping with us!</p>
</div>`,
        variables: ['orderId', 'customerName', 'orderTotal', 'storeName', 'items']
      },
      {
        name: 'Shipping Notification',
        slug: 'shipping-notification',
        subject: 'Your order #{{orderId}} has shipped!',
        category: 'transactional',
        htmlContent: '<h1>Your order is on the way!</h1><p>Hello {{customerName}},</p><p>Great news! Your order #{{orderId}} has been shipped and is on its way to you.</p><p>Tracking Number: {{trackingNumber}}</p>',
        variables: ['orderId', 'customerName', 'trackingNumber']
      },
      {
        name: 'Welcome Email',
        slug: 'welcome-email',
        subject: 'Welcome to {{storeName}}!',
        category: 'welcome',
        htmlContent: '<h1>Welcome!</h1><p>Hello {{customerName}},</p><p>Thank you for joining {{storeName}}! We are excited to have you with us.</p><p>Start shopping now and enjoy our latest collections.</p>',
        variables: ['customerName', 'storeName']
      },
      {
        name: 'Abandoned Cart Reminder',
        slug: 'abandoned-cart',
        subject: 'You left something in your cart!',
        category: 'abandoned_cart',
        htmlContent: '<h1>Don\'t miss out!</h1><p>Hello {{customerName}},</p><p>We noticed you left some items in your cart at {{storeName}}. They are waiting for you!</p><p><a href="{{cartUrl}}">Complete your purchase now</a></p>',
        variables: ['customerName', 'storeName', 'cartUrl']
      },
      {
        name: 'Promotional Newsletter',
        slug: 'promotional-newsletter',
        subject: 'Special Offer Just for You!',
        category: 'promotional',
        htmlContent: '<h1>Special Offer!</h1><p>Hello {{customerName}},</p><p>We have a special offer for you at {{storeName}}! Use code <strong>WELCOME10</strong> for 10% off your next purchase.</p>',
        variables: ['customerName', 'storeName']
      },
      {
        name: 'Refund Request',
        slug: 'refund-request',
        subject: 'Refund Request Submitted - Order #{{orderId}}',
        category: 'transactional',
        htmlContent: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
<h1 style="color: #f59e0b;">Refund Request Submitted</h1>
<p>Hello {{customerName}},</p>
<p>Your refund request for order <strong>#{{orderId}}</strong> at <strong>{{storeName}}</strong> has been submitted.</p>
<p><strong>Reason:</strong> {{reason}}</p>
<p>We will review your request and get back to you soon.</p>

<h2 style="margin-top: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px;">Order Details</h2>
<div style="margin: 20px 0;">
{{items}}
</div>

<p style="font-size: 18px; font-weight: bold; text-align: right;">Order Total: ${{orderTotal}}</p>

<p style="margin-top: 30px;">Thank you for your patience!</p>
</div>`,
        variables: ['orderId', 'customerName', 'orderTotal', 'storeName', 'items', 'reason']
      }
    ];

    for (const template of defaultTemplates) {
      await db.query(
        `INSERT INTO email_templates (name, slug, subject, category, html_content, variables, is_default, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)`,
        [template.name, template.slug, template.subject, template.category, template.htmlContent, JSON.stringify(template.variables)]
      );
    }

    console.log('✅ Default email templates seeded');
  } catch (err) {
    console.error('❌ Error seeding default templates:', err);
  }
};

// Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const optionalAuthenticateToken = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    next();
  }
};

// Helper to convert DB rows (snake_case) to camelCase
const toCamel = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj; // Skip Date objects
  if (Array.isArray(obj)) return obj.map(v => toCamel(v));
  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      // Don't camelCase data keys like 'subscription' if they are already objects with specific structure
      if (key === 'subscription' || key === 'theme' || key === 'stats' || key === 'config' || key === 'custom_media' || key === 'delivery_locations' || key === 'payment_terms') {
        const targetKey = key === 'custom_media' ? 'customMedia' : (key === 'delivery_locations' ? 'deliveryLocations' : (key === 'payment_terms' ? 'paymentTerms' : key));
        result[targetKey] = obj[key];
        return result;
      }
      const camelKey = key.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));
      result[camelKey] = toCamel(obj[key]);
      return result;
    }, {});
  }
  return obj;
};

// --- Authentication Routes ---

// Register
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role, storeName, subdomain, shopType, firstName, lastName, phoneNumber, username, sellerId: requestSellerId } = req.body;

  try {
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      const existingUser = userCheck.rows[0];
      
      // If it's a customer registering for another store
      if (role === 'customer' && existingUser.role === 'customer' && requestSellerId) {
        // Check if already a customer for THIS seller
        const customerCheck = await db.query(
          'SELECT * FROM customers WHERE user_id = $1 AND seller_id = $2',
          [existingUser.id, requestSellerId]
        );
        
        if (customerCheck.rows.length > 0) {
          return res.status(400).json({ message: 'You are already registered for this store.' });
        }

        // Return special status to indicate they can link their account
        return res.status(409).json({ 
          message: 'You already have an account on this platform. Would you like to use your existing details for this store?',
          mergeRequired: true,
          email: existingUser.email
        });
      }

      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Fallback username if not provided
    const finalUsername = username || name.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const userRes = await client.query(
        'INSERT INTO users (name, email, password_hash, role, first_name, last_name, phone_number, username, last_selected_store_id, iyonicpay_opt_in) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, name, email, role, created_at, iyonicpay_opt_in',
        [name, email, passwordHash, role, firstName || null, lastName || null, phoneNumber || null, finalUsername, role === 'customer' ? requestSellerId : null, role === 'seller']
      );
      const user = userRes.rows[0];
      console.log('✅ User created:', user.id);

      // Create wallet for new user if they are a seller (auto-opt-in)
      if (role === 'seller') {
        await client.query(
          'INSERT INTO wallets (user_id, balance) VALUES ($1, 0) ON CONFLICT DO NOTHING',
          [user.id]
        );
      }

      if (role === 'seller') {
        const generatedSubdomain = subdomain || (storeName ? storeName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() : 'store-' + Date.now());
        console.log('Generated subdomain:', generatedSubdomain);
        
        let initialPlan = 'starter';
        const managerIdFromUrl = req.body.managerId || null;

        // Special logic for Enterprise Managers: first 6 sellers get Professional plan free
        if (managerIdFromUrl) {
          const managerRes = await client.query('SELECT subscription FROM seller_managers WHERE id = $1', [managerIdFromUrl]);
          if (managerRes.rows.length > 0) {
            const manager = managerRes.rows[0];
            const managerPlan = manager.subscription?.plan || 'starter';
            
            if (managerPlan === 'enterprise') {
              const sellerCountRes = await client.query('SELECT COUNT(*) FROM sellers WHERE manager_id = $1', [managerIdFromUrl]);
              const sellerCount = parseInt(sellerCountRes.rows[0].count);
              if (sellerCount < 6) {
                initialPlan = 'professional';
              }
            }
          }
        }

        const defaultSubscription = JSON.stringify({
          plan: initialPlan,
          status: 'active',
          startDate: new Date().toISOString(),
          endDate: null
        });
        const defaultTheme = JSON.stringify({
          primaryColor: '#3b82f6',
          secondaryColor: '#1d4ed8',
          fontFamily: 'Inter'
        });
        await client.query(
          'INSERT INTO sellers (user_id, store_name, subdomain, shop_type, subscription, theme, manager_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [user.id, storeName || 'My Store', generatedSubdomain, shopType || 'product', defaultSubscription, defaultTheme, managerIdFromUrl]
        );
      } else if (role === 'seller_manager') {
        const slug = (name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36)).replace(/[^a-z0-9-]/g, '');
        await client.query(
          'INSERT INTO seller_managers (user_id, slug, display_name) VALUES ($1, $2, $3)',
          [user.id, slug, name]
        );
      } else if (role === 'customer' && requestSellerId) {
        // Create customer entry for this seller
        await client.query(
          'INSERT INTO customers (seller_id, user_id, name, email, phone) VALUES ($1, $2, $3, $4, $5)',
          [requestSellerId, user.id, name, email, phoneNumber || null]
        );

        // Fetch store name for automation
        const sellerRes = await client.query('SELECT store_name FROM sellers WHERE id = $1', [requestSellerId]);
        const storeName = sellerRes.rows[0]?.store_name || 'Our Store';

        // Trigger welcome email automation
        triggerAutomation('customer_registered', {
          sellerId: requestSellerId,
          customerEmail: email,
          customerName: name,
          storeName
        });
      }

      await client.query('COMMIT');
      console.log('✅ Transaction committed');

      // Get seller_id or manager_id if they exist
      let sellerId = null;
      let managerId = null;

      if (role === 'seller') {
        const sRes = await client.query('SELECT id FROM sellers WHERE user_id = $1', [user.id]);
        sellerId = sRes.rows[0]?.id;
      } else if (role === 'seller_manager') {
        const mRes = await client.query('SELECT id FROM seller_managers WHERE user_id = $1', [user.id]);
        managerId = mRes.rows[0]?.id;
      }

      const token = jwt.sign({ id: user.id, role: user.role, sellerId: role === 'customer' ? requestSellerId : sellerId, managerId }, JWT_SECRET, { expiresIn: '1d' });

      // Send welcome email
      mailer.sendWelcomeEmail(user, 'IyoniCorp');

      res.status(201).json({ user: { ...user, sellerId: role === 'customer' ? requestSellerId : sellerId, managerId }, token });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ 
      message: 'Server error during registration', 
      error: err.message,
      stack: err.stack,
      details: err
    });
  }
});

// Link Store to existing customer account
app.post('/api/auth/link-store', async (req, res) => {
  const { email, password, sellerId } = req.body;

  try {
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if already a customer for THIS seller
    const customerCheck = await db.query(
      'SELECT * FROM customers WHERE user_id = $1 AND seller_id = $2',
      [user.id, sellerId]
    );

    if (customerCheck.rows.length === 0) {
      // Link the account
      await db.query(
        'INSERT INTO customers (seller_id, user_id, name, email, phone) VALUES ($1, $2, $3, $4, $5)',
        [sellerId, user.id, user.name, user.email, user.phone_number]
      );
    }

    // Update last selected store
    await db.query('UPDATE users SET last_selected_store_id = $1 WHERE id = $2', [sellerId, user.id]);

    const token = jwt.sign({ 
      id: user.id, 
      role: user.role, 
      sellerId: sellerId 
    }, JWT_SECRET, { expiresIn: '1d' });

    const { password_hash, ...userWithoutPassword } = user;
    res.json({ 
      user: toCamel({ ...userWithoutPassword, seller_id: sellerId }), 
      token 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error linking store' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Platform Admin check from .env
    const adminEmail = process.env.VITE_ADMIN_EMAIL;
    const adminPassword = process.env.VITE_ADMIN_PASSWORD;

    if (email === adminEmail && password === adminPassword) {
      const token = jwt.sign({ id: 'admin-id', role: 'manager_admin' }, JWT_SECRET, { expiresIn: '1d' });
      return res.json({
        user: { 
          id: 'admin-id', 
          email: adminEmail, 
          name: 'Platform Admin', 
          role: 'manager_admin', 
          createdAt: new Date().toISOString() 
        },
        token
      });
    }

    const userRes = await db.query(`
      SELECT u.*, s.id as seller_id, s.store_name, s.currency as "storeCurrency", sm.id as manager_id 
      FROM users u 
      LEFT JOIN sellers s ON u.id = s.user_id 
      LEFT JOIN seller_managers sm ON u.id = sm.user_id 
      WHERE u.email = $1
    `, [email]);
    
    if (userRes.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = userRes.rows[0];

    if (user.is_suspended) {
      return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // For customers, fetch all stores they are registered in
    let stores = [];
    if (user.role === 'customer') {
      const storesRes = await db.query(`
        SELECT s.id, s.store_name, s.subdomain, s.logo, s.currency as "storeCurrency"
        FROM sellers s
        JOIN customers c ON s.id = c.seller_id
        WHERE c.user_id = $1
      `, [user.id]);
      stores = storesRes.rows;
    }

    const currentSellerId = user.role === 'customer' ? user.last_selected_store_id : user.seller_id;

    const token = jwt.sign({ 
      id: user.id, 
      role: user.role, 
      sellerId: currentSellerId, 
      managerId: user.manager_id 
    }, JWT_SECRET, { expiresIn: '1d' });

    const { password_hash, seller_id, manager_id, ...userWithoutPassword } = user;
    res.json({ 
      user: toCamel({ ...userWithoutPassword, seller_id: currentSellerId, manager_id, stores }), 
      token 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Select Store (for customers with multiple stores)
app.post('/api/auth/select-store', authenticateToken, async (req, res) => {
  const { sellerId } = req.body;
  try {
    if (sellerId) {
      // Verify customer is registered for this store
      const customerCheck = await db.query(
        'SELECT * FROM customers WHERE user_id = $1 AND seller_id = $2',
        [req.user.id, sellerId]
      );

      if (customerCheck.rows.length === 0) {
        return res.status(403).json({ message: 'You are not registered for this store.' });
      }
    }

    const finalSellerId = sellerId || null;
    await db.query('UPDATE users SET last_selected_store_id = $1 WHERE id = $2', [finalSellerId, req.user.id]);

    const token = jwt.sign({ 
      id: req.user.id, 
      role: req.user.role, 
      sellerId: finalSellerId,
      managerId: req.user.managerId 
    }, JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, sellerId: finalSellerId });
  } catch (err) {
    res.status(500).json({ message: 'Server error selecting store' });
  }
});

// Get Current User
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    // Platform Admin check (matching what's in login)
    if (req.user.id === 'admin-id' && req.user.role === 'manager_admin') {
      return res.json({
        id: 'admin-id',
        email: process.env.VITE_ADMIN_EMAIL || 'iyonicorp@gmail.com',
        name: 'Platform Admin',
        role: 'manager_admin',
        createdAt: new Date().toISOString()
      });
    }

    const userRes = await db.query(`
      SELECT u.id, u.name, u.email, u.role, u.created_at, u.first_name, u.last_name, u.phone_number, u.username, u.last_selected_store_id, u.iyonicpay_opt_in,
             s.id as seller_id, s.store_name, s.currency as "storeCurrency", sm.id as manager_id, sm.slug as manager_slug 
      FROM users u 
      LEFT JOIN sellers s ON u.id = s.user_id 
      LEFT JOIN seller_managers sm ON u.id = sm.user_id 
      WHERE u.id = $1
    `, [req.user.id]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = userRes.rows[0];

    // For customers, fetch all stores they are registered in
    let stores = [];
    if (user.role === 'customer') {
      const storesRes = await db.query(`
        SELECT s.id, s.store_name, s.subdomain, s.logo, s.currency as "storeCurrency"
        FROM sellers s
        JOIN customers c ON s.id = c.seller_id
        WHERE c.user_id = $1
      `, [user.id]);
      stores = storesRes.rows;
    }

    const currentSellerId = user.role === 'customer' ? user.last_selected_store_id : user.seller_id;

    res.json(toCamel({ 
      ...user, 
      sellerId: currentSellerId, 
      managerId: user.manager_id, 
      managerSlug: user.manager_slug,
      stores 
    }));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Profile (Avatar, Name, etc.)
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  const { name, firstName, lastName, phoneNumber, avatar } = req.body;
  try {
    const userRes = await db.query(
      'UPDATE users SET name = COALESCE($1, name), first_name = COALESCE($2, first_name), last_name = COALESCE($3, last_name), phone_number = COALESCE($4, phone_number), avatar = COALESCE($5, avatar), updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING id, name, email, first_name, last_name, phone_number, avatar, role',
      [name, firstName, lastName, phoneNumber, avatar, req.user.id]
    );
    res.json(toCamel(userRes.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// --- User Addresses Routes ---

// Get all addresses for current user
app.get('/api/user/addresses', authenticateToken, async (req, res) => {
  try {
    const addressesRes = await db.query(
      'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );
    res.json(toCamel(addressesRes.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching addresses' });
  }
});

// Add new address
app.post('/api/user/addresses', authenticateToken, async (req, res) => {
  const { name, recipientName, phoneNumber, streetAddress, city, state, postalCode, country, isDefault } = req.body;
  try {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      if (isDefault) {
        await client.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1', [req.user.id]);
      }

      const addressRes = await client.query(
        'INSERT INTO user_addresses (user_id, name, recipient_name, phone_number, street_address, city, state, postal_code, country, is_default) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
        [req.user.id, name, recipientName, phoneNumber, streetAddress, city, state, postalCode, country, isDefault || false]
      );

      await client.query('COMMIT');
      res.status(201).json(toCamel(addressRes.rows[0]));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error adding address' });
  }
});

// Update address
app.put('/api/user/addresses/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, recipientName, phoneNumber, streetAddress, city, state, postalCode, country, isDefault } = req.body;
  try {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      if (isDefault) {
        await client.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1', [req.user.id]);
      }

      const addressRes = await client.query(
        'UPDATE user_addresses SET name = $1, recipient_name = $2, phone_number = $3, street_address = $4, city = $5, state = $6, postal_code = $7, country = $8, is_default = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10 AND user_id = $11 RETURNING *',
        [name, recipientName, phoneNumber, streetAddress, city, state, postalCode, country, isDefault, id, req.user.id]
      );

      if (addressRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Address not found' });
      }

      await client.query('COMMIT');
      res.json(toCamel(addressRes.rows[0]));
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error updating address' });
  }
});

// Delete address
app.delete('/api/user/addresses/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM user_addresses WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Address not found' });
    }
    res.json({ message: 'Address deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting address' });
  }
});

// --- Admin User Management Routes ---

// Get All Users (Admin only)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager_admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const usersRes = await db.query('SELECT id, name, email, role, is_suspended, created_at FROM users ORDER BY created_at DESC');
    res.json(toCamel(usersRes.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete User (Admin only)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager_admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Check if the user to delete is the admin themselves (prevent accidental lockout)
    if (req.params.id === 'admin-id' || req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete the platform admin account' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete User Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle User Suspension (Admin only)
app.patch('/api/users/:id/suspend', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager_admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (req.params.id === 'admin-id' || req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot suspend the platform admin account' });
    }

    const userRes = await db.query('SELECT is_suspended FROM users WHERE id = $1', [req.params.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    
    const newStatus = !userRes.rows[0].is_suspended;
    await db.query('UPDATE users SET is_suspended = $1 WHERE id = $2', [newStatus, req.params.id]);
    
    res.json({ message: `User ${newStatus ? 'suspended' : 'unsuspended'} successfully`, isSuspended: newStatus });
  } catch (err) {
    console.error('Suspend User Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Seller Routes ---

// Get Seller Profile
app.get('/api/sellers/me', authenticateToken, async (req, res) => {
  try {
    const sellerRes = await db.query('SELECT * FROM sellers WHERE user_id = $1', [req.user.id]);
    if (sellerRes.rows.length === 0) return res.status(404).json({ message: 'Seller profile not found' });
    res.json(toCamel(sellerRes.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get All Sellers (Manager/Admin only)
app.get('/api/sellers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'seller_manager' && req.user.role !== 'manager_admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    let query = `
      SELECT s.*, u.name as owner_name, u.email as owner_email 
      FROM sellers s
      JOIN users u ON s.user_id = u.id
    `;
    let params = [];
    
    if (req.user.role === 'seller_manager') {
      query += ' WHERE s.manager_id = $1';
      params.push(req.user.managerId);
    }
    
    query += ' ORDER BY s.created_at DESC';
    
    const sellersRes = await db.query(query, params);
    res.json(toCamel(sellersRes.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Seller Profile (Customization)
app.patch('/api/sellers/me', authenticateToken, async (req, res) => {
  const { 
    store_name, storeName, 
    description, logo, theme, 
    shop_type, shopType, 
    requested_subdomain, requestedSubdomain,
    shipping_policy, shippingPolicy,
    return_policy, returnPolicy,
    privacy_policy, privacyPolicy,
    terms_of_service, termsOfService,
    additional_pages, additionalPages,
    social_links, socialLinks,
    contact_info, contactInfo,
    payment_gateways, paymentGateways,
    delivery_locations, deliveryLocations,
    payment_terms, paymentTerms,
    currency,
    subscription
  } = req.body;
  
  const finalStoreName = store_name !== undefined ? store_name : storeName;
  const finalDescription = description;
  const finalLogo = logo;
  const finalTheme = theme !== undefined ? JSON.stringify(theme) : undefined;
  const finalShopType = shop_type !== undefined ? shop_type : shopType;
  const finalSubdomain = requested_subdomain !== undefined ? requested_subdomain : requestedSubdomain;
  const finalShippingPolicy = shipping_policy !== undefined ? shipping_policy : shippingPolicy;
  const finalReturnPolicy = return_policy !== undefined ? return_policy : returnPolicy;
  const finalPrivacyPolicy = privacy_policy !== undefined ? privacy_policy : privacyPolicy;
  const finalTermsOfService = terms_of_service !== undefined ? terms_of_service : termsOfService;
  const finalAdditionalPages = additional_pages !== undefined ? JSON.stringify(additional_pages) : (additionalPages !== undefined ? JSON.stringify(additionalPages) : undefined);
  const finalSocialLinks = social_links !== undefined ? JSON.stringify(social_links) : (socialLinks !== undefined ? JSON.stringify(socialLinks) : undefined);
  const finalContactInfo = contact_info !== undefined ? JSON.stringify(contact_info) : (contactInfo !== undefined ? JSON.stringify(contactInfo) : undefined);
  const finalPaymentGateways = payment_gateways !== undefined ? JSON.stringify(payment_gateways) : (paymentGateways !== undefined ? JSON.stringify(paymentGateways) : undefined);
  const finalDeliveryLocations = delivery_locations !== undefined ? JSON.stringify(delivery_locations) : (deliveryLocations !== undefined ? JSON.stringify(deliveryLocations) : undefined);
  const finalPaymentTerms = payment_terms !== undefined ? JSON.stringify(payment_terms) : (paymentTerms !== undefined ? JSON.stringify(paymentTerms) : undefined);
  const finalSubscription = subscription !== undefined ? JSON.stringify(subscription) : undefined;

  try {
    const sellerRes = await db.query(
      `UPDATE sellers SET 
        store_name = COALESCE($1, store_name), 
        description = COALESCE($2, description), 
        logo = COALESCE($3, logo), 
        theme = COALESCE($4::jsonb, theme),
        shop_type = COALESCE($5, shop_type),
        requested_subdomain = COALESCE($6, requested_subdomain),
        shipping_policy = COALESCE($7, shipping_policy),
        return_policy = COALESCE($8, return_policy),
        privacy_policy = COALESCE($9, privacy_policy),
        terms_of_service = COALESCE($10, terms_of_service),
        additional_pages = COALESCE($11::jsonb, additional_pages),
        social_links = COALESCE($12::jsonb, social_links),
        contact_info = COALESCE($13::jsonb, contact_info),
        payment_gateways = COALESCE($14::jsonb, payment_gateways),
        currency = COALESCE($15, currency),
        subscription = COALESCE($16::jsonb, subscription),
        delivery_locations = CASE WHEN $17::jsonb IS NOT NULL THEN $17::jsonb ELSE delivery_locations END,
        payment_terms = CASE WHEN $18::jsonb IS NOT NULL THEN $18::jsonb ELSE payment_terms END,
        updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $19 RETURNING *`,
      [
        finalStoreName !== undefined ? finalStoreName : null, 
        finalDescription !== undefined ? finalDescription : null, 
        finalLogo !== undefined ? finalLogo : null, 
        finalTheme !== undefined ? finalTheme : null, 
        finalShopType !== undefined ? finalShopType : null, 
        finalSubdomain !== undefined ? finalSubdomain : null,
        finalShippingPolicy !== undefined ? finalShippingPolicy : null,
        finalReturnPolicy !== undefined ? finalReturnPolicy : null,
        finalPrivacyPolicy !== undefined ? finalPrivacyPolicy : null,
        finalTermsOfService !== undefined ? finalTermsOfService : null,
        finalAdditionalPages !== undefined ? finalAdditionalPages : null,
        finalSocialLinks !== undefined ? finalSocialLinks : null,
        finalContactInfo !== undefined ? finalContactInfo : null,
        finalPaymentGateways !== undefined ? finalPaymentGateways : null,
        currency !== undefined ? currency : null,
        finalSubscription !== undefined ? finalSubscription : null,
        finalDeliveryLocations !== undefined ? finalDeliveryLocations : null,
        finalPaymentTerms !== undefined ? finalPaymentTerms : null,
        req.user.id
      ]
    );

    if (sellerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    const updatedSeller = sellerRes.rows[0];

    // Commission logic for manager on subscription
    if (subscription && subscription.status === 'active' && subscription.plan !== 'starter') {
      // Find manager
      if (updatedSeller.manager_id) {
        const managerRes = await db.query('SELECT * FROM seller_managers WHERE id = $1', [updatedSeller.manager_id]);
        if (managerRes.rows.length > 0) {
          const manager = managerRes.rows[0];
          const managerPlan = manager.subscription?.plan || 'starter';

          // Basic and Enterprise managers get 40% commission on subscriptions
          if (managerPlan === 'basic' || managerPlan === 'enterprise') {
            // Get price from manager's pricing config or defaults
            let price = 0;
            const defaultSellerPricing = {
              starter: 0,
              basic: 15,
              professional: 29,
              enterprise: 99
            };

            const sellerPlanId = subscription.plan;
            if (manager.pricing_config?.plans?.[sellerPlanId]) {
              price = manager.pricing_config.plans[sellerPlanId].price;
            } else {
              price = defaultSellerPricing[sellerPlanId] || 0;
            }

            if (price > 0) {
              // Starter plan pays 100% to manager, others 40%
              const commissionRate = sellerPlanId === 'starter' ? 1.0 : 0.40;
              const commissionAmount = price * commissionRate;
              
              // Credit manager's wallet
              const walletRes = await db.query('SELECT id FROM wallets WHERE user_id = $1', [manager.user_id]);
              if (walletRes.rows.length > 0) {
                const walletId = walletRes.rows[0].id;
                await db.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [commissionAmount, walletId]);
                await db.query(
                  'INSERT INTO transactions (receiver_wallet_id, amount, type, status, description) VALUES ($1, $2, \'receive\', \'completed\', $3)',
                  [walletId, commissionAmount, `Subscription commission from seller: ${updatedSeller.store_name}`]
                );
              }
            }
          }
        }
      }
    }

    res.json(toCamel(updatedSeller));
  } catch (err) {
    console.error('Update Seller Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Messages for Seller (Authenticated)
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const sellerRes = await db.query('SELECT id FROM sellers WHERE user_id = $1', [req.user.id]);
    if (sellerRes.rows.length === 0) return res.status(404).json({ message: 'Seller not found' });
    
    const sellerId = sellerRes.rows[0].id;
    const messagesRes = await db.query(
      'SELECT * FROM messages WHERE seller_id = $1 ORDER BY created_at DESC',
      [sellerId]
    );
    res.json(toCamel(messagesRes.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Post Message from Storefront (Public)
app.post('/api/messages/public/:subdomain', async (req, res) => {
  const { name, email, subject, message } = req.body;
  const { subdomain } = req.params;
  
  try {
    const sellerRes = await db.query('SELECT id FROM sellers WHERE subdomain = $1', [subdomain]);
    if (sellerRes.rows.length === 0) return res.status(404).json({ message: 'Store not found' });
    
    const sellerId = sellerRes.rows[0].id;
    const newMessage = await db.query(
      'INSERT INTO messages (seller_id, name, email, subject, message) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [sellerId, name, email, subject, message]
    );
    res.json(toCamel(newMessage.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark Message as Read
app.patch('/api/messages/:id/read', authenticateToken, async (req, res) => {
  try {
    await db.query('UPDATE messages SET is_read = TRUE WHERE id = $1', [req.params.id]);
    res.json({ message: 'Message marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete Message
app.delete('/api/messages/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM messages WHERE id = $1', [req.params.id]);
    res.json({ message: 'Message deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve Subdomain (Manager only)
app.post('/api/sellers/:id/approve-subdomain', authenticateToken, async (req, res) => {
  const { subdomain } = req.body;
  try {
    if (req.user.role !== 'seller_manager' && req.user.role !== 'manager_admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const sellerRes = await db.query(
      `UPDATE sellers SET 
        subdomain = $1, 
        is_live = TRUE,
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 RETURNING *`,
      [subdomain, req.params.id]
    );
    
    if (sellerRes.rows.length === 0) return res.status(404).json({ message: 'Seller not found' });
    res.json(toCamel(sellerRes.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Seller by ID (Public)
app.get('/api/sellers/:id/public', async (req, res) => {
  try {
    const sellerRes = await db.query('SELECT id, store_name, subdomain, logo, theme, shop_type, description FROM sellers WHERE id = $1', [req.params.id]);
    if (sellerRes.rows.length === 0) return res.status(404).json({ message: 'Store not found' });
    res.json(toCamel(sellerRes.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Seller by Subdomain (Public)
app.get('/api/sellers/subdomain/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { theme } = req.query;
    
    // Demo mode: return demo seller with requested theme
    if (subdomain === 'demo') {
      const requestedTheme = theme || 'modern-ecommerce';
      return res.json({
        id: 'demo-seller',
        storeName: 'Demo Store',
        subdomain: 'demo',
        shopType: 'product',
        description: 'Welcome to our demo store. Browse our collection and preview different themes.',
        themeId: requestedTheme,
        theme: { 
          primaryColor: '#3b82f6', 
          fontFamily: 'Inter',
          selectedTheme: requestedTheme 
        }
      });
    }
    
    const sellerRes = await db.query('SELECT * FROM sellers WHERE subdomain = $1', [subdomain]);
    if (sellerRes.rows.length === 0) return res.status(404).json({ message: 'Store not found' });
    res.json(toCamel(sellerRes.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get bots for a subdomain (Public)
app.get('/api/bots/public/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;
    
    const sellerRes = await db.query('SELECT id FROM sellers WHERE subdomain = $1', [subdomain]);
    if (sellerRes.rows.length === 0) return res.status(404).json({ message: 'Store not found' });
    
    const sellerId = sellerRes.rows[0].id;
    const botsRes = await db.query(
      'SELECT id, name, type, widget_config FROM bots WHERE seller_id = $1 AND status = \'active\'',
      [sellerId]
    );
    res.json(toCamel(botsRes.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- IyonicPay Routes ---

// Get Wallet
app.post('/api/iyonicpay/opt-in', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if already opted in
    const userRes = await db.query('SELECT iyonicpay_opt_in FROM users WHERE id = $1', [userId]);
    if (userRes.rows[0]?.iyonicpay_opt_in) {
      return res.status(400).json({ message: 'Already opted in to IyonicPay' });
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update user opt-in status
      await client.query('UPDATE users SET iyonicpay_opt_in = TRUE WHERE id = $1', [userId]);
      
      // Create wallet
      await client.query(
        'INSERT INTO wallets (user_id, balance) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING',
        [userId]
      );
      
      await client.query('COMMIT');
      res.json({ success: true, message: 'Successfully opted in to IyonicPay' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Opt-in error:', err);
    res.status(500).json({ message: 'Failed to opt-in to IyonicPay' });
  }
});

app.get('/api/iyonicpay/wallet', authenticateToken, async (req, res) => {
  try {
    const walletRes = await db.query('SELECT * FROM wallets WHERE user_id = $1', [req.user.id]);
    if (walletRes.rows.length === 0) {
      // Create wallet if doesn't exist
      const newWallet = await db.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING *', [req.user.id]);
      return res.json(toCamel(newWallet.rows[0]));
    }
    res.json(toCamel(walletRes.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Transactions (recent)
app.get('/api/iyonicpay/transactions', authenticateToken, async (req, res) => {
  try {
    const walletRes = await db.query('SELECT id FROM wallets WHERE user_id = $1', [req.user.id]);
    if (walletRes.rows.length === 0) return res.json([]);
    
    const walletId = walletRes.rows[0].id;
    const transRes = await db.query(`
      SELECT * FROM transactions 
      WHERE sender_wallet_id = $1 OR receiver_wallet_id = $1 
      ORDER BY created_at DESC LIMIT 10
    `, [walletId]);
    
    res.json(toCamel(transRes.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Continue with Iyonicorp (Find account)
app.post('/api/iyonicpay/continue-with-iyonicorp', async (req, res) => {
  const { email } = req.body;
  try {
    const userRes = await db.query(`
      SELECT u.id, u.email, u.name, u.role, u.first_name, u.last_name, u.phone_number, s.store_name 
      FROM users u 
      LEFT JOIN sellers s ON u.id = s.user_id 
      WHERE u.email = $1
    `, [email]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'No Iyonicorp account found with this email' });
    }

    res.json(toCamel(userRes.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Finalize Iyonicorp integration (Set username)
app.post('/api/iyonicpay/finalize-iyonicorp', async (req, res) => {
  const { email, username, password } = req.body;
  console.log(`Attempting to finalize IyonicPay for: ${email}, username: ${username}`);
  
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const userRes = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userRes.rows[0];
    const userId = user.id;

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid Iyonicorp password' });
    }
    
    // Update username
    await client.query('UPDATE users SET username = $1 WHERE id = $2', [username, userId]);
    
    // Ensure wallet exists
    await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING', [userId]);

    // Get seller_id or manager_id if they exist
    const sRes = await client.query('SELECT id FROM sellers WHERE user_id = $1', [userId]);
    const sellerId = sRes.rows[0]?.id;
    const mRes = await client.query('SELECT id FROM seller_managers WHERE user_id = $1', [userId]);
    const managerId = mRes.rows[0]?.id;

    await client.query('COMMIT');

    // Send welcome email for IyoniPay
    mailer.sendWelcomeEmail(user, 'IyoniPay');

    const token = jwt.sign({ 
      id: userId, 
      role: user.role, 
      sellerId: sellerId, 
      managerId: managerId 
    }, JWT_SECRET, { expiresIn: '1d' });

    // Exclude sensitive data
    const { password_hash, ...userSafe } = user;

    res.json({ 
      success: true, 
      username, 
      token,
      user: toCamel({ ...userSafe, seller_id: sellerId, manager_id: managerId }) 
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Finalize Iyonicorp Error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Username already taken' });
    }
    res.status(500).json({ message: 'Server error during finalization', details: err.message });
  } finally {
    client.release();
  }
});

// Send Money
app.post('/api/iyonicpay/send', authenticateToken, async (req, res) => {
  const { recipientIdentifier, amount, description } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get sender wallet
    const senderRes = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1', [req.user.id]);
    if (senderRes.rows.length === 0) throw new Error('Sender wallet not found');
    const senderWallet = senderRes.rows[0];
    
    if (parseFloat(senderWallet.balance) < parseFloat(amount)) {
      return res.status(400).json({ message: 'Insufficient funds' });
    }

    // Get receiver wallet by username or email
    const receiverRes = await client.query(`
      SELECT w.id 
      FROM wallets w 
      JOIN users u ON w.user_id = u.id 
      LEFT JOIN sellers s ON u.id = s.user_id
      WHERE u.username = $1 OR u.email = $1 OR s.store_name = $1
    `, [recipientIdentifier]);

    if (receiverRes.rows.length === 0) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    const receiverWallet = receiverRes.rows[0];

    // Deduct from sender
    await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [amount, senderWallet.id]);
    
    // Add to receiver
    await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [amount, receiverWallet.id]);

    // Record transaction
    await client.query(`
      INSERT INTO transactions (sender_wallet_id, receiver_wallet_id, amount, type, status, description) 
      VALUES ($1, $2, $3, 'send', 'completed', $4)
    `, [senderWallet.id, receiverWallet.id, amount, description]);

    await client.query('COMMIT');

    // Send transaction emails
    const senderUserRes = await db.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const receiverUserRes = await db.query('SELECT u.name, u.email FROM users u JOIN wallets w ON u.id = w.user_id WHERE w.id = $1', [receiverWallet.id]);
    
    if (senderUserRes.rows.length > 0 && receiverUserRes.rows.length > 0) {
      mailer.sendTransactionNotification(
        { amount, type: 'send', description },
        senderUserRes.rows[0],
        receiverUserRes.rows[0]
      );
    }

    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message || 'Server error' });
  } finally {
    client.release();
  }
});

// Request Money
app.post('/api/iyonicpay/request', authenticateToken, async (req, res) => {
  const { recipientIdentifier, amount, description } = req.body;
  try {
    // Get sender (requester) wallet
    const requesterRes = await db.query('SELECT id FROM wallets WHERE user_id = $1', [req.user.id]);
    if (requesterRes.rows.length === 0) return res.status(404).json({ message: 'Your wallet not found' });
    const requesterWalletId = requesterRes.rows[0].id;

    // Get target (requestee) wallet
    const targetRes = await db.query(`
      SELECT w.id 
      FROM wallets w 
      JOIN users u ON w.user_id = u.id 
      LEFT JOIN sellers s ON u.id = s.user_id
      WHERE u.username = $1 OR u.email = $1 OR s.store_name = $1
    `, [recipientIdentifier]);

    if (targetRes.rows.length === 0) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    const targetWalletId = targetRes.rows[0].id;

    // Record request transaction
    await db.query(`
      INSERT INTO transactions (sender_wallet_id, receiver_wallet_id, amount, type, status, description) 
      VALUES ($1, $2, $3, 'request', 'requested', $4)
    `, [targetWalletId, requesterWalletId, amount, description]);

    res.json({ success: true });
  } catch (err) {
    console.error('Request Money Error:', err);
    res.status(500).json({ message: 'Server error during request' });
  }
});

// Paystack Deposit Initialization
app.post('/api/iyonicpay/deposit/initialize', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);
  
  try {
    const userRes = await db.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    const email = userRes.rows[0].email;

    // Get currency from seller profile or wallet
    const sellerRes = await db.query('SELECT currency FROM sellers WHERE user_id = $1', [req.user.id]);
    const walletRes = await db.query('SELECT currency FROM wallets WHERE user_id = $1', [req.user.id]);
    const currency = sellerRes.rows[0]?.currency || walletRes.rows[0]?.currency || 'USD';

    const response = await new Promise((resolve, reject) => {
      try {
        const paystackOptions = {
          email,
          amount: Math.round(amount * 100), // cents
          currency: currency,
          callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/iyonicpay/callback`,
          metadata: {
            user_id: req.user.id,
            type: 'deposit'
          }
        };

        paystack.transaction.initialize(paystackOptions, (err, body) => {
          if (err) {
            console.error('Paystack SDK Error:', err);
            reject(err);
          } else if (body && body.status === false) {
            console.error('Paystack API Failure:', body);
            reject(new Error(body.message || 'Paystack initialization failed'));
          } else {
            resolve(body);
          }
        });
      } catch (sdkError) {
        console.error('Paystack SDK Sync Error:', sdkError);
        reject(sdkError);
      }
    });

    res.json(response);
  } catch (err) {
    console.error('Paystack Init Error:', err);
    res.status(500).json({ 
      message: 'Failed to initialize payment', 
      error: err.message,
      details: err.response?.data?.message || err.toString()
    });
  }
});

// Paystack Deposit Verification
app.post('/api/iyonicpay/deposit/verify', authenticateToken, async (req, res) => {
  const { reference } = req.body;
  const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

  const client = await db.pool.connect();
  try {
    const body = await new Promise((resolve, reject) => {
      paystack.transaction.verify(reference, (err, body) => {
        if (err) reject(err);
        else resolve(body);
      });
    });

    if (body.status && body.data.status === 'success') {
      const amount = body.data.amount / 100;
      const userId = req.user.id;
      const reference = body.data.reference;
      
      console.log('Verification Success for user:', userId, 'amount:', amount, 'reference:', reference);

      if (!userId) {
        throw new Error('User ID missing');
      }

      // Ensure wallet exists
      const walletCheck = await client.query('SELECT id FROM wallets WHERE user_id = $1', [userId]);
      if (walletCheck.rows.length === 0) {
        await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING', [userId]);
      }

      await client.query('BEGIN');
      
      const walletRes = await client.query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2 RETURNING id', [amount, userId]);
      
      if (walletRes.rows.length === 0) {
        // Fallback: create if update returned nothing (extra safety)
        const finalWallet = await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET balance = wallets.balance + $2 RETURNING id', [userId, amount]);
        const walletId = finalWallet.rows[0].id;
        
        await client.query(`
          INSERT INTO transactions (receiver_wallet_id, amount, type, status, description) 
          VALUES ($1, $2, 'deposit', 'completed', 'Paystack Deposit')
        `, [walletId, amount]);
      } else {
        const walletId = walletRes.rows[0].id;

        await client.query(`
          INSERT INTO transactions (receiver_wallet_id, amount, type, status, description) 
          VALUES ($1, $2, 'deposit', 'completed', 'Paystack Deposit')
        `, [walletId, amount]);
      }

      await client.query('COMMIT');

      // Send deposit email
      const userRes = await db.query('SELECT name, email FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length > 0) {
        mailer.sendTransactionNotification(
          { amount, type: 'deposit', description: 'Paystack Deposit' },
          null, // No sender for deposit
          userRes.rows[0]
        );
      }

      res.json({ success: true, amount });
    } else {
      res.status(400).json({ message: 'Payment verification failed' });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Paystack Verify Error:', err);
    res.status(500).json({ message: 'Verification error' });
  } finally {
    client.release();
  }
});

// Invoices
app.post('/api/iyonicpay/invoices', authenticateToken, async (req, res) => {
  const { amount, description, theme, isReusable, usageLimit } = req.body;
  const linkToken = nanoid(12);
  try {
    // Get seller's currency
    const sellerRes = await db.query('SELECT currency FROM sellers WHERE user_id = $1', [req.user.id]);
    const currency = sellerRes.rows[0]?.currency || 'USD';

    const invoiceRes = await db.query(
      'INSERT INTO invoices (user_id, amount, description, theme, link_token, is_reusable, usage_limit, currency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [req.user.id, amount || 0, description, theme || 'professional', linkToken, isReusable || false, usageLimit || null, currency]
    );
    res.status(201).json(toCamel(invoiceRes.rows[0]));
  } catch (err) {
    console.error('Create Invoice Error:', err);
    res.status(500).json({ message: 'Failed to create invoice' });
  }
});

app.get('/api/iyonicpay/invoices/:token/theme', async (req, res) => {
  try {
    const invoiceRes = await db.query(
      'SELECT theme FROM invoices WHERE link_token = $1',
      [req.params.token]
    );
    if (invoiceRes.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ theme: invoiceRes.rows[0].theme });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/iyonicpay/invoices/:token/theme', authenticateToken, async (req, res) => {
  const { theme } = req.body;
  try {
    const invoiceRes = await db.query(
      'UPDATE invoices SET theme = $1 WHERE link_token = $2 AND user_id = $3 RETURNING *',
      [theme, req.params.token, req.user.id]
    );
    if (invoiceRes.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    res.json(toCamel(invoiceRes.rows[0]));
  } catch (err) {
    console.error('Failed to update theme:', err);
    res.status(500).json({ message: 'Failed to update theme' });
  }
});

app.patch('/api/iyonicpay/invoices/:token/settings', authenticateToken, async (req, res) => {
  const { amount, description, isReusable, usageLimit, customTitle, customButtonText } = req.body;
  try {
    const invoiceRes = await db.query(
      'UPDATE invoices SET amount = $1, description = $2, is_reusable = $3, usage_limit = $4, custom_title = $5, custom_button_text = $6, updated_at = CURRENT_TIMESTAMP WHERE link_token = $7 AND user_id = $8 RETURNING *',
      [amount, description, isReusable, usageLimit || null, customTitle || null, customButtonText || null, req.params.token, req.user.id]
    );
    if (invoiceRes.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    res.json(toCamel(invoiceRes.rows[0]));
  } catch (err) {
    console.error('Failed to update invoice settings:', err);
    res.status(500).json({ message: 'Failed to update settings' });
  }
});

app.get('/api/iyonicpay/invoices', authenticateToken, async (req, res) => {
  console.log('GET /api/iyonicpay/invoices hit');
  try {
    const invoicesRes = await db.query(
      `SELECT i.*, s.currency as current_seller_currency 
       FROM invoices i 
       LEFT JOIN sellers s ON i.user_id = s.user_id 
       WHERE i.user_id = $1 
       ORDER BY i.created_at DESC`,
      [req.user.id]
    );
    
    const invoices = invoicesRes.rows.map(invoice => {
      if (invoice.current_seller_currency) {
        invoice.currency = invoice.current_seller_currency;
      }
      return invoice;
    });

    console.log(`Found ${invoices.length} invoices for user ${req.user.id}`);
    res.json(toCamel(invoices));
  } catch (err) {
    console.error('Fetch Invoices Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/iyonicpay/invoices/:token', async (req, res) => {
  try {
    const invoiceRes = await db.query(`
      SELECT i.*, 
             COALESCE(NULLIF(TRIM(u.name), ''), SPLIT_PART(u.email, '@', 1)) as creator_name, 
             COALESCE(u.username, SPLIT_PART(u.email, '@', 1)) as creator_username,
             u.iyonicpay_theme as global_theme,
             o.id as order_id, o.customer_name, o.customer_email,
             s.id as seller_id, s.currency as current_seller_currency
      FROM invoices i 
      JOIN users u ON i.user_id = u.id 
      LEFT JOIN orders o ON i.order_id = o.id
      LEFT JOIN sellers s ON u.id = s.user_id
      WHERE i.link_token = $1
    `, [req.params.token]);

    if (invoiceRes.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    
    const invoiceData = invoiceRes.rows[0];
    // Override invoice currency with seller's current currency if it exists
    if (invoiceData.current_seller_currency) {
      invoiceData.currency = invoiceData.current_seller_currency;
    }
    
    res.json(toCamel(invoiceData));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/iyonicpay/invoices/:token/pay', authenticateToken, async (req, res) => {
  const { amount: customAmount } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    const invoiceRes = await client.query(`
      SELECT i.*, s.currency as current_seller_currency 
      FROM invoices i 
      JOIN users u ON i.user_id = u.id 
      LEFT JOIN sellers s ON u.id = s.user_id 
      WHERE i.link_token = $1
    `, [req.params.token]);
    if (invoiceRes.rows.length === 0) throw new Error('Invoice not found');
    const invoice = invoiceRes.rows[0];
    const currency = invoice.current_seller_currency || invoice.currency || 'USD';

    if (invoice.status === 'paid' && !invoice.is_reusable) {
      throw new Error('Invoice already paid');
    }

    if (invoice.is_reusable && invoice.usage_limit && invoice.usage_count >= invoice.usage_limit) {
      throw new Error('Usage limit reached for this payment link');
    }

    const configAmount = parseFloat(invoice.amount || 0);
    const finalAmount = (configAmount > 0) ? configAmount : parseFloat(customAmount);
    
    if (isNaN(finalAmount) || finalAmount <= 0) {
      throw new Error('Invalid payment amount');
    }

    const rates = { 'USD': 1, 'KES': 125, 'EUR': 0.92, 'GBP': 0.79, 'NGN': 1500, 'GHS': 13 };
    const convert = (val, from, to) => {
      const fromRate = rates[from] || 1;
      const toRate = rates[to] || 1;
      return (val / fromRate) * toRate;
    };

    const payerWalletRes = await client.query('SELECT id, balance, currency FROM wallets WHERE user_id = $1', [req.user.id]);
    if (payerWalletRes.rows.length === 0) throw new Error('Payer wallet not found');
    const payerWallet = payerWalletRes.rows[0];
    const payerCurrency = (payerWallet.currency || 'USD').toUpperCase();
    const invoiceCurrency = (currency || 'USD').toUpperCase();
    
    const payerDeduction = convert(finalAmount, invoiceCurrency, payerCurrency);

    if (parseFloat(payerWallet.balance) < payerDeduction) {
      throw new Error('Insufficient funds');
    }

    const creatorWalletRes = await client.query('SELECT id, currency FROM wallets WHERE user_id = $1', [invoice.user_id]);
    if (creatorWalletRes.rows.length === 0) throw new Error('Creator wallet not found');
    const creatorWallet = creatorWalletRes.rows[0];
    const creatorCurrency = (creatorWallet.currency || 'USD').toUpperCase();
    const creatorCredit = convert(finalAmount, invoiceCurrency, creatorCurrency);

    await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [payerDeduction, payerWallet.id]);
    await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [creatorCredit, creatorWallet.id]);
    
    // Record transaction
    await client.query(`
      INSERT INTO transactions (sender_wallet_id, receiver_wallet_id, amount, currency, type, status, description) 
      VALUES ($1, $2, $3, $4, 'invoice_payment', 'completed', $5)
    `, [payerWallet.id, creatorWallet.id, finalAmount, invoiceCurrency, `Payment for invoice: ${req.params.token}`]);
    
    // Increment usage count if reusable
    if (invoice.is_reusable) {
      const newCount = (invoice.usage_count || 0) + 1;
      await client.query('UPDATE invoices SET usage_count = $1 WHERE id = $2', [newCount, invoice.id]);
      
      // If limit reached, mark as paid
      if (invoice.usage_limit && newCount >= invoice.usage_limit) {
        await client.query('UPDATE invoices SET status = \'paid\' WHERE id = $1', [invoice.id]);
      }
    } else {
      await client.query('UPDATE invoices SET status = \'paid\' WHERE id = $1', [invoice.id]);
    }

    // If linked to an order, update order status and stats
    if (invoice.order_id) {
      const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 AND status = \'pending\'', [invoice.order_id]);
      
      if (orderRes.rows.length > 0) {
        const order = orderRes.rows[0];
        
        // Update Order Status
        await client.query('UPDATE orders SET status = \'processing\', updated_at = CURRENT_TIMESTAMP WHERE id = $1', [invoice.order_id]);

        // Update Seller Revenue and Orders count
        await client.query(
          "UPDATE sellers SET stats = jsonb_set(jsonb_set(stats, '{totalRevenue}', ((stats->>'totalRevenue')::numeric + $1)::text::jsonb), '{totalOrders}', ((stats->>'totalOrders')::int + 1)::text::jsonb) WHERE id = $2",
          [finalAmount, order.seller_id]
        );

        // Update Customer stats
        await client.query(`
          UPDATE customers 
          SET total_orders = total_orders + 1, 
              total_spent = total_spent + $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [finalAmount, order.customer_id]);

        // Fetch seller details for the email
        const sellerInfoRes = await client.query(
          'SELECT s.store_name, u.email, u.name as user_name FROM sellers s JOIN users u ON s.user_id = u.id WHERE s.id = $1', 
          [order.seller_id]
        );
        const sellerInfo = sellerInfoRes.rows[0];
        
        const sellerData = {
          name: sellerInfo?.user_name || 'Seller',
          email: sellerInfo?.email,
          storeName: sellerInfo?.store_name || 'Our Store'
        };

        const customerData = {
          name: order.customer_name,
          email: order.customer_email
        };

        // Only send Iyonicorp email if seller hasn't configured their own email
        const hasSellerEmail = await hasSellerEmailConfig(order.seller_id);
        if (!hasSellerEmail) {
          mailer.sendOrderNotification(toCamel(order), customerData, sellerData);
        } else {
          // Use seller's email configuration
          const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          triggerAutomation('order_placed', {
            sellerId: order.seller_id,
            customerEmail: order.customer_email,
            customerName: order.customer_name,
            orderId: order.id,
            orderTotal: finalAmount,
            storeName: sellerInfo?.store_name || 'Our Store',
            items: orderItems
          });
        }
      }
    }

    await client.query(`
      INSERT INTO transactions (sender_wallet_id, receiver_wallet_id, amount, currency, invoice_id, order_id, type, status, description) 
      VALUES ($1, $2, $3, $4, $5, $6, 'invoice_payment', 'completed', $7)
    `, [payerWallet.id, creatorWallet.id, finalAmount, currency, invoice.id, invoice.order_id, invoice.description || 'Invoice Payment']);

    await client.query('COMMIT');
    res.json({ success: true, amount: finalAmount });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
});

// Pay External Invoice via Paystack
app.post('/api/iyonicpay/invoices/:token/initialize-external-payment', optionalAuthenticateToken, async (req, res) => {
  const { email, name, amount: customAmount } = req.body;
  const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

  try {
    const invoiceRes = await db.query(`
      SELECT i.*, s.currency as current_seller_currency 
      FROM invoices i 
      JOIN users u ON i.user_id = u.id 
      LEFT JOIN sellers s ON u.id = s.user_id 
      WHERE i.link_token = $1
    `, [req.params.token]);
    if (invoiceRes.rows.length === 0) return res.status(404).json({ message: 'Invoice not found' });
    const invoice = invoiceRes.rows[0];
    const currency = invoice.current_seller_currency || invoice.currency || 'USD';

    if (invoice.status === 'paid' && !invoice.is_reusable) {
      return res.status(400).json({ message: 'Invoice already paid' });
    }

    if (invoice.is_reusable && invoice.usage_limit && invoice.usage_count >= invoice.usage_limit) {
      return res.status(400).json({ message: 'Usage limit reached for this payment link' });
    }

    const configAmount = parseFloat(invoice.amount || 0);
    const finalAmount = (configAmount > 0) ? configAmount : parseFloat(customAmount);

    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    const response = await new Promise((resolve, reject) => {
      const paystackOptions = {
        email,
        amount: Math.round(finalAmount * 100),
        currency: currency,
        metadata: {
          invoice_id: invoice.id,
          order_id: invoice.order_id,
          type: 'invoice_external_payment',
          payer_name: name,
          payer_email: email,
          payer_user_id: req.user?.id,
          is_reusable: invoice.is_reusable
        }
      };

      paystack.transaction.initialize(paystackOptions, (err, body) => {
        if (err || (body && body.status === false)) {
          reject(new Error(body?.message || err?.message || 'Paystack initialization failed'));
        } else {
          resolve(body);
        }
      });
    });

    res.json(response);
  } catch (err) {
    console.error('External Invoice Pay Error:', err);
    res.status(500).json({ 
      message: 'Failed to initialize payment', 
      error: err.message,
      details: err.response?.data?.message || err.toString()
    });
  }
});

// Verify External Invoice Payment
app.post('/api/iyonicpay/invoices/:token/verify-external-payment', async (req, res) => {
  const { reference } = req.body;
  const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);
  const client = await db.pool.connect();

  try {
    const body = await new Promise((resolve, reject) => {
      paystack.transaction.verify(reference, (err, body) => {
        if (err) reject(err);
        else resolve(body);
      });
    });

    if (body.status && body.data.status === 'success') {
      const invoiceId = body.data.metadata.invoice_id;
      const orderId = body.data.metadata.order_id;
      const isReusable = body.data.metadata.is_reusable;
      const amount = body.data.amount / 100;
      const payerName = body.data.metadata.payer_name || 'Customer';
      const payerEmail = body.data.customer_email || body.data.metadata.payer_email || body.data.customer?.email || 'Customer';
      const payerUserId = body.data.metadata.payer_user_id;

      await client.query('BEGIN');
      
      const invoiceRes = await client.query(`
        SELECT i.*, s.currency as current_seller_currency 
        FROM invoices i 
        JOIN users u ON i.user_id = u.id 
        LEFT JOIN sellers s ON u.id = s.user_id 
        WHERE i.id = $1
      `, [invoiceId]);
      if (invoiceRes.rows.length > 0) {
        const invoice = invoiceRes.rows[0];
        const currency = invoice.current_seller_currency || invoice.currency || 'USD';
        
        if (invoice.status === 'paid' && !isReusable) {
           await client.query('ROLLBACK');
           return res.status(400).json({ message: 'Invoice already paid' });
        }

        // Update Creator's Wallet
        let creatorWalletRes = await client.query('UPDATE wallets SET balance = balance + $1 WHERE user_id = $2 RETURNING id', [amount, invoice.user_id]);
        
        if (creatorWalletRes.rows.length === 0) {
          creatorWalletRes = await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, $2) RETURNING id', [invoice.user_id, amount]);
        }
        
        const creatorWalletId = creatorWalletRes.rows[0].id;

        // Get Payer's Wallet if they are an IyonicPay user
        let payerWalletId = null;
        if (payerUserId) {
          const payerWalletRes = await client.query('SELECT id FROM wallets WHERE user_id = $1', [payerUserId]);
          if (payerWalletRes.rows.length > 0) {
            payerWalletId = payerWalletRes.rows[0].id;
          }
        }

        // Mark Invoice as Paid or increment usage count
        if (isReusable) {
          const newCount = (invoice.usage_count || 0) + 1;
          await client.query('UPDATE invoices SET usage_count = $1 WHERE id = $2', [newCount, invoiceId]);
          
          if (invoice.usage_limit && newCount >= invoice.usage_limit) {
            await client.query('UPDATE invoices SET status = \'paid\' WHERE id = $1', [invoiceId]);
          }
        } else {
          await client.query('UPDATE invoices SET status = \'paid\' WHERE id = $1', [invoiceId]);
        }

        // If linked to an order, update order status and stats
        if (invoice.order_id) {
          const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 AND status = \'pending\'', [invoice.order_id]);
          
          if (orderRes.rows.length > 0) {
            const order = orderRes.rows[0];
            
            // Update Order Status
            await client.query('UPDATE orders SET status = \'processing\', updated_at = CURRENT_TIMESTAMP WHERE id = $1', [invoice.order_id]);

            // Update Seller Revenue
            await client.query(
              "UPDATE sellers SET stats = jsonb_set(stats, '{totalRevenue}', ((stats->>'totalRevenue')::numeric + $1)::text::jsonb) WHERE id = $2",
              [amount, order.seller_id]
            );

            // Update Customer stats
            await client.query(`
              UPDATE customers 
              SET total_orders = total_orders + 1, 
                  total_spent = total_spent + $1,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
            `, [amount, order.customer_id]);

            // Fetch seller details for the email
            const sellerInfoRes = await client.query(
              'SELECT s.store_name, u.email, u.name as user_name FROM sellers s JOIN users u ON s.user_id = u.id WHERE s.id = $1', 
              [order.seller_id]
            );
            const sellerInfo = sellerInfoRes.rows[0];
            
            const sellerData = {
              name: sellerInfo?.user_name || 'Seller',
              email: sellerInfo?.email,
              storeName: sellerInfo?.store_name || 'Our Store'
            };

            const customerData = {
              name: order.customer_name,
              email: order.customer_email
            };

            // Only send Iyonicorp email if seller hasn't configured their own email
            const hasSellerEmail = await hasSellerEmailConfig(order.seller_id);
            if (!hasSellerEmail) {
              mailer.sendOrderNotification(toCamel(order), customerData, sellerData);
            } else {
              // Use seller's email configuration
              const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
              triggerAutomation('order_placed', {
                sellerId: order.seller_id,
                customerEmail: order.customer_email,
                customerName: order.customer_name,
                orderId: order.id,
                orderTotal: amount,
                storeName: sellerInfo?.store_name || 'Our Store',
                items: orderItems
              });
            }
          }
        }

        // Send invoice payment notification emails
        const sellerUserRes = await client.query(
          'SELECT u.email, u.name, s.store_name FROM users u LEFT JOIN sellers s ON u.id = s.user_id WHERE u.id = $1',
          [invoice.user_id]
        );
        const sellerUser = sellerUserRes.rows[0];
        
        const invoiceSellerData = {
          name: sellerUser?.name || 'Seller',
          email: sellerUser?.email,
          storeName: sellerUser?.store_name || 'Our Store'
        };

        const invoiceCustomerData = {
          name: payerName,
          email: payerEmail
        };

        const invoiceDataResult = {
          id: invoice.id,
          amount: amount,
          currency: currency,
          description: invoice.description
        };

        mailer.sendInvoicePaymentNotification(invoiceDataResult, invoiceCustomerData, invoiceSellerData);

        // Record Transaction
        await client.query(`
          INSERT INTO transactions (sender_wallet_id, receiver_wallet_id, amount, currency, invoice_id, order_id, type, status, description) 
          VALUES ($1, $2, $3, $4, $5, $6, 'invoice_payment', 'completed', $7)
        `, [payerWalletId, creatorWalletId, amount, currency, invoice.id, invoice.order_id, `External payment for invoice: ${invoice.description || 'No description'}`]);
      }

      await client.query('COMMIT');
      res.json({ success: true, redirectUrl: '/customer/dashboard' });
    } else {
      res.status(400).json({ message: 'Payment verification failed' });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Invoice External Verify Error:', err);
    res.status(500).json({ message: 'Verification error' });
  } finally {
    client.release();
  }
});

// Withdrawals
app.post('/api/iyonicpay/withdrawals', authenticateToken, async (req, res) => {
  const { amount, bankDetails } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    const walletRes = await client.query('SELECT id, balance FROM wallets WHERE user_id = $1', [req.user.id]);
    const wallet = walletRes.rows[0];

    if (parseFloat(wallet.balance) < parseFloat(amount)) {
      throw new Error('Insufficient funds');
    }

    await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [amount, wallet.id]);
    
    const withdrawalRes = await client.query(
      'INSERT INTO withdrawals (user_id, amount, bank_details) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, amount, JSON.stringify(bankDetails)]
    );

    await client.query(`
      INSERT INTO transactions (sender_wallet_id, amount, type, status, description) 
      VALUES ($1, $2, 'withdrawal', 'pending', 'Withdrawal Request')
    `, [wallet.id, amount]);

    await client.query('COMMIT');

    // Send withdrawal emails
    const userRes = await db.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];
    const withdrawal = withdrawalRes.rows[0];
    
    // To User
    mailer.sendWithdrawalNotification(withdrawal, user, false);
    // To Admin
    mailer.sendWithdrawalNotification(withdrawal, user, true);

    res.status(201).json(toCamel(withdrawalRes.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
});

// API Keys
app.get('/api/iyonicpay/api-key', authenticateToken, async (req, res) => {
  try {
    let keyRes = await db.query('SELECT api_key FROM api_keys WHERE user_id = $1', [req.user.id]);
    if (keyRes.rows.length === 0) {
      const newKey = `ip_sk_${nanoid(24)}`;
      keyRes = await db.query('INSERT INTO api_keys (user_id, api_key) VALUES ($1, $2) RETURNING api_key', [req.user.id, newKey]);
    }
    res.json({ apiKey: keyRes.rows[0].api_key });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Global IyonicPay Settings
app.get('/api/iyonicpay/settings', authenticateToken, async (req, res) => {
  try {
    const userRes = await db.query('SELECT iyonicpay_theme FROM users WHERE id = $1', [req.user.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(toCamel(userRes.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/iyonicpay/settings', authenticateToken, async (req, res) => {
  const { theme } = req.body;
  try {
    await db.query('UPDATE users SET iyonicpay_theme = $1 WHERE id = $2', [theme, req.user.id]);
    res.json({ success: true, theme });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get All Transactions
app.get('/api/iyonicpay/transactions/all', authenticateToken, async (req, res) => {
  try {
    const walletRes = await db.query('SELECT id FROM wallets WHERE user_id = $1', [req.user.id]);
    if (walletRes.rows.length === 0) return res.json([]);
    
    const walletId = walletRes.rows[0].id;
    const transRes = await db.query(`
      SELECT t.*, 
             sw.user_id as sender_user_id, 
             rw.user_id as receiver_user_id,
             su.username as sender_username,
             ru.username as receiver_username,
             inv.link_token as invoice_token
      FROM transactions t
      LEFT JOIN wallets sw ON t.sender_wallet_id = sw.id
      LEFT JOIN wallets rw ON t.receiver_wallet_id = rw.id
      LEFT JOIN users su ON sw.user_id = su.id
      LEFT JOIN users ru ON rw.user_id = ru.id
      LEFT JOIN invoices inv ON t.invoice_id = inv.id
      WHERE t.sender_wallet_id = $1 OR t.receiver_wallet_id = $1 
      ORDER BY t.created_at DESC
    `, [walletId]);
    
    res.json(toCamel(transRes.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Product Routes ---

// Products for different themes (each theme has unique products)
const THEME_PRODUCTS = {
  'modern-ecommerce': [
    { id: 'mod-1', name: 'Premium Wireless Headphones', description: 'High-quality wireless headphones with active noise cancellation.', price: 299.99, category: 'Electronics', images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800'], stock: 50, seller_id: 'demo' },
    { id: 'mod-2', name: 'Smart Watch Pro', description: 'Advanced smartwatch with health tracking and GPS.', price: 449.99, category: 'Electronics', images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf29?auto=format&fit=crop&q=80&w=800'], stock: 30, seller_id: 'demo' },
    { id: 'mod-3', name: 'Minimalist Desk Lamp', description: 'Modern LED desk lamp with adjustable brightness.', price: 89.99, category: 'Home', images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782d?auto=format&fit=crop&q=80&w=800'], stock: 100, seller_id: 'demo' },
    { id: 'mod-4', name: 'Wireless Charging Pad', description: 'Fast wireless charger for all Qi devices.', price: 49.99, category: 'Electronics', images: ['https://images.unsplash.com/photo-1586816879360-004f5b0c51e5?auto=format&fit=crop&q=80&w=800'], stock: 200, seller_id: 'demo' },
  ],
  'luxury-boutique': [
    { id: 'lux-1', name: 'Diamond Encrusted Watch', description: '18K gold watch with genuine diamonds.', price: 12999.99, category: 'Jewelry', images: ['https://images.unsplash.com/photo-1524592094714-0f0654e20318?auto=format&fit=crop&q=80&w=800'], stock: 5, seller_id: 'demo' },
    { id: 'lux-2', name: 'Platinum Ring', description: 'Authentic platinum engagement ring.', price: 8999.99, category: 'Jewelry', images: ['https://images.unsplash.com/photo-1605100804763-247f67b35534?auto=format&fit=crop&q=80&w=800'], stock: 3, seller_id: 'demo' },
    { id: 'lux-3', name: 'Gold Necklace', description: '24K gold chain with pendant.', price: 4999.99, category: 'Jewelry', images: ['https://images.unsplash.com/photo-1599643478518-a174fc92a5ce?auto=format&fit=crop&q=80&w=800'], stock: 8, seller_id: 'demo' },
    { id: 'lux-4', name: 'Leather Handbag', description: 'Italian leather designer handbag.', price: 2999.99, category: 'Fashion', images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=800'], stock: 12, seller_id: 'demo' },
  ],
  'tech-gadgets': [
    { id: 'tech-1', name: 'Quantum Processor', description: 'Next-gen 128-core processor.', price: 1999.99, category: 'Tech', images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800'], stock: 25, seller_id: 'demo' },
    { id: 'tech-2', name: 'Neural Interface', description: 'Brain-computer neural link device.', price: 4999.99, category: 'Tech', images: ['https://images.unsplash.com/photo-1550751827-4e374c641da4?auto=format&fit=crop&q=80&w=800'], stock: 10, seller_id: 'demo' },
    { id: 'tech-3', name: 'Holographic Display', description: '360-degree holographic projector.', price: 1499.99, category: 'Tech', images: ['https://images.unsplash.com/photo-1535016120720-40c6874c2b33?auto=format&fit=crop&q=80&w=800'], stock: 40, seller_id: 'demo' },
    { id: 'tech-4', name: 'Quantum Storage', description: '1PB quantum solid state drive.', price: 799.99, category: 'Tech', images: ['https://images.unsplash.com/photo-1525547719471-dfc4f51a8bb1?auto=format&fit=crop&q=80&w=800'], stock: 100, seller_id: 'demo' },
  ],
  'minimal-store': [
    { id: 'min-1', name: 'Cotton T-Shirt', description: 'Organic cotton basic tee.', price: 29.99, category: 'Fashion', images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800'], stock: 500, seller_id: 'demo' },
    { id: 'min-2', name: 'Linen Pants', description: 'Comfortable linen trousers.', price: 79.99, category: 'Fashion', images: ['https://images.unsplash.com/photo-1473966968608-quote6z5hd0ys?auto=format&fit=crop&q=80&w=800'], stock: 200, seller_id: 'demo' },
    { id: 'min-3', name: 'Ceramic Mug', description: 'Handcrafted ceramic mug.', price: 19.99, category: 'Home', images: ['https://images.unsplash.com/photo-1514228742587-6b1558d1adb4?auto=format&fit=crop&q=80&w=800'], stock: 300, seller_id: 'demo' },
    { id: 'min-4', name: 'Wool Throw', description: 'Soft merino wool blanket.', price: 149.99, category: 'Home', images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800'], stock: 80, seller_id: 'demo' },
  ],
  'street-wear': [
    { id: 'street-1', name: 'Oversized Hoodie', description: 'Bold graphic print hoodie.', price: 89.99, category: 'Streetwear', images: ['https://images.unsplash.com/photo-1556821840-3a632f6eb799?auto=format&fit=crop&q=80&w=800'], stock: 150, seller_id: 'demo' },
    { id: 'street-2', name: 'Cargo Pants', description: 'Multi-pocket tactical pants.', price: 119.99, category: 'Streetwear', images: ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=800'], stock: 100, seller_id: 'demo' },
    { id: 'street-3', name: 'Limited Sneakers', description: 'Exclusive collab sneakers.', price: 299.99, category: 'Footwear', images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800'], stock: 50, seller_id: 'demo' },
    { id: 'street-4', name: 'Bucket Hat', description: 'Statement bucket hat.', price: 39.99, category: 'Accessories', images: ['https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&q=80&w=800'], stock: 200, seller_id: 'demo' },
  ],
  'premium-fashion': [
    { id: 'fashion-1', name: 'Tailored Suit', description: 'Italian wool tailored suit.', price: 2999.99, category: 'Fashion', images: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&q=80&w=800'], stock: 15, seller_id: 'demo' },
    { id: 'fashion-2', name: 'Silk Dress', description: 'Hand-sewn silk evening dress.', price: 1899.99, category: 'Fashion', images: ['https://images.unsplash.com/photo-1595777457583-07d6e2c8609d?auto=format&fit=crop&q=80&w=800'], stock: 8, seller_id: 'demo' },
    { id: 'fashion-3', name: 'Leather Loafers', description: 'Premium leather shoes.', price: 699.99, category: 'Footwear', images: ['https://images.unsplash.com/photo-1614252239480-416f7d3f3fb4?auto=format&fit=crop&q=80&w=800'], stock: 25, seller_id: 'demo' },
    { id: 'fashion-4', name: 'Cashmere Scarf', description: '100% cashmere scarf.', price: 399.99, category: 'Accessories', images: ['https://images.unsplash.com/photo-1520903920243-7f3f4bc3d2b9?auto=format&fit=crop&q=80&w=800'], stock: 40, seller_id: 'demo' },
  ],
  'arch-studio': [
    { id: 'arch-1', name: 'Concrete Vase', description: 'Brutalist concrete vase.', price: 149.99, category: 'Art', images: ['https://images.unsplash.com/photo-1612196808214-b8e1d14d0f7b?auto=format&fit=crop&q=80&w=800'], stock: 20, seller_id: 'demo' },
    { id: 'arch-2', name: 'Steel Lamp', description: 'Industrial steel floor lamp.', price: 449.99, category: 'Home', images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782d?auto=format&fit=crop&q=80&w=800'], stock: 15, seller_id: 'demo' },
    { id: 'arch-3', name: 'Marble Sculpture', description: 'Modern marble art piece.', price: 999.99, category: 'Art', images: ['https://images.unsplash.com/photo-1541963461112-7d663571fa5c?auto=format&fit=crop&q=80&w=800'], stock: 5, seller_id: 'demo' },
    { id: 'arch-4', name: 'Wooden Chair', description: 'Minimalist oak chair.', price: 349.99, category: 'Furniture', images: ['https://images.unsplash.com/photo-1506439773649-6e0eb1a88d69?auto=format&fit=crop&q=80&w=800'], stock: 25, seller_id: 'demo' },
  ],
  'neo-tokyo': [
    { id: 'tokyo-1', name: 'Neon Visor', description: 'Cyberpunk LED visorglasses.', price: 199.99, category: 'Cyber', images: ['https://images.unsplash.com/photo-1545569341-9eb8b30936b4?auto=format&fit=crop&q=80&w=800'], stock: 50, seller_id: 'demo' },
    { id: 'tokyo-2', name: 'Cyber Deck', description: 'Holographic input device.', price: 1299.99, category: 'Cyber', images: ['https://images.unsplash.com/photo-1550745165-9bc7b1f11ebe?auto=format&fit=crop&q=80&w=800'], stock: 20, seller_id: 'demo' },
    { id: 'tokyo-3', name: 'Plasma Blade', description: 'LED light blade accessory.', price: 89.99, category: 'Cyber', images: ['https://images.unsplash.com/photo-1563241527-3004b7be0253?auto=format&fit=crop&q=80&w=800'], stock: 100, seller_id: 'demo' },
    { id: 'tokyo-4', name: 'Neural Implant', description: 'Augmented reality lens.', price: 599.99, category: 'Cyber', images: ['https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800'], stock: 30, seller_id: 'demo' },
  ],
  'botanica': [
    { id: 'botan-1', name: 'Terracotta Pot', description: 'Handcrafted plant pot.', price: 49.99, category: 'Garden', images: ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=800'], stock: 100, seller_id: 'demo' },
    { id: 'botan-2', name: 'Succulent Set', description: 'Assorted succulents.', price: 34.99, category: 'Plants', images: ['https://images.unsplash.com/photo-1459411552884-841db973b1e1?auto=format&fit=crop&q=80&w=800'], stock: 150, seller_id: 'demo' },
    { id: 'botan-3', name: 'Garden Tools', description: 'Bamboo garden kit.', price: 44.99, category: 'Garden', images: ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=800'], stock: 80, seller_id: 'demo' },
    { id: 'botan-4', name: 'Organic Seeds', description: 'Heirloom seed collection.', price: 24.99, category: 'Plants', images: ['https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&q=80&w=800'], stock: 200, seller_id: 'demo' },
  ],
  'beauty-store': [
    { id: 'beau-1', name: 'Hydrating Serum', description: 'Deeply hydrating serum with hyaluronic acid.', price: 45.00, category: 'Skincare', images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800'], stock: 100, seller_id: 'demo' },
    { id: 'beau-2', name: 'Matte Lipstick', description: 'Long-lasting matte lipstick in various shades.', price: 28.00, category: 'Makeup', images: ['https://images.unsplash.com/photo-1586776977607-310e9c725c37?auto=format&fit=crop&q=80&w=800'], stock: 150, seller_id: 'demo' },
    { id: 'beau-3', name: 'Organic Face Oil', description: 'Pure organic face oil for a radiant glow.', price: 55.00, category: 'Skincare', images: ['https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&q=80&w=800'], stock: 80, seller_id: 'demo' },
    { id: 'beau-4', name: 'Vitamin C Cream', description: 'Brightening vitamin C cream for all skin types.', price: 42.00, category: 'Skincare', images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&q=80&w=800'], stock: 120, seller_id: 'demo' },
  ],
  'shoe-store': [
    { id: 'shoe-1', name: 'Air Max Genesis', description: 'Revolutionary cushioning for maximum comfort.', price: 180.00, category: 'Performance', images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800'], stock: 50, seller_id: 'demo' },
    { id: 'shoe-2', name: 'Urban Glide', description: 'Sleek design for city life.', price: 120.00, category: 'Lifestyle', images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=800'], stock: 80, seller_id: 'demo' },
    { id: 'shoe-3', name: 'Trail Blazer', description: 'Durable grip for any terrain.', price: 150.00, category: 'Outdoor', images: ['https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&q=80&w=800'], stock: 60, seller_id: 'demo' },
    { id: 'shoe-4', name: 'Retro High', description: 'Classic silhouette with a modern twist.', price: 210.00, category: 'Exclusive', images: ['https://images.unsplash.com/photo-1584735175315-9d5df23860e6?auto=format&fit=crop&q=80&w=800'], stock: 40, seller_id: 'demo' },
  ],
  'jewelry-store': [
    { id: 'jew-1', name: 'Infinity Diamond Ring', description: 'Stunning infinity design with brilliant cut diamonds.', price: 3200.00, category: 'Rings', images: ['https://images.unsplash.com/photo-1605100804763-247f67b35534?auto=format&fit=crop&q=80&w=800'], stock: 5, seller_id: 'demo' },
    { id: 'jew-2', name: 'Sapphire Drop Earrings', description: 'Deep blue sapphires set in 18k white gold.', price: 1850.00, category: 'Earrings', images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800'], stock: 8, seller_id: 'demo' },
    { id: 'jew-3', name: 'Gold Link Bracelet', description: 'Hand-polished 24k gold links with secure clasp.', price: 950.00, category: 'Bracelets', images: ['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=800'], stock: 12, seller_id: 'demo' },
    { id: 'jew-4', name: 'Emerald Pendant', description: 'Bespoke emerald pendant with gold surround.', price: 2400.00, category: 'Necklaces', images: ['https://images.unsplash.com/photo-1599643478518-a174fc92a5ce?auto=format&fit=crop&q=80&w=800'], stock: 3, seller_id: 'demo' },
  ],
  'bakery-store': [
    { id: 'bak-1', name: 'Butter Croissant', description: 'Flaky, buttery, and golden brown.', price: 4.50, category: 'Pastries', images: ['https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=800'], stock: 50, seller_id: 'demo' },
    { id: 'bak-2', name: 'Sourdough Loaf', description: 'Naturally leavened with a crisp crust.', price: 8.00, category: 'Bread', images: ['https://images.unsplash.com/photo-1585478259715-876a6a81fc08?auto=format&fit=crop&q=80&w=800'], stock: 30, seller_id: 'demo' },
    { id: 'bak-3', name: 'Macaron Box', description: 'Assorted flavors of French macarons.', price: 24.00, category: 'Sweets', images: ['https://images.unsplash.com/photo-1570784332176-fdd73da66f03?auto=format&fit=crop&q=80&w=800'], stock: 20, seller_id: 'demo' },
  ],
  'couture-store': [
    { id: 'cou-1', name: 'Silk Evening Gown', description: 'Hand-sewn silk gown in obsidian black.', price: 2400.00, category: 'Gowns', images: ['https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&q=80&w=800'], stock: 5, seller_id: 'demo' },
    { id: 'cou-2', name: 'Tailored Blazer', description: 'Structured wool blazer with sharp lapels.', price: 1200.00, category: 'Outerwear', images: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&q=80&w=800'], stock: 10, seller_id: 'demo' },
  ],
  'elite-consulting': [
    { id: 'ec-1', name: 'Strategic Market Entry', description: 'Global market analysis and strategy.', price: 5000.00, category: 'Strategy', seller_id: 'demo' },
    { id: 'ec-2', name: 'Digital Transformation', description: 'End-to-end modernization roadmap.', price: 8500.00, category: 'Innovation', seller_id: 'demo' },
    { id: 'ec-3', name: 'Executive Leadership Coaching', description: '1-on-1 performance optimization.', price: 2500.00, category: 'Consulting', seller_id: 'demo' },
  ],
  'creative-studio': [
    { id: 'cs-1', name: 'Full Brand Identity', description: 'Complete branding package.', price: 3500.00, category: 'Branding', seller_id: 'demo' },
    { id: 'cs-2', name: 'Custom Web Experience', description: 'Immersive digital experience.', price: 6000.00, category: 'Development', seller_id: 'demo' },
    { id: 'cs-3', name: 'Social Impact Campaign', description: 'Viral-ready content strategy.', price: 2800.00, category: 'Marketing', seller_id: 'demo' },
  ],
  'modern-wellness': [
    { id: 'mw-1', name: 'Mindfulness Retreat', description: '3-day immersive experience.', price: 1200.00, category: 'Experience', seller_id: 'demo' },
    { id: 'mw-2', name: 'Holistic Health Coaching', description: 'Personalized wellness plan.', price: 450.00, category: 'Consulting', seller_id: 'demo' },
    { id: 'mw-3', name: 'Guided Meditation Series', description: 'Premium audio library.', price: 85.00, category: 'Digital', seller_id: 'demo' },
  ],
  // Default products for other themes
  'default': [
    { id: 'demo-1', name: 'Premium Wireless Headphones', description: 'High-quality wireless headphones.', price: 299.99, category: 'Electronics', images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800'], stock: 50, seller_id: 'demo' },
    { id: 'demo-2', name: 'Smart Watch Pro', description: 'Advanced smartwatch.', price: 449.99, category: 'Electronics', images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf29?auto=format&fit=crop&q=80&w=800'], stock: 30, seller_id: 'demo' },
    { id: 'demo-3', name: 'Minimalist Desk Lamp', description: 'Modern LED lamp.', price: 89.99, category: 'Home', images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782d?auto=format&fit=crop&q=80&w=800'], stock: 100, seller_id: 'demo' },
    { id: 'demo-4', name: 'Leather Messenger Bag', description: 'Genuine leather bag.', price: 199.99, category: 'Fashion', images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=800'], stock: 25, seller_id: 'demo' },
  ]
};

// Get Products (Publicly available if seller_id is provided)
// --- Discounts Routes ---

// Get All Discounts for a Seller
app.get('/api/discounts', authenticateToken, async (req, res) => {
  try {
    const { sellerId } = req.user;
    if (!sellerId) return res.status(403).json({ message: 'Only sellers can access discounts' });

    const discountsRes = await db.query('SELECT * FROM discounts WHERE seller_id = $1 ORDER BY created_at DESC', [sellerId]);
    res.json(toCamel(discountsRes.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create Discount
app.post('/api/discounts', authenticateToken, async (req, res) => {
  try {
    const { sellerId } = req.user;
    if (!sellerId) return res.status(403).json({ message: 'Only sellers can create discounts' });

    const { 
      code, name, description, type, value, minRequirement, 
      buyXGetY, crossDiscount, appliesTo, productIds, 
      categoryIds, usageLimit, minSpend, minQuantity, 
      status, startDate, endDate 
    } = req.body;

    const discountRes = await db.query(
      `INSERT INTO discounts (
        seller_id, code, name, description, type, value, 
        min_requirement, buy_x_get_y, cross_discount, 
        applies_to, product_ids, category_ids, usage_limit, 
        min_spend, min_quantity, status, start_date, end_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
      RETURNING *`,
      [
        sellerId, code || null, name, description || null, type, value || 0,
        minRequirement ? JSON.stringify(minRequirement) : null,
        buyXGetY ? JSON.stringify(buyXGetY) : null,
        crossDiscount ? JSON.stringify(crossDiscount) : null,
        appliesTo, productIds || null, categoryIds || null, usageLimit || null,
        minSpend || null, minQuantity || null, status || 'active',
        startDate || new Date(), endDate || null
      ]
    );

    res.status(201).json(toCamel(discountRes.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Discount
app.patch('/api/discounts/:id', authenticateToken, async (req, res) => {
  try {
    const { sellerId } = req.user;
    const { id } = req.params;
    if (!sellerId) return res.status(403).json({ message: 'Only sellers can update discounts' });

    const { 
      code, name, description, type, value, minRequirement, 
      buyXGetY, crossDiscount, appliesTo, productIds, 
      categoryIds, usageLimit, minSpend, minQuantity, 
      status, startDate, endDate 
    } = req.body;

    const discountRes = await db.query(
      `UPDATE discounts SET 
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        type = COALESCE($4, type),
        value = COALESCE($5, value),
        min_requirement = COALESCE($6, min_requirement),
        buy_x_get_y = COALESCE($7, buy_x_get_y),
        cross_discount = COALESCE($8, cross_discount),
        applies_to = COALESCE($9, applies_to),
        product_ids = COALESCE($10, product_ids),
        category_ids = COALESCE($11, category_ids),
        usage_limit = COALESCE($12, usage_limit),
        min_spend = COALESCE($13, min_spend),
        min_quantity = COALESCE($14, min_quantity),
        status = COALESCE($15, status),
        start_date = COALESCE($16, start_date),
        end_date = COALESCE($17, end_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $18 AND seller_id = $19 RETURNING *`,
      [
        code || null, name || null, description || null, type || null, value || null,
        minRequirement ? JSON.stringify(minRequirement) : null,
        buyXGetY ? JSON.stringify(buyXGetY) : null,
        crossDiscount ? JSON.stringify(crossDiscount) : null,
        appliesTo || null, productIds || null, categoryIds || null, usageLimit || null,
        minSpend || null, minQuantity || null, status || null,
        startDate || null, endDate || null, id, sellerId
      ]
    );

    if (discountRes.rows.length === 0) return res.status(404).json({ message: 'Discount not found' });
    res.json(toCamel(discountRes.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete Discount
app.delete('/api/discounts/:id', authenticateToken, async (req, res) => {
  try {
    const { sellerId } = req.user;
    const { id } = req.params;
    if (!sellerId) return res.status(403).json({ message: 'Only sellers can delete discounts' });

    const result = await db.query('DELETE FROM discounts WHERE id = $1 AND seller_id = $2', [id, sellerId]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Discount not found' });
    res.json({ message: 'Discount deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public: Get Discounts by Seller
app.get('/api/discounts/public/:sellerId', async (req, res) => {
  try {
    const { sellerId } = req.params;
    const discountsRes = await db.query(
      "SELECT * FROM discounts WHERE seller_id = $1 AND status = 'active' AND (end_date IS NULL OR end_date > CURRENT_TIMESTAMP)", 
      [sellerId]
    );
    res.json(toCamel(discountsRes.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public: Validate Coupon
app.post('/api/discounts/validate', async (req, res) => {
  try {
    const { sellerId, code } = req.body;
    const discountRes = await db.query(
      "SELECT * FROM discounts WHERE seller_id = $1 AND code = $2 AND status = 'active' AND (end_date IS NULL OR end_date > CURRENT_TIMESTAMP)",
      [sellerId, code]
    );

    if (discountRes.rows.length === 0) {
      return res.status(404).json({ message: 'Invalid or expired coupon code' });
    }

    const discount = discountRes.rows[0];
    if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
      return res.status(400).json({ message: 'Coupon usage limit reached' });
    }

    res.json(toCamel(discount));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- File Upload Routes ---

app.post('/api/upload', authenticateToken, upload.array('files', 10), (req, res) => {
  try {
    const fileUrls = req.files.map(file => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`);
    res.json({ urls: fileUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// --- Category Routes ---

app.get('/api/categories', authenticateToken, async (req, res) => {
  try {
    const sellerRes = await db.query('SELECT id FROM sellers WHERE user_id = $1', [req.user.id]);
    if (sellerRes.rows.length === 0) return res.status(403).json({ message: 'Only sellers can access categories' });
    const sellerId = sellerRes.rows[0].id;
    
    const categoriesRes = await db.query('SELECT * FROM categories WHERE seller_id = $1 ORDER BY name ASC', [sellerId]);
    res.json(toCamel(categoriesRes.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/categories', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const sellerRes = await db.query('SELECT id FROM sellers WHERE user_id = $1', [req.user.id]);
    if (sellerRes.rows.length === 0) return res.status(403).json({ message: 'Only sellers can create categories' });
    const sellerId = sellerRes.rows[0].id;

    const categoryRes = await db.query(
      'INSERT INTO categories (seller_id, name) VALUES ($1, $2) ON CONFLICT (seller_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING *',
      [sellerId, name]
    );
    res.status(201).json(toCamel(categoryRes.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { seller_id, theme } = req.query;
    
    // Demo mode: return products based on theme
    if (seller_id === 'demo' || seller_id === 'demo-seller') {
      const themeKey = theme && THEME_PRODUCTS[theme] ? theme : 'default';
      // Add fallback 'image' field for themes that expect single image
      const products = THEME_PRODUCTS[themeKey].map(p => ({
        ...p,
        image: p.images && p.images[0] ? p.images[0] : null
      }));
      return res.json(products);
    }
    
    let query = 'SELECT * FROM products';
    let params = [];
    
    if (seller_id) {
      query += ' WHERE seller_id = $1';
      params.push(seller_id);
    }
    
    const productsRes = await db.query(query, params);
    res.json(toCamel(productsRes.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create Product/Service
app.post('/api/products', authenticateToken, async (req, res) => {
  const { name, description, price, category, images, videos, urls, stock, status, type } = req.body;
  try {
    const sellerRes = await db.query('SELECT id FROM sellers WHERE user_id = $1', [req.user.id]);
    if (sellerRes.rows.length === 0) return res.status(403).json({ message: 'Only sellers can create products' });
    
    const sellerId = sellerRes.rows[0].id;
    
    const productRes = await db.query(
      `INSERT INTO products (seller_id, name, description, price, category, images, videos, urls, stock, status, type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [sellerId, name, description, price, category, images, videos || [], urls || [], stock, status, type || 'product']
    );
    res.status(201).json(toCamel(productRes.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Product
app.put('/api/products/:id', authenticateToken, async (req, res) => {
  const { name, description, price, category, images, videos, urls, stock, status, type } = req.body;
  try {
    const productRes = await db.query(
      `UPDATE products SET 
        name = COALESCE($1, name), 
        description = COALESCE($2, description), 
        price = COALESCE($3, price), 
        category = COALESCE($4, category), 
        images = COALESCE($5, images), 
        videos = COALESCE($6, videos),
        urls = COALESCE($7, urls),
        stock = COALESCE($8, stock), 
        status = COALESCE($9, status),
        type = COALESCE($10, type),
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = $11 RETURNING *`,
      [name, description, price, category, images, videos, urls, stock, status, type, req.params.id]
    );
    res.json(toCamel(productRes.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete Product
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Order Routes ---

app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { seller_id } = req.query;
    let query = 'SELECT o.* FROM orders o';
    let params = [];
    let whereConditions = [];

    if (req.user.role === 'customer') {
      // For customers, only show THEIR orders (via customers table)
      query += ' JOIN customers c ON o.customer_id = c.id';
      whereConditions.push(`c.user_id = $${params.length + 1}`);
      params.push(req.user.id);
    } else if (req.user.role === 'seller') {
      // Sellers see orders for their own store
      whereConditions.push(`o.seller_id = (SELECT id FROM sellers WHERE user_id = $${params.length + 1})`);
      params.push(req.user.id);
    }

    if (seller_id) {
      whereConditions.push(`o.seller_id = $${params.length + 1}`);
      params.push(seller_id);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' ORDER BY o.created_at DESC';

    const ordersRes = await db.query(query, params);
    res.json(toCamel(ordersRes.rows));
  } catch (err) {
    console.error('Fetch Orders Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/orders', async (req, res) => {
  const { sellerId, customerId, customerName, customerEmail, customerPhone, items, total, currency: bodyCurrency, shippingAddress, paymentMethod } = req.body;
  const client = await db.pool.connect();
  try {
    // Get seller's default currency and store name
    const sellerInfoRes = await db.query('SELECT currency, store_name FROM sellers WHERE id = $1', [sellerId]);
    const currency = bodyCurrency || sellerInfoRes.rows[0]?.currency || 'USD';
    const storeName = sellerInfoRes.rows[0]?.store_name || 'Our Store';
    
    await client.query('BEGIN');

    // Ensure customer exists in customers table
    let finalCustomerId = null;
    let validUserId = null;

    // 1. Validate if customerId is a valid user.id
    if (customerId) {
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [customerId]);
      if (userCheck.rows.length > 0) {
        validUserId = customerId;
      }
    }

    // 2. Find or Create customer record linked to user_id and email
    // Check by user_id first if available
    let existingCust = null;
    if (validUserId) {
      const byUser = await client.query(
        'SELECT id FROM customers WHERE seller_id = $1 AND user_id = $2',
        [sellerId, validUserId]
      );
      if (byUser.rows.length > 0) existingCust = byUser.rows[0];
    }

    // Then by email if not found by user_id
    if (!existingCust) {
      const byEmail = await client.query(
        'SELECT id FROM customers WHERE seller_id = $1 AND email = $2',
        [sellerId, customerEmail]
      );
      if (byEmail.rows.length > 0) existingCust = byEmail.rows[0];
    }

    if (existingCust) {
      finalCustomerId = existingCust.id;
      // Update phone, user_id, and name if needed
      await client.query(
        'UPDATE customers SET phone = COALESCE($1, phone), user_id = COALESCE($2, user_id), name = $3 WHERE id = $4',
        [customerPhone || null, validUserId || null, customerName, finalCustomerId]
      );
    } else {
      // Create new customer record
      const newCustRes = await client.query(
        'INSERT INTO customers (seller_id, name, email, phone, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [sellerId, customerName, customerEmail, customerPhone, validUserId]
      );
      finalCustomerId = newCustRes.rows[0].id;
    }

    const orderRes = await client.query(
      `INSERT INTO orders (seller_id, customer_id, customer_name, customer_email, items, total, currency, status, shipping_address) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8) RETURNING *`,
      [sellerId, finalCustomerId, customerName, customerEmail, JSON.stringify(items), total, currency || 'USD', JSON.stringify(shippingAddress)]
    );

    const order = toCamel(orderRes.rows[0]);

    await client.query('COMMIT');

    // Check seller's payment settings
    const sellerRes = await db.query('SELECT user_id, payment_gateways FROM sellers WHERE id = $1', [sellerId]);
    const sellerRow = sellerRes.rows[0];
    const sellerUserId = sellerRow?.user_id;
    const paymentGateways = sellerRow?.payment_gateways || { active: 'iyonicpay', iyonicpay: { enabled: true } };
    
    console.log('Payment Gateways for seller', sellerId, ':', JSON.stringify(paymentGateways, null, 2));

    // 1. Handle Custom Payment Link
    if (paymentGateways.active === 'custom' && paymentGateways.custom?.enabled) {
      const custom = paymentGateways.custom;
      if (custom.link) {
        return res.status(201).json({
          ...order,
          paymentMethod: 'custom',
          paymentLink: custom.link
        });
      }
      
      // If it's custom paystack with an API key, we could initialize it here
      let provider = custom.provider?.toLowerCase();
      const apiKey = custom.apiKey || custom.api_key;
      
      // Auto-detect Paystack if provider is empty but key looks like Paystack
      // IMPORTANT: Paystack initialization requires the SECRET key (sk_...)
      if (!provider && apiKey && (apiKey.startsWith('sk_') || apiKey.startsWith('pk_'))) {
        provider = 'paystack';
      }
      
      if (provider === 'paystack' && apiKey) {
        // If they provided a public key (pk_) instead of a secret key (sk_), it will fail
        if (apiKey.startsWith('pk_')) {
          console.error('Seller provided a PUBLIC key instead of a SECRET key for Paystack');
        }

        const sellerPaystack = Paystack(apiKey);
        try {
          const paystackResponse = await new Promise((resolve, reject) => {
            sellerPaystack.transaction.initialize({
              email: customerEmail,
              amount: Math.round(total * 100),
              currency: currency,
              metadata: { order_id: order.id, type: 'order_payment' }
            }, (err, body) => {
              if (err || (body && body.status === false)) {
                reject(new Error(body?.message || err?.message || 'Seller Paystack initialization failed'));
              } else {
                resolve(body);
              }
            });
          });

          return res.status(201).json({
            ...order,
            paymentMethod: 'paystack',
            paymentLink: paystackResponse.data.authorization_url,
            reference: paystackResponse.data.reference,
            publicKey: custom.publicKey || custom.public_key || apiKey, // Try to use provided public key
            isCustomPaystack: true
          });
        } catch (paystackErr) {
          console.error('Seller Paystack Init Error:', paystackErr);
          // Fallback to platform paystack if custom fails
        }
      }
    }

    // 2. Handle IyonicPay (if active and enabled)
    let iyonicPayEnabled = paymentGateways.active === 'iyonicpay' && paymentGateways.iyonicpay?.enabled;
    console.log('IyonicPay checks:', { iyonicPayEnabled, sellerUserId });
    
    if (iyonicPayEnabled && sellerUserId) {
      const linkToken = nanoid(12);
      await db.query(
        'INSERT INTO invoices (user_id, order_id, amount, description, link_token) VALUES ($1, $2, $3, $4, $5)',
        [sellerUserId, order.id, total, `Payment for Order #${order.id}`, linkToken]
      );
      
      return res.status(201).json({
        ...order,
        paymentMethod: 'iyonicpay',
        paymentLink: `/iyonicpay/invoice/${linkToken}`
      });
    }

    // 3. Fallback to platform Paystack (if IyonicPay failed/not enabled and no custom link)
    const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);
      
      try {
        const paystackResponse = await new Promise((resolve, reject) => {
          paystack.transaction.initialize({
            email: customerEmail,
            amount: Math.round(total * 100), // in kobo/cents
            currency: currency,
            metadata: {
              order_id: order.id,
              type: 'order_payment'
            }
          }, (err, body) => {
            if (err || (body && body.status === false)) {
              reject(new Error(body?.message || err?.message || 'Paystack initialization failed'));
            } else {
              resolve(body);
            }
          });
        });

        return res.status(201).json({
          ...order,
          paymentMethod: 'paystack',
          paymentLink: paystackResponse.data.authorization_url,
          reference: paystackResponse.data.reference
        });
      } catch (paystackErr) {
        console.error('Paystack Init Error:', paystackErr);
        // Even if paystack fails, order is created
        return res.status(201).json(order);
      }

    res.status(201).json(order);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create Order Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  } finally {
    client.release();
  }
});

// Verify Order Payment
app.post('/api/orders/verify-payment', async (req, res) => {
  const { reference, orderId } = req.body;
  const client = await db.pool.connect();

  try {
    let paystackKey = process.env.PAYSTACK_SECRET_KEY;

    // If orderId is provided, check if the seller has a custom Paystack key
    if (orderId) {
      const sellerKeyRes = await db.query(
        'SELECT s.payment_gateways FROM sellers s JOIN orders o ON s.id = o.seller_id WHERE o.id = $1',
        [orderId]
      );
      if (sellerKeyRes.rows.length > 0) {
        const pg = sellerKeyRes.rows[0].payment_gateways;
        if (pg?.active === 'custom') {
          const custom = pg.custom;
          let provider = custom?.provider?.toLowerCase();
          const customKey = custom?.apiKey || custom?.api_key;
          
          if (!provider && customKey && (customKey.startsWith('sk_') || customKey.startsWith('pk_'))) {
            provider = 'paystack';
          }
          
          if (provider === 'paystack' && customKey) {
            paystackKey = customKey;
          }
        }
      }
    }

    const paystack = Paystack(paystackKey);
    const body = await new Promise((resolve, reject) => {
      paystack.transaction.verify(reference, (err, body) => {
        if (err) reject(err);
        else resolve(body);
      });
    });

    if (body.status && body.data.status === 'success') {
      const finalOrderId = body.data.metadata?.order_id || orderId;
      const amount = body.data.amount / 100;
      const paymentCurrency = (body.data.currency || 'USD').toUpperCase();

      const rates = { 'USD': 1, 'KES': 125, 'EUR': 0.92, 'GBP': 0.79, 'NGN': 1500, 'GHS': 13 };
      const convert = (val, from, to) => {
        const fromRate = rates[from] || 1;
        const toRate = rates[to] || 1;
        return (val / fromRate) * toRate;
      };

      await client.query('BEGIN');
      
      const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 AND status = \'pending\'', [finalOrderId]);
      if (orderRes.rows.length > 0) {
        const order = orderRes.rows[0];
        
        // Update Order Status
        await client.query('UPDATE orders SET status = \'processing\', updated_at = CURRENT_TIMESTAMP WHERE id = $1', [finalOrderId]);

        // Update Seller Revenue and Orders count
        await client.query(
          "UPDATE sellers SET stats = jsonb_set(jsonb_set(stats, '{totalRevenue}', ((stats->>'totalRevenue')::numeric + $1)::text::jsonb), '{totalOrders}', ((stats->>'totalOrders')::int + 1)::text::jsonb) WHERE id = $2",
          [amount, order.seller_id]
        );

        // --- Manager Sales Commission Logic (Enterprise only) ---
        const sellerFullRes = await client.query('SELECT manager_id, store_name, subscription FROM sellers WHERE id = $1', [order.seller_id]);
        const sellerFull = sellerFullRes.rows[0];
        const sellerPlan = sellerFull.subscription?.plan || 'starter';
        
        // --- 7% Platform Commission for Starter Plan ---
        if (sellerPlan === 'starter') {
          const platformCommission = amount * 0.07;
          
          // Find admin user (manager_admin role)
          const adminRes = await client.query('SELECT id FROM users WHERE role = \'manager_admin\' LIMIT 1');
          const adminId = adminRes.rows[0]?.id || 'admin-id';
          
          const adminWalletRes = await client.query('SELECT id, currency FROM wallets WHERE user_id = $1', [adminId]);
          if (adminWalletRes.rows.length > 0) {
            const adminWallet = adminWalletRes.rows[0];
            const adminWalletCurrency = (adminWallet.currency || 'USD').toUpperCase();
            const commissionToAdd = convert(platformCommission, paymentCurrency, adminWalletCurrency);
            
            await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [commissionToAdd, adminWallet.id]);
            await client.query(
              'INSERT INTO transactions (receiver_wallet_id, amount, currency, type, status, description) VALUES ($1, $2, $3, \'receive\', \'completed\', $4)',
              [adminWallet.id, platformCommission, paymentCurrency, `Starter plan 7% commission from ${sellerFull.store_name} for order: ${finalOrderId}`]
            );
          }
        }

        if (sellerFull?.manager_id) {
          const managerRes = await client.query('SELECT * FROM seller_managers WHERE id = $1', [sellerFull.manager_id]);
          if (managerRes.rows.length > 0) {
            const manager = managerRes.rows[0];
            const managerPlan = manager.subscription?.plan || 'starter';
            const commissionRate = parseFloat(manager.commission_rate || 0);

            // Sales commission is ONLY for Enterprise managers
            if (managerPlan === 'enterprise' && commissionRate > 0) {
              const commissionAmount = amount * commissionRate;
              
              // Credit manager's wallet
              const mWalletRes = await client.query('SELECT id, currency FROM wallets WHERE user_id = $1', [manager.user_id]);
              if (mWalletRes.rows.length > 0) {
                const mWallet = mWalletRes.rows[0];
                const mWalletCurrency = (mWallet.currency || 'USD').toUpperCase();
                const commissionToAdd = convert(commissionAmount, paymentCurrency, mWalletCurrency);
                
                await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [commissionToAdd, mWallet.id]);
                await client.query(
                  'INSERT INTO transactions (receiver_wallet_id, amount, currency, type, status, description) VALUES ($1, $2, $3, \'receive\', \'completed\', $4)',
                  [mWallet.id, commissionAmount, paymentCurrency, `Sales commission from seller ${sellerFull.store_name} for order: ${finalOrderId}`]
                );
              }
            }
          }
        }

        // Record in Seller's Wallet
        const sellerRes = await client.query('SELECT user_id FROM sellers WHERE id = $1', [order.seller_id]);
        if (sellerRes.rows.length > 0) {
          const userId = sellerRes.rows[0].user_id;
          
          let wRes = await client.query('SELECT id, currency FROM wallets WHERE user_id = $1', [userId]);
          if (wRes.rows.length === 0) {
            wRes = await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING id, currency', [userId]);
          }
          
          const sellerWallet = wRes.rows[0];
          const sellerWalletCurrency = (sellerWallet.currency || 'USD').toUpperCase();
          const amountToAdd = convert(amount, paymentCurrency, sellerWalletCurrency);

          await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [amountToAdd, sellerWallet.id]);
          
          const walletId = sellerWallet.id;

          await client.query(`
            INSERT INTO transactions (receiver_wallet_id, amount, currency, type, status, description) 
            VALUES ($1, $2, $3, 'receive', 'completed', $4)
          `, [walletId, amount, paymentCurrency, `Payment for order: ${finalOrderId}`]);
        }

        // Update Customer stats
        await client.query(`
          UPDATE customers 
          SET total_orders = total_orders + 1, 
              total_spent = total_spent + $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [amount, order.customer_id]);
      }

      await client.query('COMMIT');

      // Send order notification email to both customer and seller
      if (orderRes.rows.length > 0) {
        const order = orderRes.rows[0];
        
        // Fetch seller details for the email
        const sellerInfoRes = await db.query(
          'SELECT s.store_name, u.email, u.name as user_name FROM sellers s JOIN users u ON s.user_id = u.id WHERE s.id = $1', 
          [order.seller_id]
        );
        const sellerInfo = sellerInfoRes.rows[0];
        
        const sellerData = {
          name: sellerInfo?.user_name || 'Seller',
          email: sellerInfo?.email,
          storeName: sellerInfo?.store_name || 'Our Store'
        };

        const customerData = {
          name: order.customer_name,
          email: order.customer_email
        };

        // Only send Iyonicorp email if seller hasn't configured their own email
        const hasSellerEmail = await hasSellerEmailConfig(order.seller_id);
        if (!hasSellerEmail) {
          mailer.sendOrderNotification(toCamel(order), customerData, sellerData);
        } else {
          // Use seller's email configuration
          const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          triggerAutomation('order_placed', {
            sellerId: order.seller_id,
            customerEmail: order.customer_email,
            customerName: order.customer_name,
            orderId: order.id,
            orderTotal: amount,
            storeName: sellerInfo?.store_name || 'Our Store',
            items: orderItems
          });
        }
      }

      res.json({ success: true, orderId: finalOrderId });
    } else {
      res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Verify Payment Error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  } finally {
    if (client) client.release();
  }
});

app.patch('/api/orders/:id', authenticateToken, async (req, res) => {
  const { status } = req.body;
  try {
    const orderRes = await db.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    const order = orderRes.rows[0];
    
    // Trigger shipped automation
    if (status === 'shipped') {
      const sellerRes = await db.query('SELECT store_name FROM sellers WHERE id = $1', [order.seller_id]);
      triggerAutomation('order_shipped', {
        sellerId: order.seller_id,
        customerEmail: order.customer_email,
        customerName: order.customer_name,
        orderId: order.id,
        storeName: sellerRes.rows[0]?.store_name || 'Our Store'
      });
    }
    
    // Send status update email
    mailer.sendOrderStatusUpdate(toCamel(order), { email: order.customer_email });

    res.json(toCamel(order));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Customer requests refund via invoice
app.post('/api/iyonicpay/invoices/:token/refund', authenticateToken, async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    // Check IyonicPay activation
    const userRes = await db.query('SELECT iyonicpay_opt_in FROM users WHERE id = $1', [userId]);
    if (!userRes.rows[0]?.iyonicpay_opt_in) {
      return res.status(403).json({ message: 'IyonicPay must be activated before claiming a refund' });
    }

    // Get invoice
    const invoiceRes = await db.query('SELECT * FROM invoices WHERE link_token = $1', [token]);
    if (invoiceRes.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    const invoice = invoiceRes.rows[0];

    // Check if already has a pending refund request
    const existingRefund = await db.query(
      'SELECT id FROM refund_requests WHERE invoice_id = $1 AND status = $2',
      [invoice.id, 'pending']
    );
    if (existingRefund.rows.length > 0) {
      return res.status(400).json({ message: 'A refund request already exists for this invoice' });
    }

    // Get seller info first
    const sellerRes = await db.query(
      'SELECT s.*, u.email as seller_email, u.name as seller_name FROM sellers s JOIN users u ON s.user_id = u.id WHERE s.user_id = $1',
      [invoice.user_id]
    );
    const seller = sellerRes.rows[0];

    // Get customer record - find customer by email (user's email) for this seller
    let customerRes = await db.query(
      'SELECT c.* FROM customers c WHERE c.seller_id = $1 AND c.email = $2',
      [seller?.id, req.user.email]
    );

    let customerId = customerRes.rows[0]?.id || null;

    // Create customer record if it doesn't exist and we have a seller
    if (!customerId && seller?.id) {
      try {
        const newCustomerRes = await db.query(
          'INSERT INTO customers (seller_id, user_id, name, email) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, seller_id) DO UPDATE SET email = EXCLUDED.email RETURNING id',
          [seller.id, req.user.id, req.user.name || 'Customer', req.user.email]
        );
        customerId = newCustomerRes.rows[0].id;
      } catch (err) {
        console.error('Error creating customer record during refund:', err);
      }
    }

    // Create refund request using invoice currency as priority
    const currency = invoice.currency || seller?.currency || 'USD';
    
    const refundRes = await db.query(
      `INSERT INTO refund_requests (invoice_id, order_id, customer_id, seller_id, amount, currency, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [invoice.id, invoice.order_id, customerId, seller?.id || null, invoice.amount, currency, reason]
    );
    const refundRequest = refundRes.rows[0];

    // Update order status if exists
    if (invoice.order_id) {
      await db.query(
        "UPDATE orders SET status = 'refund_requested', refund_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [reason, invoice.order_id]
      );
    }

    // Send refund request emails
    const customerEmail = req.user.email;
    const customerName = req.user.name || req.user.first_name || 'Customer';
    const storeName = seller?.store_name || 'Our Store';

    const hasSellerEmail = await hasSellerEmailConfig(seller?.id);
    
    if (hasSellerEmail) {
      triggerAutomation('refund_requested', {
        sellerId: seller?.id,
        customerEmail,
        customerName,
        orderId: invoice.order_id || invoice.id,
        orderTotal: invoice.amount,
        storeName,
        reason: reason || 'Not provided'
      });
    } else {
      // Get admin email
      const adminRes = await db.query("SELECT email FROM users WHERE role = 'manager_admin' LIMIT 1");
      const adminEmail = adminRes.rows[0]?.email || process.env.VITE_ADMIN_EMAIL;

      mailer.sendRefundRequestEmail(
        { email: customerEmail, name: customerName },
        { email: seller?.seller_email, name: seller?.seller_name, storeName },
        { id: invoice.order_id || invoice.id, total: invoice.amount, currency: invoice.currency, items: [], reason },
        adminEmail
      );
    }

    res.json({ success: true, refundRequest: toCamel(refundRequest), message: 'Refund request submitted' });
  } catch (err) {
    console.error('Refund request error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get refund requests for seller or customer
app.get('/api/iyonicpay/refunds', authenticateToken, async (req, res) => {
  try {
    const userRes = await db.query('SELECT id FROM sellers WHERE user_id = $1', [req.user.id]);
    
    if (userRes.rows.length > 0) {
      // User is a seller - return requests made TO them
      const sellerId = userRes.rows[0].id;
      const refundsRes = await db.query(
        `SELECT r.*, i.link_token as invoice_token, i.description as invoice_description, r.order_id,
                c.name as customer_name, c.email as customer_email, s.store_name, s.currency as current_seller_currency
         FROM refund_requests r
         LEFT JOIN invoices i ON r.invoice_id = i.id
         LEFT JOIN customers c ON r.customer_id = c.id
         LEFT JOIN sellers s ON r.seller_id = s.id
         WHERE r.seller_id = $1
         ORDER BY r.created_at DESC`,
        [sellerId]
      );
      const refunds = refundsRes.rows.map(r => {
        if (r.current_seller_currency) {
          r.currency = r.current_seller_currency;
        }
        return r;
      });
      return res.json(toCamel(refunds));
    } else {
      // User is likely a customer - return requests made BY them
      const refundsRes = await db.query(
        `SELECT r.*, i.link_token as invoice_token, i.description as invoice_description, r.order_id,
                s.store_name as merchant_name, s.subdomain as merchant_subdomain, s.currency as current_seller_currency
         FROM refund_requests r
         LEFT JOIN customers c ON r.customer_id = c.id
         LEFT JOIN invoices i ON r.invoice_id = i.id
         LEFT JOIN sellers s ON r.seller_id = s.id
         WHERE c.user_id = $1 OR r.customer_id IN (SELECT id FROM customers WHERE user_id = $1)
         ORDER BY r.created_at DESC`,
        [req.user.id]
      );
      const refunds = refundsRes.rows.map(r => {
        if (r.current_seller_currency) {
          r.currency = r.current_seller_currency;
        }
        return r;
      });
      return res.json(toCamel(refunds));
    }
  } catch (err) {
    console.error('Error fetching refund requests:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve or reject refund request
app.patch('/api/iyonicpay/refunds/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, action } = req.body; // action: 'approve' or 'reject'

    const userRes = await db.query('SELECT id FROM sellers WHERE user_id = $1', [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(403).json({ message: 'Not a seller' });
    }
    const sellerId = userRes.rows[0].id;

    // Get refund request
    const refundRes = await db.query('SELECT * FROM refund_requests WHERE id = $1 AND seller_id = $2', [id, sellerId]);
    if (refundRes.rows.length === 0) {
      return res.status(404).json({ message: 'Refund request not found' });
    }
    const refund = refundRes.rows[0];

    // Update status
    const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : status;
    
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'UPDATE refund_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStatus, id]
      );

      // If approved, handle wallet transfer
      if (action === 'approve') {
        const refundAmount = parseFloat(refund.amount);
        const refundCurrency = (refund.currency || 'USD').toUpperCase();
        
        // Hardcoded rates for conversion ($1 = 125 KES)
        const rates = { 'USD': 1, 'KES': 125, 'EUR': 0.92, 'GBP': 0.79, 'NGN': 1500, 'GHS': 13 };
        
        const convert = (val, from, to) => {
          const fromRate = rates[from] || 1;
          const toRate = rates[to] || 1;
          return (val / fromRate) * toRate;
        };
        
        // 1. Deduct from seller wallet
        const sellerWalletRes = await client.query('SELECT id, balance, currency FROM wallets WHERE user_id = $1', [req.user.id]);
        if (sellerWalletRes.rows.length === 0) {
          throw new Error('Seller wallet not found');
        }
        
        const sellerWallet = sellerWalletRes.rows[0];
        const sellerCurrency = (sellerWallet.currency || 'USD').toUpperCase();
        const sellerDeduction = convert(refundAmount, refundCurrency, sellerCurrency);

        if (parseFloat(sellerWallet.balance) < sellerDeduction) {
          throw new Error(`Insufficient balance in wallet to process refund. Required: ${sellerDeduction.toFixed(2)} ${sellerCurrency}`);
        }
        
        await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [sellerDeduction, sellerWallet.id]);
        
        // 2. If customer has a wallet, add to it
        const customerInfo = await client.query('SELECT user_id FROM customers WHERE id = $1', [refund.customer_id]);
        const customerUserId = customerInfo.rows[0]?.user_id;
        
        if (customerUserId) {
          const customerWalletRes = await client.query('SELECT id, balance, currency FROM wallets WHERE user_id = $1', [customerUserId]);
          if (customerWalletRes.rows.length > 0) {
            const customerWallet = customerWalletRes.rows[0];
            const customerCurrency = (customerWallet.currency || 'USD').toUpperCase();
            const customerCredit = convert(refundAmount, refundCurrency, customerCurrency);
            
            await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [customerCredit, customerWallet.id]);
            
            // Record transaction
            await client.query(`
              INSERT INTO transactions (sender_wallet_id, receiver_wallet_id, amount, currency, type, status, description) 
              VALUES ($1, $2, $3, $4, 'refund', 'completed', $5)
            `, [sellerWallet.id, customerWallet.id, refundAmount, refundCurrency, `Refund for ${refund.order_id || refund.invoice_id}`]);
          } else {
             // Record transaction as outgoing from seller
             await client.query(`
              INSERT INTO transactions (sender_wallet_id, amount, currency, type, status, description) 
              VALUES ($1, $2, $3, 'refund', 'completed', $4)
            `, [sellerWallet.id, refundAmount, refundCurrency, `Refund for ${refund.order_id || refund.invoice_id} (External)`]);
          }
        } else {
           // Record transaction as outgoing from seller
           await client.query(`
            INSERT INTO transactions (sender_wallet_id, amount, currency, type, status, description) 
            VALUES ($1, $2, $3, 'refund', 'completed', $4)
          `, [sellerWallet.id, refundAmount, refundCurrency, `Refund for ${refund.order_id || refund.invoice_id} (External)`]);
        }
      }

      // Update order status if exists
      if (refund.order_id) {
        const orderStatus = action === 'approve' ? 'refunded' : 'cancelled';
        await client.query(
          "UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [orderStatus, refund.order_id]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Refund processing error:', err);
      return res.status(400).json({ message: err.message || 'Failed to process refund' });
    } finally {
      client.release();
    }

    // Get seller info for email
    const sellerRes = await db.query('SELECT s.store_name, u.email, u.name FROM sellers s JOIN users u ON s.user_id = u.id WHERE s.id = $1', [sellerId]);
    const seller = sellerRes.rows[0];

    // Get customer info
    const customerRes = await db.query('SELECT * FROM customers WHERE id = $1', [refund.customer_id]);
    const customer = customerRes.rows[0];

    if (customer && seller) {
      const storeName = seller.store_name;
      const hasSellerEmail = await hasSellerEmailConfig(sellerId);
      
      const subject = action === 'approve' 
        ? `Refund Approved - Order #${refund.order_id || refund.invoice_id}`
        : `Refund Rejected - Order #${refund.order_id || refund.invoice_id}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${action === 'approve' ? '#10b981' : '#ef4444'};">Refund ${action === 'approve' ? 'Approved' : 'Rejected'}</h2>
          <p>Hello ${customer.name},</p>
          <p>Your refund request for <strong>${formatPrice(refund.amount, refund.currency)}</strong> at <strong>${storeName}</strong> has been <strong>${action === 'approve' ? 'approved' : 'rejected'}</strong>.</p>
          ${action === 'approve' ? '<p>The refund will be processed to your original payment method within 5-7 business days.</p>' : '<p>Please contact the store for more information.</p>'}
        </div>
      `;

      if (hasSellerEmail) {
        // Use seller's email config
        triggerAutomation('refund_processed', {
          sellerId,
          customerEmail: customer.email,
          customerName: customer.name,
          orderId: refund.order_id || refund.invoice_id,
          orderTotal: refund.amount,
          storeName,
          refundStatus: action
        });
      } else {
        await mailer.sendEmail({ to: customer.email, subject, html });
        
        // Notify seller too
        if (seller.email) {
          await mailer.sendEmail({ to: seller.email, subject, html });
        }
        
        // Notify admin for records
        const adminRes = await db.query("SELECT email FROM users WHERE role = 'manager_admin' LIMIT 1");
        const adminEmail = adminRes.rows[0]?.email || process.env.VITE_ADMIN_EMAIL;
        if (adminEmail) {
          await mailer.sendEmail({ to: adminEmail, subject: `[ADMIN] ${subject}`, html });
        }
      }
    }

    res.json({ success: true, message: `Refund request ${newStatus}` });
  } catch (err) {
    console.error('Error updating refund request:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Refund Routes ---

// Search order for refund
app.get('/api/orders/search', async (req, res) => {
  const { orderId, email } = req.query;
  if (!orderId || !email) {
    return res.status(400).json({ message: 'Order ID and Email are required' });
  }

  try {
    // Strip # prefix if present and handle partial matches
    const cleanOrderId = orderId.startsWith('#') ? orderId.substring(1) : orderId;
    
    const orderRes = await db.query(
      `SELECT o.*, s.store_name, s.contact_info as store_contact
       FROM orders o 
       JOIN sellers s ON o.seller_id = s.id 
       WHERE (o.id::text = $1 OR o.id::text LIKE $2) AND o.customer_email = $3`,
      [cleanOrderId, `${cleanOrderId}%`, email]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(toCamel(orderRes.rows[0]));
  } catch (err) {
    console.error('Order search error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit refund request for order
app.post('/api/orders/:id/refund', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  try {
    // Check IyonicPay activation
    const userRes = await db.query('SELECT iyonicpay_opt_in FROM users WHERE id = $1', [req.user.id]);
    if (!userRes.rows[0]?.iyonicpay_opt_in) {
      return res.status(403).json({ message: 'IyonicPay must be activated before claiming a refund' });
    }

    // Get order
    const orderRes = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const order = orderRes.rows[0];

    // Get user email if not in token
    let userEmail = req.user.email;
    if (!userEmail) {
      const userRes = await db.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
      userEmail = userRes.rows[0]?.email;
    }

    if (!userEmail) {
      return res.status(401).json({ message: 'User email not found' });
    }

    // Verify it belongs to the user (strict email matching for fraud prevention)
    const emailMatches = order.customer_email && userEmail && 
      order.customer_email.toLowerCase() === userEmail.toLowerCase();
    
    if (!emailMatches) {
      return res.status(403).json({ message: 'You are not authorized to request a refund for this order. Emails must match.' });
    }

    // Check if this order is linked to a customer record belonging to the current user
    const customerCheck = await db.query(
      'SELECT id FROM customers WHERE id = $1 AND user_id = $2',
      [order.customer_id, req.user.id]
    );
    const userOwnsOrder = customerCheck.rows.length > 0;

    // Check if already requested
    const existingRefund = await db.query(
      'SELECT id FROM refund_requests WHERE order_id = $1 AND status = $2',
      [id, 'pending']
    );
    if (existingRefund.rows.length > 0) {
      return res.status(400).json({ message: 'A refund request already exists for this order' });
    }

    // Use the customer ID from ownership check if available, or try finding one for this seller
    let customerId = userOwnsOrder ? customerCheck.rows[0].id : null;
    
    if (!customerId) {
      const customerRes = await db.query(
        'SELECT id FROM customers WHERE seller_id = $1 AND user_id = $2',
        [order.seller_id, req.user.id]
      );
      customerId = customerRes.rows[0]?.id;
    }

    // Create refund request
    const refundRes = await db.query(
      `INSERT INTO refund_requests (order_id, customer_id, seller_id, amount, currency, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [id, customerId, order.seller_id, order.total, order.currency, reason]
    );

    // Update order status
    await db.query(
      "UPDATE orders SET status = 'refund_requested', refund_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [reason, id]
    );

    // Notify seller
    const sellerRes = await db.query(
        'SELECT u.email, u.name, s.store_name FROM sellers s JOIN users u ON s.user_id = u.id WHERE s.id = $1',
        [order.seller_id]
    );
    const seller = sellerRes.rows[0];

    const storeName = seller?.store_name || 'Our Store';
    const hasSellerEmail = await hasSellerEmailConfig(order.seller_id);

    if (hasSellerEmail) {
      triggerAutomation('refund_requested', {
        sellerId: order.seller_id,
        customerEmail: req.user.email,
        customerName: req.user.name || 'Customer',
        orderId: id,
        orderTotal: order.total,
        storeName,
        reason: reason || 'Not provided'
      });
    } else {
      // Admin email fallback
      const adminRes = await db.query("SELECT email FROM users WHERE role = 'manager_admin' LIMIT 1");
      const adminEmail = adminRes.rows[0]?.email || process.env.VITE_ADMIN_EMAIL;

      const orderItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

      mailer.sendRefundRequestEmail(
        { email: req.user.email, name: req.user.name || 'Customer' },
        { email: seller?.email, name: seller?.name, storeName },
        { id: id, total: order.total, currency: order.currency, items: orderItems || [], reason },
        adminEmail
      );
    }
    
    res.json({ success: true, message: 'Refund request submitted' });
  } catch (err) {
    console.error('Refund submission error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Review Routes ---

app.get('/api/products/:productId/reviews', async (req, res) => {
  try {
    const reviewsRes = await db.query(
      'SELECT * FROM reviews WHERE product_id = $1 AND is_verified = TRUE ORDER BY created_at DESC',
      [req.params.productId]
    );
    res.json(toCamel(reviewsRes.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/reviews/verify-purchase', async (req, res) => {
  const { productId, customerEmail } = req.body;
  try {
    // Get the seller_id for the product
    const productRes = await db.query('SELECT seller_id FROM products WHERE id = $1', [productId]);
    if (productRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const sellerId = productRes.rows[0].seller_id;

    // Check if the user is a customer of this store
    const customerRes = await db.query(`
      SELECT id FROM customers 
      WHERE seller_id = $1 AND email = $2
    `, [sellerId, customerEmail]);

    if (customerRes.rows.length > 0) {
      res.json({ success: true, message: 'Customer found, please review' });
    } else {
      res.status(404).json({ success: false, message: 'No customer record found for this store. You must be a customer of this store to submit a review.' });
    }
  } catch (err) {
    console.error('Verify Purchase Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/reviews', async (req, res) => {
  const { productId, customerName, customerEmail, rating, comment } = req.body;
  try {
    // Get the seller_id for the product
    const productRes = await db.query('SELECT seller_id FROM products WHERE id = $1', [productId]);
    if (productRes.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const sellerId = productRes.rows[0].seller_id;

    // Check if the user is a customer of this store (has placed any order or is in customers table)
    const customerRes = await db.query(`
      SELECT id FROM customers 
      WHERE seller_id = $1 AND email = $2
    `, [sellerId, customerEmail]);

    if (customerRes.rows.length === 0) {
      return res.status(403).json({ message: 'Review denied. You must be a customer of this store to submit a review.' });
    }

    const reviewRes = await db.query(
      `INSERT INTO reviews (product_id, customer_name, customer_email, rating, comment, is_verified) 
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
      [productId, customerName, customerEmail, rating, comment]
    );
    res.status(201).json(toCamel(reviewRes.rows[0]));
  } catch (err) {
    console.error('Review Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Reviews for Seller's Products (Authenticated)
app.get('/api/reviews/seller', authenticateToken, async (req, res) => {
  try {
    const sellerRes = await db.query('SELECT id FROM sellers WHERE user_id = $1', [req.user.id]);
    if (sellerRes.rows.length === 0) return res.status(404).json({ message: 'Seller not found' });
    
    const sellerId = sellerRes.rows[0].id;
    const reviewsRes = await db.query(`
      SELECT r.*, p.name as product_name 
      FROM reviews r
      JOIN products p ON r.product_id = p.id
      WHERE p.seller_id = $1
      ORDER BY r.created_at DESC
    `, [sellerId]);
    
    res.json(toCamel(reviewsRes.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Customer Routes ---

app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const { seller_id } = req.query;
    let query = 'SELECT * FROM customers';
    let params = [];
    if (seller_id) {
      query += ' WHERE seller_id = $1';
      params.push(seller_id);
    }
    const customersRes = await db.query(query, params);
    res.json(toCamel(customersRes.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Analytics Routes ---

app.get('/api/analytics/seller/:id', authenticateToken, async (req, res) => {
  try {
    const sellerId = req.params.id;
    
    // Total Revenue, Orders, Products, Customers
    const statsRes = await db.query(`
      SELECT 
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE seller_id = $1 AND status != 'pending') as total_revenue,
        (SELECT COUNT(*) FROM orders WHERE seller_id = $1 AND status != 'pending') as total_orders,
        (SELECT COUNT(*) FROM products WHERE seller_id = $1) as total_products,
        (SELECT COUNT(*) FROM customers WHERE seller_id = $1) as total_customers
    `, [sellerId]);

    const stats = statsRes.rows[0];

    // Recent Orders
    const recentOrdersRes = await db.query(
      "SELECT * FROM orders WHERE seller_id = $1 AND status != 'pending' ORDER BY created_at DESC LIMIT 5",
      [sellerId]
    );

    // Sales by month (last 6 months)
    const salesByMonthRes = await db.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
        SUM(total) as revenue,
        DATE_TRUNC('month', created_at) as month_date
      FROM orders 
      WHERE seller_id = $1 AND status != 'pending' AND created_at > CURRENT_DATE - INTERVAL '6 months'
      GROUP BY month, month_date
      ORDER BY month_date
    `, [sellerId]);

    // Calculate Growth (compare this month to last month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthRevenue = salesByMonthRes.rows.find(r => {
      const d = new Date(r.month_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })?.revenue || 0;

    const lastMonthRevenue = salesByMonthRes.rows.find(r => {
      const d = new Date(r.month_date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    })?.revenue || 0;

    const revenueGrowth = lastMonthRevenue === 0 ? (currentMonthRevenue > 0 ? 100 : 0) : ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

    // Top Products
    const topProductsRes = await db.query(`
      SELECT 
        item->>'productName' as name,
        SUM((item->>'quantity')::int) as sales
      FROM orders,
      jsonb_array_elements(items) as item
      WHERE seller_id = $1 AND status != 'pending'
      GROUP BY name
      ORDER BY sales DESC
      LIMIT 5
    `, [sellerId]);

    res.json({
      totalRevenue: parseFloat(stats.total_revenue),
      totalOrders: parseInt(stats.total_orders),
      totalProducts: parseInt(stats.total_products),
      totalCustomers: parseInt(stats.total_customers),
      revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
      ordersGrowth: 0, // Simplified for now
      recentOrders: toCamel(recentOrdersRes.rows),
      salesByMonth: salesByMonthRes.rows.map(r => ({ month: r.month, revenue: parseFloat(r.revenue) })),
      topProducts: topProductsRes.rows.map(r => ({ name: r.name, sales: parseInt(r.sales) }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Seller Manager Routes ---

// Get my manager profile
app.get('/api/seller-managers/me', authenticateToken, async (req, res) => {
  try {
    const managerRes = await db.query('SELECT * FROM seller_managers WHERE user_id = $1', [req.user.id]);
    if (managerRes.rows.length === 0) return res.status(404).json({ message: 'Manager profile not found' });
    
    const manager = managerRes.rows[0];

    // Calculate real-time stats for THIS manager's sellers only
    const statsRes = await db.query(`
      SELECT 
        COUNT(*) as total_sellers,
        COUNT(*) FILTER (WHERE (subscription->>'status') = 'active') as active_sellers,
        COALESCE((SELECT SUM(o.total) FROM orders o JOIN sellers s ON o.seller_id = s.id WHERE s.manager_id = $1), 0) as total_revenue
      FROM sellers
      WHERE manager_id = $1
    `, [manager.id]);

    const stats = statsRes.rows[0];
    const totalRevenue = parseFloat(stats.total_revenue);
    const totalCommission = totalRevenue * parseFloat(manager.commission_rate);

    res.json(toCamel({
      ...manager,
      stats: {
        totalSellers: parseInt(stats.total_sellers),
        activeSellers: parseInt(stats.active_sellers),
        totalRevenue: totalRevenue,
        totalCommission: totalCommission
      },
      commission: parseFloat(manager.commission_rate)
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get manager by ID
app.get('/api/seller-managers/:id', async (req, res) => {
  try {
    const managerRes = await db.query('SELECT * FROM seller_managers WHERE id = $1', [req.params.id]);
    if (managerRes.rows.length === 0) return res.status(404).json({ message: 'Manager not found' });
    res.json(toCamel(managerRes.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get All Seller Managers (Admin only)
app.get('/api/seller-managers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manager_admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    const managersRes = await db.query(`
      SELECT sm.*, u.name, u.email 
      FROM seller_managers sm
      JOIN users u ON sm.user_id = u.id
    `);

    const statsRes = await db.query(`
      SELECT 
        COUNT(*) as total_sellers,
        COUNT(*) FILTER (WHERE (subscription->>'status') = 'active') as active_sellers,
        (SELECT COALESCE(SUM(total), 0) FROM orders) as total_revenue
      FROM sellers
    `);

    const globalStats = statsRes.rows[0] || { total_sellers: 0, active_sellers: 0, total_revenue: 0 };
    const totalRevenue = parseFloat(globalStats.total_revenue || 0);

    const managersWithStats = managersRes.rows.map(manager => {
      const commissionRate = parseFloat(manager.commission_rate || 0.05);
      return {
        ...manager,
        stats: {
          totalSellers: parseInt(globalStats.total_sellers || 0),
          activeSellers: parseInt(globalStats.active_sellers || 0),
          totalRevenue: totalRevenue,
          totalCommission: totalRevenue * commissionRate
        },
        commission: commissionRate
      };
    });

    res.json(toCamel(managersWithStats));
  } catch (err) {
    console.error('Get Seller Managers Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get Manager by Slug (Public - for seller registration)
app.get('/api/seller-managers/slug/:slug', async (req, res) => {
  try {
    const managerRes = await db.query(`
      SELECT sm.*, u.name, u.email 
      FROM seller_managers sm
      JOIN users u ON sm.user_id = u.id
      WHERE sm.slug = $1 AND sm.is_active = true
    `, [req.params.slug]);
    
    if (managerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Manager not found' });
    }
    
    const manager = managerRes.rows[0];
    
    // Get seller count
    const sellersRes = await db.query(
      'SELECT COUNT(*) as count FROM sellers WHERE manager_id = $1',
      [manager.id]
    );
    
    res.json(toCamel({
      ...manager,
      sellerCount: parseInt(sellersRes.rows[0].count)
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Manager Profile
app.patch('/api/seller-managers/me', authenticateToken, async (req, res) => {
  try {
    const { displayName, description, logo, commissionRate } = req.body;
    
    const managerRes = await db.query(
      `UPDATE seller_managers SET 
        display_name = COALESCE($1, display_name),
        description = COALESCE($2, description),
        logo = COALESCE($3, logo),
        commission_rate = COALESCE($4, commission_rate),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $5 RETURNING *`,
      [displayName, description, logo, commissionRate, req.user.id]
    );
    
    if (managerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Manager profile not found' });
    }
    
    res.json(toCamel(managerRes.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Manager by ID (generic update)
app.patch('/api/seller-managers/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, subscription, pricingConfig, displayName, description, logo, commissionRate } = req.body;
    
    const managerRes = await db.query(
      `UPDATE seller_managers SET 
        is_active = COALESCE($1, is_active),
        subscription = COALESCE($2, subscription),
        pricing_config = COALESCE($3, pricing_config),
        display_name = COALESCE($4, display_name),
        description = COALESCE($5, description),
        logo = COALESCE($6, logo),
        commission_rate = COALESCE($7, commission_rate),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 RETURNING *`,
      [
        isActive !== undefined ? isActive : null,
        subscription ? JSON.stringify(subscription) : null,
        pricingConfig ? JSON.stringify(pricingConfig) : null,
        displayName || null,
        description || null,
        logo || null,
        commissionRate || null,
        id
      ]
    );
    
    if (managerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Manager profile not found' });
    }
    
    res.json(toCamel(managerRes.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Manager Slug
app.patch('/api/seller-managers/me/slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.body;
    
    if (!slug || slug.length < 3) {
      return res.status(400).json({ message: 'Slug must be at least 3 characters' });
    }
    
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    const managerRes = await db.query(
      'UPDATE seller_managers SET slug = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING *',
      [cleanSlug, req.user.id]
    );
    
    if (managerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Manager profile not found' });
    }
    
    res.json(toCamel(managerRes.rows[0]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Slug already taken' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Manager Pricing Config
app.patch('/api/seller-managers/me/pricing', authenticateToken, async (req, res) => {
  try {
    const { pricingConfig } = req.body;
    
    const managerRes = await db.query(
      'UPDATE seller_managers SET pricing_config = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 RETURNING *',
      [JSON.stringify(pricingConfig), req.user.id]
    );
    
    if (managerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Manager profile not found' });
    }
    
    res.json(toCamel(managerRes.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign Seller to Manager
app.post('/api/seller-managers/me/assign-seller', authenticateToken, async (req, res) => {
  try {
    const { sellerId } = req.body;
    
    const managerRes = await db.query('SELECT id FROM seller_managers WHERE user_id = $1', [req.user.id]);
    if (managerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Manager profile not found' });
    }
    
    const managerId = managerRes.rows[0].id;
    
    // Check if manager is Enterprise to grant free professional plan to first 6
    let initialPlan = null;
    const managerFullRes = await db.query('SELECT subscription FROM seller_managers WHERE id = $1', [managerId]);
    if (managerFullRes.rows.length > 0) {
      const manager = managerFullRes.rows[0];
      const managerPlan = manager.subscription?.plan || 'starter';
      
      if (managerPlan === 'enterprise') {
        const sellerCountRes = await db.query('SELECT COUNT(*) FROM sellers WHERE manager_id = $1', [managerId]);
        const sellerCount = parseInt(sellerCountRes.rows[0].count);
        if (sellerCount < 6) {
          initialPlan = 'professional';
        }
      }
    }

    const sellerRes = await db.query(
      `UPDATE sellers SET 
        manager_id = $1, 
        subscription = CASE WHEN $3::text IS NOT NULL THEN jsonb_set(subscription, '{plan}', to_jsonb($3::text)) ELSE subscription END,
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 RETURNING *`,
      [managerId, sellerId, initialPlan]
    );
    
    if (sellerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    
    res.json(toCamel(sellerRes.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unassign Seller from Manager
app.post('/api/seller-managers/me/unassign-seller', authenticateToken, async (req, res) => {
  try {
    const { sellerId } = req.body;
    
    const sellerRes = await db.query(
      'UPDATE sellers SET manager_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND manager_id = (SELECT id FROM seller_managers WHERE user_id = $2) RETURNING *',
      [sellerId, req.user.id]
    );
    
    if (sellerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Seller not found or not assigned to you' });
    }
    
    res.json(toCamel(sellerRes.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Available Sellers (not assigned to any manager)
app.get('/api/seller-managers/me/available-sellers', authenticateToken, async (req, res) => {
  try {
    const sellersRes = await db.query(`
      SELECT s.*, u.name as owner_name, u.email as owner_email 
      FROM sellers s
      JOIN users u ON s.user_id = u.id
      WHERE s.manager_id IS NULL
      ORDER BY s.created_at DESC
    `);
    
    res.json(toCamel(sellersRes.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Manager's Customers (aggregated from all assigned sellers)
app.get('/api/seller-managers/me/customers', authenticateToken, async (req, res) => {
  try {
    const managerRes = await db.query('SELECT id FROM seller_managers WHERE user_id = $1', [req.user.id]);
    if (managerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Manager profile not found' });
    }
    
    const managerId = managerRes.rows[0].id;
    
    const customersRes = await db.query(`
      SELECT DISTINCT ON (c.email) 
        c.id, c.name, c.email, c.phone, 
        COUNT(DISTINCT c.id) FILTER (WHERE c.seller_id = s.id) as orders_per_seller,
        SUM(c.total_orders) as total_orders,
        SUM(c.total_spent) as total_spent,
        c.created_at,
        ARRAY_AGG(DISTINCT s.store_name) as stores,
        COUNT(DISTINCT c.seller_id) as seller_count
      FROM customers c
      JOIN sellers s ON c.seller_id = s.id
      WHERE s.manager_id = $1
      GROUP BY c.id, c.email, c.name, c.phone, c.created_at, s.id
      ORDER BY c.email, c.created_at DESC
    `, [managerId]);
    
    res.json(toCamel(customersRes.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Manager's Orders (from all assigned sellers)
app.get('/api/seller-managers/me/orders', authenticateToken, async (req, res) => {
  try {
    const managerRes = await db.query('SELECT id FROM seller_managers WHERE user_id = $1', [req.user.id]);
    if (managerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Manager profile not found' });
    }
    
    const managerId = managerRes.rows[0].id;
    
    const ordersRes = await db.query(`
      SELECT o.*, s.store_name as seller_store_name
      FROM orders o
      JOIN sellers s ON o.seller_id = s.id
      WHERE s.manager_id = $1
      ORDER BY o.created_at DESC
    `, [managerId]);
    
    res.json(toCamel(ordersRes.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Manager's Analytics
app.get('/api/seller-managers/me/analytics', authenticateToken, async (req, res) => {
  try {
    const managerRes = await db.query('SELECT id, commission_rate FROM seller_managers WHERE user_id = $1', [req.user.id]);
    if (managerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Manager profile not found' });
    }
    
    const manager = managerRes.rows[0];
    
    const statsRes = await db.query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_sellers,
        COUNT(DISTINCT s.id) FILTER (WHERE (s.subscription->>'status') = 'active') as active_sellers,
        COALESCE(SUM(o.total) FILTER (WHERE o.status != 'pending'), 0) as total_revenue,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status != 'pending') as total_orders,
        COUNT(DISTINCT c.id) as total_customers,
        COUNT(DISTINCT p.id) as total_products
      FROM sellers s
      LEFT JOIN orders o ON s.id = o.seller_id
      LEFT JOIN customers c ON s.id = c.seller_id
      LEFT JOIN products p ON s.id = p.seller_id
      WHERE s.manager_id = $1
    `, [manager.id]);
    
    const stats = statsRes.rows[0];
    const totalRevenue = parseFloat(stats.total_revenue);
    
    res.json({
      totalSellers: parseInt(stats.total_sellers),
      activeSellers: parseInt(stats.active_sellers),
      totalRevenue: totalRevenue,
      totalOrders: parseInt(stats.total_orders),
      totalCustomers: parseInt(stats.total_customers),
      totalProducts: parseInt(stats.total_products),
      totalCommission: totalRevenue * parseFloat(manager.commission_rate),
      commissionRate: parseFloat(manager.commission_rate)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- IyonicBots Routes ---

// Get all bots for the current seller
app.get('/api/bots', authenticateToken, async (req, res) => {
  console.log('GET /api/bots hit', { sellerId: req.user.sellerId });
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Only sellers can manage bots' });
    
    const botsRes = await db.query(
      'SELECT * FROM bots WHERE seller_id = $1 ORDER BY created_at DESC',
      [req.user.sellerId]
    );
    res.json(toCamel(botsRes.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new bot
app.post('/api/bots', authenticateToken, async (req, res) => {
  const { name, type } = req.body;
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Only sellers can create bots' });
    
    const botRes = await db.query(
      'INSERT INTO bots (seller_id, name, type) VALUES ($1, $2, $3) RETURNING *',
      [req.user.sellerId, name, type]
    );
    res.status(201).json(toCamel(botRes.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Train a bot
app.post('/api/bots/:id/train', authenticateToken, async (req, res) => {
  const { trainingData } = req.body;
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Unauthorized' });
    
    const botRes = await db.query(
      'UPDATE bots SET training_data = $1, last_trained = CURRENT_TIMESTAMP WHERE id = $2 AND seller_id = $3 RETURNING *',
      [trainingData, req.params.id, req.user.sellerId]
    );
    
    if (botRes.rows.length === 0) return res.status(404).json({ message: 'Bot not found' });
    res.json(toCamel(botRes.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Auto-train from store data
app.post('/api/bots/:id/auto-train', authenticateToken, async (req, res) => {
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Unauthorized' });
    
    // Fetch products and store info
    const sellerRes = await db.query(`
      SELECT s.store_name, s.description, s.shop_type, s.shipping_policy, s.return_policy, u.name as owner_name 
      FROM sellers s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `, [req.user.sellerId]);
    const productsRes = await db.query('SELECT name, description, category, price, stock, status, images FROM products WHERE seller_id = $1 AND status = \'active\'', [req.user.sellerId]);
    
    const seller = sellerRes.rows[0];
    const products = productsRes.rows;
    
    let autoData = `Store Name: ${seller.store_name}\n`;
    autoData += `Store Owner: ${seller.owner_name}\n`;
    autoData += `Business Type: ${seller.shop_type}\n`;
    autoData += `Description: ${seller.description}\n`;
    autoData += `Shipping Policy: ${seller.shipping_policy || 'Standard shipping applies.'}\n`;
    autoData += `Return Policy: ${seller.return_policy || 'Contact support for returns.'}\n\n`;
    autoData += `Products & Services:\n`;
    
    products.forEach(p => {
      autoData += `• Product: ${p.name}\n`;
      autoData += `  Category: ${p.category}\n`;
      autoData += `  Description: ${p.description}\n`;
      autoData += `  Price: $${p.price}\n`;
      autoData += `  Availability: ${p.stock > 0 ? 'In Stock' : 'Out of Stock'}\n`;
      if (p.images && p.images.length > 0) {
        autoData += `  Image: ${p.images[0]}\n`;
      }
      autoData += `\n`;
    });
    
    const botRes = await db.query(
      'UPDATE bots SET training_data = $1, last_trained = CURRENT_TIMESTAMP WHERE id = $2 AND seller_id = $3 RETURNING *',
      [autoData, req.params.id, req.user.sellerId]
    );
    
    if (botRes.rows.length === 0) return res.status(404).json({ message: 'Bot not found' });
    res.json(toCamel(botRes.rows[0]));
  } catch (err) {
    console.error('Bot Auto-train Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update bot widget config
app.patch('/api/bots/:id/widget-config', authenticateToken, async (req, res) => {
  const { widgetConfig } = req.body;
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Unauthorized' });
    
    const botRes = await db.query(
      'UPDATE bots SET widget_config = $1 WHERE id = $2 AND seller_id = $3 RETURNING *',
      [JSON.stringify(widgetConfig), req.params.id, req.user.sellerId]
    );
    
    if (botRes.rows.length === 0) return res.status(404).json({ message: 'Bot not found' });
    res.json(toCamel(botRes.rows[0]));
  } catch (err) {
    console.error('Bot Widget Config Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a bot
app.delete('/api/bots/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Unauthorized' });
    
    const botRes = await db.query(
      'DELETE FROM bots WHERE id = $1 AND seller_id = $2 RETURNING *',
      [req.params.id, req.user.sellerId]
    );
    
    if (botRes.rows.length === 0) return res.status(404).json({ message: 'Bot not found' });
    res.json({ message: 'Bot deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Public IyonicBots Routes ---

// Public endpoint for storefronts to fetch active bots
app.get('/api/public/bots/:tenantId', async (req, res) => {
  console.log('GET /api/public/bots/:tenantId hit', { tenantId: req.params.tenantId });
  try {
    const sellerRes = await db.query(
      'SELECT id FROM sellers WHERE store_name = $1 OR subdomain = $1', 
      [req.params.tenantId]
    );
    console.log('Seller query result length:', sellerRes.rows.length);
    if (sellerRes.rows.length === 0) return res.status(404).json({ message: 'Seller not found' });
    
    const sellerId = sellerRes.rows[0].id;
    console.log('Fetching bots for sellerId:', sellerId);
    
    const botsRes = await db.query(
      'SELECT id, name, type, widget_config FROM bots WHERE seller_id = $1 ORDER BY last_trained DESC LIMIT 1',
      [sellerId]
    );
    console.log('Bots query result length:', botsRes.rows.length);
    
    if (botsRes.rows.length === 0) return res.status(404).json({ message: 'No active bots' });
    
    console.log('Converting to camelCase...');
    const result = toCamel(botsRes.rows[0]);
    console.log('Conversion successful, sending response');
    res.json(result);
  } catch (err) {
    console.error('Error fetching public bots:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Bot Chat API
app.post('/api/public/bots/:id/chat', async (req, res) => {
  const { message } = req.body;
  try {
    const botRes = await db.query('SELECT seller_id, name, type, training_data FROM bots WHERE id = $1', [req.params.id]);
    if (botRes.rows.length === 0) return res.status(404).json({ message: 'Bot not found' });
    
    const bot = botRes.rows[0];
    const sellerId = bot.seller_id;
    const trainingData = bot.training_data || '';
    
    let response = "";
    const lowerMessage = message.toLowerCase().trim();
    
    // Advanced Detection Patterns
    const patterns = {
      greeting: /\b(hello|hi|hey|greetings|good (morning|afternoon|evening))\b/i,
      cheapest: /\b(cheapest|lowest price|best deal|affordable|price low to high|budget)\b/i,
      recommendation: /\b(recommend|suggest|best for|good for|top rated|popular|looking for)\b/i,
      catalog: /\b(sell|catalog|products|items|inventory|available|stock|options)\b/i,
      identity: /\b(who are you|your name|what do you do|help me with)\b/i,
      priceQuery: /\b(how much|price of|cost of)\b/i,
      shipping: /\b(shipping|delivery|deliver|ship to|how long to ship)\b/i,
      returns: /\b(return|refund|exchange|back my money)\b/i
    };

    // 1. Identity / Who are you
    if (patterns.identity.test(lowerMessage)) {
      response = `I am ${bot.name}, your intelligent AI shopping assistant. I can help you find products, check prices, and recommend the best items for your needs. What can I help you with today?`;
    }
    // 2. Greeting
    else if (patterns.greeting.test(lowerMessage)) {
      response = `Hello! I am ${bot.name}, your AI assistant. How can I help you find what you're looking for today?`;
    } 
    // 3. Shipping Info
    else if (patterns.shipping.test(lowerMessage)) {
      const sellerRes = await db.query('SELECT shipping_policy FROM sellers WHERE id = $1', [sellerId]);
      response = sellerRes.rows[0]?.shipping_policy || "We offer standard shipping on all orders. Please proceed to checkout for specific rates and timelines.";
    }
    // 4. Return Info
    else if (patterns.returns.test(lowerMessage)) {
      const sellerRes = await db.query('SELECT return_policy FROM sellers WHERE id = $1', [sellerId]);
      response = sellerRes.rows[0]?.return_policy || "Our return policy varies by product. Please contact our support team for any refund or exchange requests.";
    }
    // 5. Price Query for specific product
    else if (patterns.priceQuery.test(lowerMessage)) {
      const productName = lowerMessage.replace(patterns.priceQuery, '').replace(/\?|\.|!/g, '').trim();
      if (productName.length > 2) {
        const productRes = await db.query(
          "SELECT name, price, stock, images FROM products WHERE seller_id = $1 AND name ILIKE $2 AND status = 'active' LIMIT 1",
          [sellerId, `%${productName}%`]
        );
        if (productRes.rows.length > 0) {
          const p = productRes.rows[0];
          response = `The ${p.name} costs $${p.price}. ${p.stock > 0 ? 'It is currently in stock!' : 'It is currently out of stock.'}`;
          if (p.images && p.images.length > 0) {
            response += `\nIMAGE: ${p.images[0]}`;
          }
        } else {
          response = `I couldn't find the price for "${productName}". Let me show you our cheapest items instead?`;
        }
      } else {
        response = "Which product's price would you like to know?";
      }
    }
    // 6. Intent: Cheapest Product
    else if (patterns.cheapest.test(lowerMessage)) {
      const cheapestRes = await db.query(
        'SELECT name, price, images FROM products WHERE seller_id = $1 AND status = \'active\' AND stock > 0 ORDER BY price ASC LIMIT 3',
        [sellerId]
      );
      if (cheapestRes.rows.length > 0) {
        response = "I found these budget-friendly options for you:\n" + 
          cheapestRes.rows.map(p => {
            let line = `• ${p.name}: $${p.price}`;
            if (p.images && p.images.length > 0) line += ` (IMAGE: ${p.images[0]})`;
            return line;
          }).join('\n');
      } else {
        response = "I'm sorry, I couldn't find any items in stock right now.";
      }
    }
    // 7. Intent: Recommendations / "Best for"
    else if (patterns.recommendation.test(lowerMessage)) {
      let searchTerms = lowerMessage.replace(patterns.recommendation, '').replace(/\?|\.|!/g, '').trim();
      if (searchTerms.startsWith('for ')) searchTerms = searchTerms.substring(4);
      
      const recommendRes = await db.query(
        "SELECT name, description, price, category, images FROM products WHERE seller_id = $1 AND status = 'active' AND stock > 0 AND (category ILIKE $2 OR description ILIKE $2 OR name ILIKE $2) ORDER BY price DESC LIMIT 3",
        [sellerId, `%${searchTerms}%`]
      );
      
      if (recommendRes.rows.length > 0) {
        response = `Here are my top recommendations for ${searchTerms || 'you'}:\n` + 
          recommendRes.rows.map(p => {
            let line = `• ${p.name} ($${p.price}) - ${p.description.substring(0, 100)}...`;
            if (p.images && p.images.length > 0) line += `\nIMAGE: ${p.images[0]}`;
            return line;
          }).join('\n');
      } else {
        const popularRes = await db.query('SELECT name, price, images FROM products WHERE seller_id = $1 AND status = \'active\' AND stock > 0 LIMIT 3', [sellerId]);
        response = `I couldn't find something specifically for "${searchTerms}", but check out our most popular items:\n` + 
          popularRes.rows.map(p => {
            let line = `• ${p.name} ($${p.price})`;
            if (p.images && p.images.length > 0) line += ` (IMAGE: ${p.images[0]})`;
            return line;
          }).join('\n');
      }
    }
    // 8. Intent: Catalog / "What do you sell"
    else if (patterns.catalog.test(lowerMessage)) {
      const productsRes = await db.query(
        'SELECT DISTINCT category FROM products WHERE seller_id = $1 AND status = \'active\'',
        [sellerId]
      );
      if (productsRes.rows.length > 0) {
        const categories = productsRes.rows.map(r => r.category).join(', ');
        response = `We have a great selection! We specialize in: ${categories}. Is there a specific category you're interested in?`;
      } else {
        response = "We have many exciting products! What are you looking for today?";
      }
    }
    // 7. Fallback to Training Data Keyword Matching (More granular)
    else if (trainingData) {
      const sentences = trainingData.split(/[.!\n]/).filter(s => s.trim().length > 10);
      const userWords = lowerMessage.split(/\s+/).filter(w => w.length > 3);
      
      // Rank sentences by word matches
      const rankedSentences = sentences.map(s => {
        const score = userWords.reduce((acc, word) => acc + (s.toLowerCase().includes(word) ? 1 : 0), 0);
        return { sentence: s.trim(), score };
      }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
      
      if (rankedSentences.length > 0) {
        response = rankedSentences.slice(0, 2).map(s => s.sentence).join('. ') + '.';
      } else {
        response = `I'm here to help! I can answer questions about our products, prices, and categories. What would you like to know?`;
      }
    } else {
      response = "I'm currently being trained to better assist you. Please ask about our products, categories, or the best deals!";
    }
    
    res.json({ response });
  } catch (err) {
    console.error('Bot Chat Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// --- Admin Routes ---

app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'manager_admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const statsRes = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM sellers) as total_sellers,
        (SELECT COUNT(*) FROM seller_managers) as total_managers,
        (SELECT COALESCE(SUM(total), 0) FROM orders) as total_platform_revenue,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COUNT(*) FROM products) as total_products,
        (SELECT COUNT(*) FROM customers) as total_customers
    `);
    
    const stats = statsRes.rows[0] || {};
    
    const responseData = {
      total_platform_revenue: parseFloat(stats.total_platform_revenue || 0),
      total_users: parseInt(stats.total_users || 0),
      total_sellers: parseInt(stats.total_sellers || 0),
      total_managers: parseInt(stats.total_managers || 0),
      total_orders: parseInt(stats.total_orders || 0),
      total_products: parseInt(stats.total_products || 0),
      total_customers: parseInt(stats.total_customers || 0),
      system_health: 99.9,
      cpu_usage: 45,
      memory_usage: 62,
      active_sessions: 124
    };

    res.json(toCamel(responseData));
  } catch (err) {
    console.error('Admin Stats Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin IyonicPay Routes
app.get('/api/admin/iyonicpay/stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'manager_admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const statsRes = await db.query(`
      SELECT 
        (SELECT COALESCE(SUM(balance), 0) FROM wallets) as total_wallet_balances,
        (SELECT COUNT(*) FROM wallets) as total_wallets,
        (SELECT COUNT(*) FROM transactions) as total_transactions,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'completed') as total_volume,
        (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending') as pending_withdrawals
    `);
    
    res.json(toCamel(statsRes.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/iyonicpay/transactions', authenticateToken, async (req, res) => {
  if (req.user.role !== 'manager_admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const transRes = await db.query(`
      SELECT t.*, 
             su.email as sender_email, 
             ru.email as receiver_email
      FROM transactions t
      LEFT JOIN wallets sw ON t.sender_wallet_id = sw.id
      LEFT JOIN wallets rw ON t.receiver_wallet_id = rw.id
      LEFT JOIN users su ON sw.user_id = su.id
      LEFT JOIN users ru ON rw.user_id = ru.id
      ORDER BY t.created_at DESC
      LIMIT 100
    `);
    res.json(toCamel(transRes.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/iyonicpay/withdrawals', authenticateToken, async (req, res) => {
  if (req.user.role !== 'manager_admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const withRes = await db.query(`
      SELECT w.*, u.email as user_email, u.name as user_name, u.username as user_username
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
      ORDER BY w.created_at DESC
    `);
    res.json(toCamel(withRes.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.patch('/api/admin/iyonicpay/withdrawals/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'manager_admin') return res.status(403).json({ message: 'Unauthorized' });
  const { status } = req.body;
  const { id } = req.params;

  try {
    await db.query('UPDATE withdrawals SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, id]);
    
    // Also update the associated transaction if it exists
    const withRes = await db.query('SELECT user_id, amount FROM withdrawals WHERE id = $1', [id]);
    if (withRes.rows.length > 0) {
      const { user_id, amount } = withRes.rows[0];
      const walletRes = await db.query('SELECT id FROM wallets WHERE user_id = $1', [user_id]);
      if (walletRes.rows.length > 0) {
        const walletId = walletRes.rows[0].id;
        await db.query(
          "UPDATE transactions SET status = $1 WHERE sender_wallet_id = $2 AND amount = $3 AND type = 'withdrawal' AND status = 'pending'",
          [status === 'completed' ? 'completed' : 'failed', walletId, amount]
        );
      }
    }

    res.json({ message: 'Withdrawal status updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ NEW: Test DB route
app.get('/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ========== EMBEDDED CHECKOUT API ==========

// Verify API key
const verifyApiKey = async (apiKey) => {
  if (!apiKey || !apiKey.startsWith('ip_sk_')) {
    return null;
  }
  
  try {
    const keyRes = await db.query(
      'SELECT user_id, api_key FROM api_keys WHERE api_key = $1',
      [apiKey]
    );
    
    if (keyRes.rows.length === 0) {
      return null;
    }
    
    return { userId: keyRes.rows[0].user_id };
  } catch (err) {
    console.error('API Key verify error:', err);
    return null;
  }
};

// Initialize embed checkout
app.post('/api/embed/checkout', async (req, res) => {
  const apiKey = req.header('x-api-key') || req.body.apiKey;
  const { amount, currency, email, metadata } = req.body;

  try {
    const user = await verifyApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ message: 'Invalid API key' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Get user's wallet
    let walletRes = await db.query('SELECT id FROM wallets WHERE user_id = $1', [user.userId]);
    if (walletRes.rows.length === 0) {
      await db.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0)', [user.userId]);
      walletRes = await db.query('SELECT id FROM wallets WHERE user_id = $1', [user.userId]);
    }

    // Get Paystack public key from env
    const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!paystackPublicKey) {
      return res.status(500).json({ message: 'Payment configuration error' });
    }

    // Initialize Paystack transaction
    const Paystack = (await import('paystack')).default || (await import('paystack'));
    const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

    const response = await new Promise((resolve, reject) => {
      paystack.transaction.initialize({
        email,
        amount: Math.round(amount * 100),
        currency: currency || 'USD',
        metadata: {
          user_id: user.userId,
          type: 'embed_checkout',
          ...metadata
        }
      }, (err, body) => {
        if (err) reject(err);
        else resolve(body);
      });
    });

    res.json({
      status: true,
      paystackPublicKey,
      data: response.data
    });
  } catch (err) {
    console.error('Embed checkout error:', err);
    res.status(500).json({ message: err.message || 'Failed to initialize payment' });
  }
});

// Verify embed payment
app.post('/api/embed/verify', async (req, res) => {
  const apiKey = req.header('x-api-key') || req.body.apiKey;
  const { reference } = req.body;

  try {
    const user = await verifyApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ message: 'Invalid API key' });
    }

    if (!reference) {
      return res.status(400).json({ message: 'Reference is required' });
    }

    const Paystack = (await import('paystack')).default || (await import('paystack'));
    const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

    const body = await new Promise((resolve, reject) => {
      paystack.transaction.verify(reference, (err, body) => {
        if (err) reject(err);
        else resolve(body);
      });
    });

    if (body.status && body.data.status === 'success') {
      const amount = body.data.amount / 100;
      const customerEmail = body.data.customer.email;
      
      // Determine whose wallet to credit
      // First check if the customer paying has an account
      let creditUserId = user.userId; // Default to seller
      
      const customerUserRes = await db.query('SELECT id FROM users WHERE email = $1', [customerEmail]);
      if (customerUserRes.rows.length > 0) {
        creditUserId = customerUserRes.rows[0].id;
      }

      // Ensure wallet exists for credit user
      await db.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING', [creditUserId]);

      // Update wallet balance
      await db.query(
        'UPDATE wallets SET balance = balance + $1 WHERE user_id = $2',
        [amount, creditUserId]
      );

      // Get wallet ID
      const walletRes = await db.query('SELECT id FROM wallets WHERE user_id = $1', [creditUserId]);

      // Record transaction
      await db.query(
        'INSERT INTO transactions (sender_wallet_id, receiver_wallet_id, amount, type, status, description) VALUES ($1, $1, $2, $3, $4, $5)',
        [walletRes.rows[0].id, amount, 'deposit', 'completed', `IyonicPay Payment from ${customerEmail}`]
      );

      res.json({ success: true, amount, customerId: creditUserId });
    } else {
      res.status(400).json({ message: 'Payment not successful' });
    }
  } catch (err) {
    console.error('Embed verify error:', err);
    res.status(500).json({ message: err.message || 'Verification failed' });
  }
});

// Serve checkout.js statically
app.get('/checkout.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'checkout.js'));
});

// Serve bot.js statically
app.get('/bot.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bot.js'));
});

// ========== END EMBEDDED CHECKOUT ==========

// ========== MARKETING & SOCIAL MEDIA ROUTES ==========

// --- Social Media Routes ---

// Get social media accounts for a seller
app.get('/api/social-media/seller/:sellerId', authenticateToken, async (req, res) => {
  try {
    const { sellerId } = req.params;
    const result = await db.query(
      'SELECT * FROM social_media_accounts WHERE seller_id = $1',
      [sellerId]
    );
    res.json(toCamel(result.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching social media accounts' });
  }
});

// Connect a social media account
app.post('/api/social-media/connect', authenticateToken, async (req, res) => {
  try {
    const { sellerId, platform, username, profileUrl, accessToken, refreshToken, expiresIn } = req.body;
    
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
    
    const result = await db.query(
      `INSERT INTO social_media_accounts 
       (seller_id, platform, username, profile_url, access_token, refresh_token, expires_at, is_connected, last_synced)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, CURRENT_TIMESTAMP)
       ON CONFLICT (seller_id, platform) 
       DO UPDATE SET 
         username = EXCLUDED.username,
         profile_url = EXCLUDED.profile_url,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         expires_at = EXCLUDED.expires_at,
         is_connected = TRUE,
         last_synced = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [sellerId, platform, username, profileUrl, accessToken, refreshToken, expiresAt]
    );
    
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error connecting social media account' });
  }
});

// Disconnect a social media account
app.delete('/api/social-media/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    await db.query('DELETE FROM social_media_accounts WHERE id = $1', [accountId]);
    res.json({ message: 'Account disconnected successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error disconnecting social media account' });
  }
});

// Refresh social media account stats (Mock)
app.post('/api/social-media/:accountId/refresh', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    
    // Mock follower growth
    const randomFollowers = Math.floor(Math.random() * 100);
    
    const result = await db.query(
      `UPDATE social_media_accounts 
       SET followers = followers + $1, last_synced = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [randomFollowers, accountId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }
    
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error refreshing social media account' });
  }
});

// Share to social media (Mock)
app.post('/api/social-media/:accountId/share', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { content, imageUrl, linkUrl } = req.body;
    
    // In a real app, this would call the platform API
    console.log(`Mock sharing to account ${accountId}:`, { content, imageUrl, linkUrl });
    
    res.json({ 
      success: true, 
      postUrl: `https://social-platform.com/post/${nanoid(10)}`,
      message: 'Posted successfully' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error sharing to social media' });
  }
});

// Get scheduled posts for a seller
app.get('/api/social-media/posts/seller/:sellerId', authenticateToken, async (req, res) => {
  try {
    const { sellerId } = req.params;
    const result = await db.query(
      'SELECT * FROM social_media_posts WHERE seller_id = $1 ORDER BY scheduled_at DESC',
      [sellerId]
    );
    res.json(toCamel(result.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching social media posts' });
  }
});

// Create/Schedule a social media post
app.post('/api/social-media/posts', authenticateToken, async (req, res) => {
  try {
    const { sellerId, accountId, content, imageUrl, linkUrl, scheduledAt } = req.body;
    
    const result = await db.query(
      `INSERT INTO social_media_posts 
       (seller_id, account_id, content, image_url, link_url, scheduled_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [sellerId, accountId, content, imageUrl, linkUrl, scheduledAt || null, scheduledAt ? 'scheduled' : 'posted']
    );

    const post = result.rows[0];

    // If it's not scheduled, "post" it immediately (Mock)
    if (!scheduledAt) {
      await db.query(
        "UPDATE social_media_posts SET posted_at = CURRENT_TIMESTAMP, post_url = $1 WHERE id = $2",
        [`https://social-platform.com/post/${nanoid(10)}`, post.id]
      );
      // Re-fetch updated post
      const updated = await db.query("SELECT * FROM social_media_posts WHERE id = $1", [post.id]);
      return res.status(201).json(toCamel(updated.rows[0]));
    }
    
    res.status(201).json(toCamel(post));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating social media post' });
  }
});

// Update a social media post
app.patch('/api/social-media/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const setClause = [];
    const values = [];
    let i = 1;
    
    const allowedFields = ['content', 'image_url', 'link_url', 'scheduled_at', 'status'];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(dbKey)) {
        setClause.push(`${dbKey} = $${i}`);
        values.push(value);
        i++;
      }
    }
    
    if (setClause.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }
    
    values.push(id);
    const result = await db.query(
      `UPDATE social_media_posts SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating social media post' });
  }
});

// Delete a social media post
app.delete('/api/social-media/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM social_media_posts WHERE id = $1', [id]);
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting social media post' });
  }
});

// --- Email Marketing Routes ---

// Get email marketing settings
app.get('/api/email-marketing/settings/seller/:sellerId', authenticateToken, async (req, res) => {
  try {
    const { sellerId } = req.params;
    const result = await db.query(
      'SELECT * FROM email_marketing_settings WHERE seller_id = $1',
      [sellerId]
    );
    
    if (result.rows.length === 0) {
      return res.json(null);
    }
    
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching email settings' });
  }
});

// Save email marketing settings
app.post('/api/email-marketing/settings', authenticateToken, async (req, res) => {
  try {
    const { 
      sellerId, provider, fromEmail, fromName, replyTo, 
      smtpHost, smtpPort, smtpUser, smtpPassword, apiKey 
    } = req.body;
    
    const result = await db.query(
      `INSERT INTO email_marketing_settings 
       (seller_id, provider, from_email, from_name, reply_to, smtp_host, smtp_port, smtp_user, smtp_password, api_key, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
       ON CONFLICT (seller_id) 
       DO UPDATE SET 
         provider = EXCLUDED.provider,
         from_email = EXCLUDED.from_email,
         from_name = EXCLUDED.from_name,
         reply_to = EXCLUDED.reply_to,
         smtp_host = EXCLUDED.smtp_host,
         smtp_port = EXCLUDED.smtp_port,
         smtp_user = EXCLUDED.smtp_user,
         smtp_password = EXCLUDED.smtp_password,
         api_key = EXCLUDED.api_key,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [sellerId, provider, fromEmail, fromName, replyTo, smtpHost, smtpPort, smtpUser, smtpPassword, apiKey]
    );
    
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error saving email settings' });
  }
});

// Update email marketing settings
app.patch('/api/email-marketing/settings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const setClause = [];
    const values = [];
    let i = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      // Map camelCase to snake_case if necessary
      const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (['provider', 'from_email', 'from_name', 'reply_to', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'api_key', 'is_active', 'is_verified'].includes(dbKey)) {
        setClause.push(`${dbKey} = $${i}`);
        values.push(value);
        i++;
      }
    }
    
    if (setClause.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }
    
    values.push(id);
    const result = await db.query(
      `UPDATE email_marketing_settings SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Settings not found' });
    }
    
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating email settings' });
  }
});

// Send test email (Mock)
app.post('/api/email-marketing/test', authenticateToken, async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    console.log(`Mock sending test email to ${to}:`, { subject });
    res.json({ success: true, message: 'Test email sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error sending test email' });
  }
});

// Verify email settings (Mock)
app.post('/api/email-marketing/settings/:id/verify', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE email_marketing_settings SET is_verified = TRUE WHERE id = $1', [id]);
    res.json({ verified: true, message: 'Settings verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error verifying settings' });
  }
});

// Get campaigns
app.get('/api/email-marketing/campaigns/seller/:sellerId', authenticateToken, async (req, res) => {
  try {
    const { sellerId } = req.params;
    const result = await db.query(
      `SELECT c.*, t.name as template_name 
       FROM email_campaigns c 
       LEFT JOIN email_templates t ON c.template_id = t.id 
       WHERE c.seller_id = $1 
       ORDER BY c.created_at DESC`,
      [sellerId]
    );
    res.json(toCamel(result.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching campaigns' });
  }
});

// Create campaign
app.post('/api/email-marketing/campaigns', authenticateToken, async (req, res) => {
  try {
    const { 
      sellerId, name, subject, htmlContent, plainTextContent, 
      templateId, recipientType, segmentFilter, customRecipients, scheduledAt 
    } = req.body;
    
    const result = await db.query(
      `INSERT INTO email_campaigns 
       (seller_id, name, subject, html_content, plain_text_content, template_id, recipient_type, segment_filter, custom_recipients, scheduled_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        sellerId, name, subject, htmlContent, plainTextContent, 
        templateId || null, recipientType, 
        segmentFilter ? JSON.stringify(segmentFilter) : null, 
        customRecipients ? JSON.stringify(customRecipients) : null, 
        scheduledAt || null,
        scheduledAt ? 'scheduled' : 'draft'
      ]
    );
    
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating campaign' });
  }
});

// Update campaign
app.patch('/api/email-marketing/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const setClause = [];
    const values = [];
    let i = 1;
    
    const allowedFields = [
      'name', 'subject', 'html_content', 'plain_text_content', 'template_id', 
      'recipient_type', 'segment_filter', 'custom_recipients', 'scheduled_at', 'status'
    ];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(dbKey)) {
        setClause.push(`${dbKey} = $${i}`);
        values.push(dbKey === 'segment_filter' || dbKey === 'custom_recipients' ? JSON.stringify(value) : value);
        i++;
      }
    }
    
    if (setClause.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }
    
    values.push(id);
    const result = await db.query(
      `UPDATE email_campaigns SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating campaign' });
  }
});

// Delete campaign
app.delete('/api/email-marketing/campaigns/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM email_campaigns WHERE id = $1', [id]);
    res.json({ message: 'Campaign deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting campaign' });
  }
});

// Send campaign to customers
app.post('/api/email-marketing/campaigns/:id/send', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Process campaign immediately and wait for it
    const result = await processCampaignEmails(id);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: `Campaign sent to ${result.deliveredCount} customers` 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: result.message || 'Failed to send campaign' 
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error sending campaign' });
  }
});

// Schedule campaign
app.post('/api/email-marketing/campaigns/:id/schedule', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledAt } = req.body;
    
    const result = await db.query(
      `UPDATE email_campaigns 
       SET status = 'scheduled', scheduled_at = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [scheduledAt, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    res.json({ scheduled: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error scheduling campaign' });
  }
});

// Get campaign stats (Mock)
app.get('/api/email-marketing/campaigns/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM email_campaigns WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    const campaign = result.rows[0];
    res.json({
      delivered: campaign.delivered_count || 0,
      opened: campaign.opened_count || 0,
      clicked: campaign.clicked_count || 0,
      bounced: campaign.bounced_count || 0,
      unsubscribe: campaign.unsubscribe_count || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching campaign stats' });
  }
});

// Get templates
app.get('/api/email-marketing/templates/seller/:sellerId', authenticateToken, async (req, res) => {
  try {
    const { sellerId } = req.params;
    const result = await db.query(
      'SELECT * FROM email_templates WHERE seller_id = $1 OR is_default = TRUE ORDER BY created_at DESC',
      [sellerId]
    );
    res.json(toCamel(result.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching templates' });
  }
});

// Create template
app.post('/api/email-marketing/templates', authenticateToken, async (req, res) => {
  try {
    const { 
      sellerId, name, slug, subject, htmlContent, 
      plainTextContent, category, isDefault, variables, previewImage 
    } = req.body;
    
    const result = await db.query(
      `INSERT INTO email_templates 
       (seller_id, name, slug, subject, html_content, plain_text_content, category, is_default, variables, preview_image)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        sellerId, name, slug, subject, htmlContent, 
        plainTextContent || null, category || 'custom', 
        isDefault || false, JSON.stringify(variables || []), previewImage || null
      ]
    );
    
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating template' });
  }
});

// Update template
app.patch('/api/email-marketing/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const setClause = [];
    const values = [];
    let i = 1;
    
    const allowedFields = [
      'name', 'slug', 'subject', 'html_content', 'plain_text_content', 
      'category', 'is_default', 'is_active', 'variables', 'preview_image'
    ];

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(dbKey)) {
        setClause.push(`${dbKey} = $${i}`);
        values.push(dbKey === 'variables' ? JSON.stringify(value) : value);
        i++;
      }
    }
    
    if (setClause.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }
    
    values.push(id);
    const result = await db.query(
      `UPDATE email_templates SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Template not found' });
    }
    
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating template' });
  }
});

// Delete template
app.delete('/api/email-marketing/templates/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM email_templates WHERE id = $1', [id]);
    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting template' });
  }
});

// Get default templates
app.get('/api/email-marketing/templates/defaults', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM email_templates WHERE is_default = TRUE');
    res.json(toCamel(result.rows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching default templates' });
  }
});

// Get marketing overview stats (for real-time dashboard)
app.get('/api/marketing/stats/seller/:sellerId', authenticateToken, async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    const [socialRes, postsRes, emailSettingsRes, campaignsRes] = await Promise.all([
      db.query('SELECT count(*) FROM social_media_accounts WHERE seller_id = $1', [sellerId]),
      db.query("SELECT count(*) FROM social_media_posts WHERE seller_id = $1 AND status = 'scheduled'", [sellerId]),
      db.query('SELECT sent_count, is_active, is_verified FROM email_marketing_settings WHERE seller_id = $1', [sellerId]),
      db.query("SELECT status, count(*) FROM email_campaigns WHERE seller_id = $1 GROUP BY status", [sellerId])
    ]);
    
    const campaigns = campaignsRes.rows.reduce((acc, curr) => {
      acc[curr.status] = parseInt(curr.count);
      return acc;
    }, {});
    
    res.json({
      socialAccounts: parseInt(socialRes.rows[0].count),
      scheduledPosts: parseInt(postsRes.rows[0].count),
      emailSettings: emailSettingsRes.rows[0] ? {
        sentCount: emailSettingsRes.rows[0].sent_count,
        isActive: emailSettingsRes.rows[0].is_active,
        isVerified: emailSettingsRes.rows[0].is_verified
      } : null,
      campaigns: {
        total: Object.values(campaigns).reduce((a, b) => a + b, 0),
        sent: campaigns.sent || 0,
        scheduled: campaigns.scheduled || 0,
        drafts: campaigns.draft || 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching marketing stats' });
  }
});

// Helper to process campaign emails
const processCampaignEmails = async (campaignId) => {
  try {
    // Get the campaign
    const campaignRes = await db.query('SELECT * FROM email_campaigns WHERE id = $1', [campaignId]);
    if (campaignRes.rows.length === 0) {
      console.error(`Campaign ${campaignId} not found`);
      return { success: false, message: 'Campaign not found' };
    }
    
    const campaign = campaignRes.rows[0];
    const sellerId = campaign.seller_id;
    
    // Mark as sending
    await db.query("UPDATE email_campaigns SET status = 'sending', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [campaignId]);
    
    // Get seller info for from name
    const sellerRes = await db.query('SELECT * FROM sellers WHERE id = $1', [sellerId]);
    const seller = sellerRes.rows[0];
    
    // Get the seller's email settings
    const settingsRes = await db.query(
      'SELECT * FROM email_marketing_settings WHERE seller_id = $1 AND is_active = TRUE',
      [sellerId]
    );
    
    let transporter;
    let fromEmail = process.env.SMTP_USER;
    let fromName = seller?.store_name || 'Store';
    
    if (settingsRes.rows.length > 0) {
      const settings = settingsRes.rows[0];
      fromEmail = settings.from_email;
      fromName = settings.from_name || fromName;
      
      // Create transporter based on provider
      if (settings.provider === 'smtp') {
        transporter = nodemailer.createTransport({
          host: settings.smtp_host,
          port: settings.smtp_port || 587,
          secure: settings.smtp_port === 465,
          auth: {
            user: settings.smtp_user,
            pass: settings.smtp_password
          }
        });
      } else if (settings.provider === 'sendgrid') {
        transporter = nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            apiKey: settings.api_key
          }
        });
      } else if (settings.provider === 'mailgun') {
        transporter = nodemailer.createTransport({
          service: 'Mailgun',
          auth: {
            apiKey: settings.api_key,
            domain: settings.domain || 'mg.yourdomain.com'
          }
        });
      } else if (settings.provider === 'aws-ses') {
        transporter = nodemailer.createTransport({
          host: `email.${settings.region}.amazonaws.com`,
          port: 587,
          secure: false,
          auth: {
            user: settings.access_key_id,
            pass: settings.secret_access_key
          }
        });
      } else if (settings.provider === 'brevo' || settings.provider === 'sendinblue') {
        transporter = nodemailer.createTransport({
          host: 'smtp-relay.brevo.com',
          port: 587,
          auth: {
            user: settings.api_key,
            pass: ''
          }
        });
      } else if (settings.provider === 'postmark') {
        transporter = nodemailer.createTransport({
          host: 'smtp.postmarkapp.com',
          port: 587,
          auth: {
            user: settings.api_key,
            pass: settings.api_key
          }
        });
      } else {
        // Default to the system mailer
        const { sendEmail } = await import('./mailer.js');
        transporter = { sendMail: sendEmail };
      }
    } else {
      // Use system mailer if no settings configured
      const { sendEmail } = await import('./mailer.js');
      transporter = { sendMail: sendEmail };
      fromEmail = process.env.SMTP_USER;
    }
    
    // Get customers based on recipient type
    let customers = [];
    if (campaign.recipient_type === 'custom' && campaign.custom_recipients) {
      const customEmails = typeof campaign.custom_recipients === 'string' 
        ? JSON.parse(campaign.custom_recipients) 
        : campaign.custom_recipients;
      
      if (Array.isArray(customEmails) && customEmails.length > 0) {
        // Find customers matching these emails for this seller
        const customersRes = await db.query(
          'SELECT * FROM customers WHERE seller_id = $1 AND email = ANY($2::text[])',
          [sellerId, customEmails]
        );
        customers = customersRes.rows;
        
        // Also add emails that might not be in the customers table yet
        const foundEmails = customers.map(c => c.email);
        const missingEmails = customEmails.filter(email => !foundEmails.includes(email));
        
        for (const email of missingEmails) {
          customers.push({ email, name: email.split('@')[0] });
        }
      }
    } else {
      // Default to 'all' customers for this seller
      const customersRes = await db.query(
        'SELECT * FROM customers WHERE seller_id = $1 AND email IS NOT NULL',
        [sellerId]
      );
      customers = customersRes.rows;
    }
    
    if (customers.length === 0) {
      console.log(`No customers found for seller ${sellerId}`);
      await db.query("UPDATE email_campaigns SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [campaignId]);
      return { success: false, message: 'No customers found' };
    }
    
    // Replace variables in campaign content
    let subject = campaign.subject;
    let htmlContent = campaign.html_content;
    
    // Get seller info for variables
    const storeName = seller?.store_name || fromName;
    
    let deliveredCount = 0;
    let failedCount = 0;
    
    // Send emails to each customer
    for (const customer of customers) {
      try {
        // Replace customer-specific variables
        let emailSubject = subject
          .replace(/{{customerName}}/g, customer.name || 'Customer')
          .replace(/{{storeName}}/g, storeName);
        
        let emailHtml = htmlContent
          .replace(/{{customerName}}/g, customer.name || 'Customer')
          .replace(/{{storeName}}/g, storeName)
          .replace(/{{customerEmail}}/g, customer.email)
          .replace(/{{unsubscribeLink}}/g, `${process.env.VITE_APP_URL}/unsubscribe?email=${customer.email}&seller=${sellerId}`);
        
        if (transporter.sendMail) {
          await transporter.sendMail({
            from: `"${storeName}" <${fromEmail}>`,
            to: customer.email,
            subject: emailSubject,
            html: emailHtml
          });
        }
        deliveredCount++;
      } catch (emailErr) {
        console.error(`Failed to send email to ${customer.email}:`, emailErr);
        failedCount++;
      }
    }
    
    // Update campaign status
    await db.query(
      `UPDATE email_campaigns 
       SET status = 'sent', sent_at = CURRENT_TIMESTAMP, 
           total_recipients = $1, delivered_count = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [customers.length, deliveredCount, campaignId]
    );
    
    // Update email settings sent count
    if (settingsRes.rows.length > 0) {
      await db.query(
        'UPDATE email_marketing_settings SET sent_count = sent_count + $1, last_used_at = CURRENT_TIMESTAMP WHERE id = $2',
        [deliveredCount, settingsRes.rows[0].id]
      );
    }
    
    return { 
      success: true, 
      deliveredCount, 
      failedCount 
    };
  } catch (err) {
    console.error(`Error processing campaign ${campaignId}:`, err);
    await db.query("UPDATE email_campaigns SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [campaignId]);
    return { success: false, error: err.message };
  }
};

// --- Background Jobs ---

const startBackgroundJobs = () => {
  console.log('🚀 Starting background jobs...');
  
  // Every 1 minute
  setInterval(async () => {
    try {
      // 1. Process scheduled email campaigns
      const now = new Date().toISOString();
      const campaignsRes = await db.query(
        "SELECT * FROM email_campaigns WHERE status = 'scheduled' AND scheduled_at <= $1",
        [now]
      );
      
      for (const campaign of campaignsRes.rows) {
        console.log(`[BACKGROUND] Sending scheduled campaign: ${campaign.name}`);
        await processCampaignEmails(campaign.id);
      }
      
      // 2. Process scheduled social media posts
      const postsRes = await db.query(
        "SELECT * FROM social_media_posts WHERE status = 'scheduled' AND scheduled_at <= $1",
        [now]
      );
      
      for (const post of postsRes.rows) {
        console.log(`[BACKGROUND] Posting scheduled social content: ${post.id}`);
        // In a real app, we would call the social platform API
        await db.query(
          "UPDATE social_media_posts SET status = 'posted', posted_at = CURRENT_TIMESTAMP, post_url = $1 WHERE id = $2",
          [`https://social-platform.com/post/${nanoid(10)}`, post.id]
        );
      }
    } catch (err) {
      console.error('Background Job Error:', err);
    }
  }, 60000);
};

// ✅ IMPORTANT: bind to 0.0.0.0 for Coolify
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});