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
import { createTransporterFromSettings } from './mailer.js';
import { triggerAutomation } from './automations.js';
import { THEME_IDS, THEME_PRICE_USD_CENTS, isValidThemePrice } from '../shared/themePricing.js';
import { mountPosRoutes } from './posRoutes.js';

const Paystack = PaystackFactory.default || PaystackFactory;
const VIP_THEME_IDS = THEME_IDS;

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

// Helper to load settings by ID and build a transporter
async function buildTransporterFromSettingsId(settingsId) {
  const result = await db.query(
    'SELECT * FROM email_marketing_settings WHERE id = $1 AND is_active = TRUE',
    [settingsId]
  );

  if (result.rows.length === 0) {
    return { settings: null, transporter: null };
  }

  const settings = result.rows[0];
  const transporter = createTransporterFromSettings(settings);

  if (!transporter) {
    const { sendEmail } = await import('./mailer.js');
    return { settings, transporter: { sendMail: sendEmail } };
  }

  return { settings, transporter };
}

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 2823;
const JWT_SECRET = process.env.JWT_SECRET || 'iyonicorp_secret_key';
const RESERVED_STORE_SUBDOMAINS = new Set([
  'admin', 'api', 'app', 'demo', 'iyonicorp', 'iyonicweb', 'localhost', 'shop', 'store', 'web', 'www'
]);

const normalizeStoreSubdomain = (value) => String(value || '').trim().toLowerCase();
const isValidStoreSubdomain = (subdomain) => (
  subdomain.length >= 2
  && subdomain.length <= 63
  && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(subdomain)
  && !RESERVED_STORE_SUBDOMAINS.has(subdomain)
);
const generateStoreSubdomain = (storeName) => {
  const storeSlug = String(storeName || 'store')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '') || 'store';
  const suffix = nanoid(8).toLowerCase().replace(/[^a-z0-9]/g, '') || Date.now().toString(36);
  return `${storeSlug}-${suffix}`;
};

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

const nlmAudioExtensions = new Set(['.mp3', '.wav', '.m4a']);
const nlmImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const nlmMimeTypes = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
const nlmUploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024, files: 2 },
   fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed = file.fieldname === 'audio'
      ? nlmAudioExtensions.has(extension) && (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream' || (extension === '.m4a' && file.mimetype === 'video/mp4'))
      : file.fieldname === 'thumbnail' && nlmImageExtensions.has(extension) && (file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream');
    if (allowed && nlmMimeTypes[extension]) file.mimetype = nlmMimeTypes[extension];
    cb(allowed ? null : new Error('Choose a supported audio file and an image thumbnail.'), allowed);
  }
});
const handleNlmSongUpload = (req, res, next) => nlmUploadMemory.fields([{ name: 'audio', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }])(req, res, (error) => {
  if (error) return res.status(400).json({ message: error.message });
  next();
});

const ixsVideoExtensions = new Set(['.mp4', '.mov', '.avi', '.mkv', '.wmv']);
const ixsImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const ixsUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, 'public/uploads');
      fs.mkdir(uploadDir, { recursive: true }, (error) => cb(error, uploadDir));
    },
    filename: (req, file, cb) => cb(null, `ixs-${nanoid(20)}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 500 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed = (file.fieldname === 'video' && ixsVideoExtensions.has(extension) && (file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream'))
      || (file.fieldname === 'thumbnail' && ixsImageExtensions.has(extension) && file.mimetype.startsWith('image/'));
    cb(allowed ? null : new Error('Choose a supported video file and an image thumbnail.'), allowed);
  }
});
const handleIxsUpload = (req, res, next) => ixsUpload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }])(req, res, (error) => {
  if (error) return res.status(400).json({ message: error.message });
  next();
});

const requireIxsAdmin = async (req, res, next) => {
  if (req.user?.role === 'manager_admin') return next();
  if (req.user?.role !== 'seller' || !req.user.sellerId) {
    return res.status(403).json({ message: 'A seller account with the IxStream theme is required.' });
  }
  try {
    const seller = await db.query(`SELECT id FROM sellers WHERE id = $1 AND user_id = $2 AND theme->>'selectedTheme' = 'ixstream'`, [req.user.sellerId, req.user.id]);
    if (!seller.rows.length) return res.status(403).json({ message: 'Apply the IxStream theme before managing its catalogue.' });
    next();
  } catch (err) {
    console.error('IxStream permission check error:', err);
    res.status(500).json({ message: 'Could not verify IxStream access.' });
  }
};

const ixsFileUrl = (file) => file ? `/uploads/${file.filename}` : null;
const removeIxsFiles = async (urls) => {
  for (const url of urls.filter(Boolean)) {
    const filename = path.basename(String(url).split('?')[0]);
    if (!filename.startsWith('ixs-')) continue;
    await fs.promises.unlink(path.join(__dirname, 'public/uploads', filename)).catch(() => {});
  }
};

// Serving static files from public/uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ✅ Serve built frontend files from 'dist' directory
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// ✅ NEW: Log database connection (for debugging in Coolify)
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Loaded ✅" : "Missing ❌");

// Initialize Database
initDb()
  .then(() => {
    seedDefaultTemplates();
    startBackgroundJobs();
  })
  .catch(err => {
    console.error('❌ Failed to initialize database on startup:', err);
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

<p style="font-size: 18px; font-weight: bold; text-align: right;">Total: \${{orderTotal}}</p>

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

<p style="font-size: 18px; font-weight: bold; text-align: right;">Order Total: \${{orderTotal}}</p>

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
const authenticateToken = async (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.id !== 'admin-id') {
      const userRes = await db.query('SELECT is_suspended FROM users WHERE id = $1', [decoded.id]);
      if (userRes.rows.length === 0) {
        return res.status(401).json({ message: 'Account not found. Please sign in again.' });
      }
      if (userRes.rows[0].is_suspended) {
        return res.status(403).json({
          code: 'ACCOUNT_SUSPENDED',
          message: 'Your account has been suspended. Please contact support.'
        });
      }
    }

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
    const requestedSubdomain = normalizeStoreSubdomain(subdomain);
    if (role === 'seller' && requestedSubdomain && !isValidStoreSubdomain(requestedSubdomain)) {
      return res.status(400).json({
        message: 'Choose a valid subdomain using letters, numbers, and hyphens only.'
      });
    }

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

      return res.status(409).json({
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email address already exists. Please sign in instead.'
      });
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
        const generatedSubdomain = requestedSubdomain || generateStoreSubdomain(storeName);
        console.log('Generated subdomain:', generatedSubdomain);
        
        let initialPlan = 'starter';
        const managerIdFromUrl = req.body.managerId || null;

        // Special logic for Enterprise Managers: first 6 sellers get Professional plan free
        if (managerIdFromUrl) {
          const managerRes = await client.query('SELECT pricing_config FROM seller_managers WHERE id = $1', [managerIdFromUrl]);
          if (managerRes.rows.length > 0) {
            const manager = managerRes.rows[0];
            let managerSubscription = {};
            try {
              managerSubscription = typeof manager.pricing_config === 'object' ? manager.pricing_config : JSON.parse(manager.pricing_config || '{}');
            } catch (e) {
              managerSubscription = {};
            }
            const managerPlan = managerSubscription.plan || 'starter';
            
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
           'INSERT INTO sellers (user_id, store_name, subdomain, shop_type, subscription, theme, manager_id, is_live) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)',
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

      // Log activity for seller registration
      if (role === 'seller') {
        const sellerRes = await client.query('SELECT id FROM sellers WHERE user_id = $1', [user.id]);
        const newSellerId = sellerRes.rows[0]?.id;
        await client.query(
          'INSERT INTO admin_activities (action, description, entity_type, entity_id, user_id, user_name, severity) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          ['seller_registered', `New seller "${storeName}" registered`, 'seller', newSellerId || sellerId, user.id, user.name, 'success']
        );
      }

      res.status(201).json({ user: { ...user, sellerId: role === 'customer' ? requestSellerId : sellerId, managerId }, token });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Registration Error:', err);
    if (err.code === '23505' && err.constraint === 'sellers_subdomain_key') {
      return res.status(409).json({ message: 'That subdomain is already in use. Choose another one.' });
    }
    res.status(500).json({ 
      message: 'Server error during registration', 
    });
  }
});

// Link Store to existing customer account
app.post('/api/auth/link-store', async (req, res) => {
  const { email, password, sellerId } = req.body;

  try {
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({
        code: 'ACCOUNT_NOT_FOUND',
        message: 'We could not find an account with that email address.'
      });
    }

    const user = userRes.rows[0];
    if (user.is_suspended) {
      return res.status(403).json({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Please contact support.'
      });
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        code: 'INCORRECT_PASSWORD',
        message: 'The password you entered is incorrect. Please try again or reset your password.'
      });
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
      return res.status(404).json({
        code: 'ACCOUNT_NOT_FOUND',
        message: 'We could not find an account with that email address.'
      });
    }

    const user = userRes.rows[0];

    if (user.is_suspended) {
      return res.status(403).json({
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // Log failed login attempt
      const adminUserId = user.id === 'admin-id' ? null : user.id;
      await db.query(
        'INSERT INTO admin_activities (action, description, user_id, user_name, user_email, severity) VALUES ($1, $2, $3, $4, $5, $6)',
        ['login_failed', 'Failed login attempt', adminUserId, user.name || 'Unknown', email, 'warning']
      );
      return res.status(401).json({
        code: 'INCORRECT_PASSWORD',
        message: 'The password you entered is incorrect. Please try again or reset your password.'
      });
    }

    // Log successful login
    const adminUserId = user.id === 'admin-id' ? null : user.id;
    await db.query(
      'INSERT INTO admin_activities (action, description, user_id, user_name, user_email, severity) VALUES ($1, $2, $3, $4, $5, $6)',
      ['login', 'User logged in successfully', adminUserId, user.name || 'Admin', user.email || 'admin@iyonicorp.com', 'info']
    );

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

// Forgot Password - Request OTP
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const userRes = await db.query('SELECT id, email, name FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    const user = userRes.rows[0];
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store OTP in database
    await db.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3',
      [user.id, otp, expiresAt]
    );

    // Send email with OTP
    const subject = 'Password Reset Code - IyoniCorp';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Password Reset Request</h2>
        <p>Hello ${user.name},</p>
        <p>Your password reset code is:</p>
        <div style="background: #4f46e5; color: white; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; border-radius: 8px; letter-spacing: 5px;">
          ${otp}
        </div>
        <p style="margin-top: 20px;">This code will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `;

    await mailer.sendEmail({ to: user.email, subject, html });
    res.json({ message: 'Reset code sent to your email' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error processing request' });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    const userRes = await db.query('SELECT id, email FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    const user = userRes.rows[0];
    const tokenRes = await db.query(
      'SELECT token, expires_at FROM password_reset_tokens WHERE user_id = $1 AND token = $2',
      [user.id, otp]
    );

    if (tokenRes.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid reset code' });
    }

    const storedToken = tokenRes.rows[0];
    if (new Date(storedToken.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
    }

    // Generate verification token for password reset
    const resetToken = nanoid(32);
    await db.query(
      'UPDATE password_reset_tokens SET reset_token = $1 WHERE user_id = $2',
      [resetToken, user.id]
    );

    res.json({ message: 'OTP verified successfully', resetToken });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: 'Server error verifying code' });
  }
});

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    return res.status(400).json({ message: 'Reset token and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    const tokenRes = await db.query(
      'SELECT user_id, expires_at FROM password_reset_tokens WHERE reset_token = $1',
      [resetToken]
    );

    if (tokenRes.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const storedToken = tokenRes.rows[0];
    if (new Date(storedToken.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' });
    }

    // Get user info for logging and email BEFORE other operations
    const userRes = await db.query('SELECT email, name FROM users WHERE id = $1', [storedToken.user_id]);
    const targetUser = userRes.rows[0];

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, storedToken.user_id]);
    await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [storedToken.user_id]);

    // Log activity with correct user name
    await db.query(
      'INSERT INTO admin_activities (action, description, user_id, user_name, severity) VALUES ($1, $2, $3, $4, $5)',
      ['password_reset', 'Password was reset successfully', storedToken.user_id, targetUser?.name || 'Unknown user', 'info']
    );

    const subject = 'Password Reset Successful - IyoniCorp';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Password Changed Successfully</h2>
        <p>Hello ${targetUser?.name},</p>
        <p>Your password has been successfully reset.</p>
        <p>You can now log in with your new password.</p>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          If you didn't make this change, please contact support immediately.
        </p>
      </div>
    `;

    await mailer.sendEmail({ to: targetUser.email, subject, html });
    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error resetting password' });
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

    const userRes = await db.query('SELECT is_suspended, name, email, role FROM users WHERE id = $1', [req.params.id]);
    if (userRes.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    
    const newStatus = !userRes.rows[0].is_suspended;
    const affectedUser = userRes.rows[0];
    const userName = affectedUser.name;
    await db.query('UPDATE users SET is_suspended = $1 WHERE id = $2', [newStatus, req.params.id]);

    const emailResult = await mailer.sendAccountStatusEmail(affectedUser, newStatus);
    
// Log activity - handle admin-id which is not UUID compatible
     const adminUserId = req.user.id === 'admin-id' ? null : req.user.id;
     await db.query(
       'INSERT INTO admin_activities (action, description, entity_type, entity_id, user_id, user_name, user_email, severity) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
       ['suspension', `User "${userName}" ${newStatus ? 'suspended' : 'unsuspended'}`, 'user', req.params.id, adminUserId, req.user.name || 'Admin', req.user.email || 'admin@iyonicorp.com', 'warning']
     );
    
    res.json({
      message: `User ${newStatus ? 'suspended' : 'unsuspended'} successfully`,
      isSuspended: newStatus,
      emailSent: Boolean(emailResult)
    });
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
            SELECT s.*, u.name as owner_name, u.email as owner_email,
              (SELECT COUNT(*) FROM products p WHERE p.seller_id = s.id) as live_total_products,
              (SELECT COUNT(*) FROM orders o WHERE o.seller_id = s.id) as live_total_orders,
              (SELECT COUNT(*) FROM customers c WHERE c.seller_id = s.id) as live_total_customers,
              COALESCE((SELECT SUM(o.total) FROM orders o WHERE o.seller_id = s.id AND o.status != 'pending'), 0) as live_total_revenue
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
    res.json(toCamel(sellersRes.rows.map(seller => ({
      ...seller,
      stats: {
        ...(seller.stats || {}),
        totalProducts: Number(seller.live_total_products || 0),
        totalOrders: Number(seller.live_total_orders || 0),
        totalCustomers: Number(seller.live_total_customers || 0),
        totalRevenue: Number(seller.live_total_revenue || 0)
      }
    }))));
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
    subdomain, requested_subdomain, requestedSubdomain,
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
  const rawSubdomain = subdomain !== undefined
    ? subdomain
    : requested_subdomain !== undefined
      ? requested_subdomain
      : requestedSubdomain;
  const finalSubdomain = rawSubdomain !== undefined && rawSubdomain !== null
    ? normalizeStoreSubdomain(rawSubdomain)
    : undefined;
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
    if (finalSubdomain !== undefined && !isValidStoreSubdomain(finalSubdomain)) {
      const currentSeller = await db.query('SELECT subdomain FROM sellers WHERE user_id = $1', [req.user.id]);
      if (normalizeStoreSubdomain(currentSeller.rows[0]?.subdomain) !== finalSubdomain) {
        return res.status(400).json({
          message: 'Choose a valid subdomain using letters, numbers, and hyphens only.'
        });
      }
    }

    const selectedThemeId = (theme && typeof theme === 'object' && theme.selectedTheme) || req.body.themeId;
    if (VIP_THEME_IDS.has(selectedThemeId)) {
      const ownership = await db.query('SELECT acquired_themes, theme FROM sellers WHERE user_id = $1', [req.user.id]);
      const acquiredThemes = ownership.rows[0]?.acquired_themes || [];
      const currentThemeId = ownership.rows[0]?.theme?.selectedTheme;
      if (!acquiredThemes.includes(selectedThemeId) && selectedThemeId !== currentThemeId) {
        return res.status(403).json({ message: 'Acquire this theme before applying it.' });
      }
    }

    const sellerRes = await db.query(
      `UPDATE sellers SET 
        store_name = COALESCE($1, store_name), 
        description = COALESCE($2, description), 
        logo = COALESCE($3, logo), 
        theme = COALESCE($4::jsonb, theme),
        shop_type = COALESCE($5, shop_type),
        subdomain = COALESCE($6, subdomain),
        requested_subdomain = NULL,
        is_live = CASE WHEN $6 IS NOT NULL AND subdomain IS DISTINCT FROM $6 THEN TRUE ELSE is_live END,
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
        const managerRes = await db.query('SELECT user_id, pricing_config FROM seller_managers WHERE id = $1', [updatedSeller.manager_id]);
        if (managerRes.rows.length > 0) {
          const manager = managerRes.rows[0];
          let managerSubscription = {};
          try {
            managerSubscription = typeof manager.pricing_config === 'object' ? manager.pricing_config : JSON.parse(manager.pricing_config || '{}');
          } catch (e) {
            managerSubscription = {};
          }
          const managerPlan = managerSubscription.plan || 'starter';

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
    if (err.code === '23505' && err.constraint === 'sellers_subdomain_key') {
      return res.status(409).json({ message: 'That subdomain is already in use. Choose another one.' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/sellers/me/themes/purchase/initialize', authenticateToken, async (req, res) => {
  const { themeId } = req.body;
  const amountCents = THEME_PRICE_USD_CENTS[themeId];
  if (req.user.role !== 'seller' || !VIP_THEME_IDS.has(themeId) || !isValidThemePrice(amountCents)) {
    return res.status(400).json({ message: 'Invalid theme.' });
  }

  try {
    const sellerRes = await db.query(
      'SELECT s.id, s.acquired_themes, u.email FROM sellers s JOIN users u ON u.id = s.user_id WHERE s.user_id = $1',
      [req.user.id]
    );
    const seller = sellerRes.rows[0];
    if (!seller) return res.status(404).json({ message: 'Seller not found.' });
    if ((seller.acquired_themes || []).includes(themeId)) {
      return res.status(409).json({ message: 'This theme is already acquired.' });
    }
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(503).json({ message: 'Theme checkout is not configured.' });
    }

    const response = await new Promise((resolve, reject) => {
      Paystack(process.env.PAYSTACK_SECRET_KEY).transaction.initialize({
        email: seller.email,
        amount: amountCents,
        currency: 'USD',
        callback_url: `${req.headers.origin || process.env.FRONTEND_URL || ''}/#/themes?verifyTheme=${encodeURIComponent(themeId)}`,
        metadata: {
          type: 'vip_theme_purchase',
          theme_id: themeId,
          seller_id: seller.id,
          user_id: req.user.id
        }
      }, (error, body) => {
        if (error || body?.status === false) reject(new Error(body?.message || error?.message || 'Payment initialization failed'));
        else resolve(body);
      });
    });

    res.json(response);
  } catch (error) {
    console.error('VIP theme payment initialization failed:', error);
    res.status(500).json({ message: 'Could not start theme checkout.' });
  }
});

app.post('/api/sellers/me/themes/purchase/verify', authenticateToken, async (req, res) => {
  const { themeId, reference } = req.body;
  const amountCents = THEME_PRICE_USD_CENTS[themeId];
  if (req.user.role !== 'seller' || !VIP_THEME_IDS.has(themeId) ||
    !isValidThemePrice(amountCents) || typeof reference !== 'string' || !reference.trim()) {
    return res.status(400).json({ message: 'Invalid theme payment details.' });
  }

  const client = await db.pool.connect();
  try {
    const payment = await new Promise((resolve, reject) => {
      Paystack(process.env.PAYSTACK_SECRET_KEY).transaction.verify(reference, (error, body) => {
        if (error) reject(error);
        else resolve(body);
      });
    });
    const metadata = payment?.data?.metadata || {};
    if (!payment?.status || payment.data.status !== 'success' ||
      metadata.type !== 'vip_theme_purchase' || metadata.theme_id !== themeId ||
      metadata.user_id !== req.user.id || metadata.seller_id == null ||
      payment.data.amount !== amountCents ||
      payment.data.currency !== 'USD') {
      return res.status(400).json({ message: 'Payment could not be verified for this theme.' });
    }

    await client.query('BEGIN');
    const sellerRes = await client.query('SELECT id FROM sellers WHERE user_id = $1 FOR UPDATE', [req.user.id]);
    const seller = sellerRes.rows[0];
    if (!seller || seller.id !== metadata.seller_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Payment does not belong to this seller.' });
    }

    const purchaseRes = await client.query(
      `INSERT INTO vip_theme_purchases (seller_id, theme_id, reference, amount)
       VALUES ($1, $2, $3, $4) ON CONFLICT (reference) DO NOTHING RETURNING id`,
      [seller.id, themeId, reference, amountCents / 100]
    );
    if (purchaseRes.rows.length === 0) {
      const existing = await client.query('SELECT seller_id, theme_id FROM vip_theme_purchases WHERE reference = $1', [reference]);
      if (existing.rows[0]?.seller_id !== seller.id || existing.rows[0]?.theme_id !== themeId) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'This payment reference has already been used.' });
      }
    }

    const updated = await client.query(
      `UPDATE sellers SET acquired_themes = CASE
         WHEN COALESCE(acquired_themes, '[]'::jsonb) ? $2 THEN COALESCE(acquired_themes, '[]'::jsonb)
         ELSE COALESCE(acquired_themes, '[]'::jsonb) || jsonb_build_array($2)
       END WHERE id = $1 RETURNING acquired_themes`,
      [seller.id, themeId]
    );
    await client.query('COMMIT');
    res.json({ acquiredThemes: updated.rows[0].acquired_themes || [] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('VIP theme payment verification failed:', error);
    res.status(500).json({ message: 'Could not verify the theme payment.' });
  } finally {
    client.release();
  }
});

app.post('/api/sellers/me/themes/offers', authenticateToken, async (req, res) => {
  const { themeId, amount, message = '' } = req.body;
  const offerAmount = Number(amount);
  if (req.user.role !== 'seller' || !VIP_THEME_IDS.has(themeId) ||
    !Number.isFinite(offerAmount) || offerAmount <= 0 || offerAmount > 50000 ||
    typeof message !== 'string' || message.length > 1000) {
    return res.status(400).json({ message: 'Enter a valid VIP theme offer.' });
  }

  const ownerEmail = process.env.THEME_OWNER_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!ownerEmail) return res.status(503).json({ message: 'Theme offers are not configured yet.' });

  try {
    const sellerRes = await db.query('SELECT id, store_name FROM sellers WHERE user_id = $1', [req.user.id]);
    const seller = sellerRes.rows[0];
    if (!seller) return res.status(404).json({ message: 'Seller not found.' });
    await db.query(
      'INSERT INTO vip_theme_offers (seller_id, theme_id, amount, message) VALUES ($1, $2, $3, $4)',
      [seller.id, themeId, offerAmount, message.trim()]
    );
    await mailer.sendEmail({
      to: ownerEmail,
      subject: `VIP theme offer: ${themeId}`,
      text: `${seller.store_name} offered $${offerAmount.toFixed(2)} for ${themeId}.\n\n${message.trim() || 'No additional message.'}`
    });
    res.status(201).json({ message: 'Your offer was sent to the theme owner.' });
  } catch (error) {
    console.error('VIP theme offer failed:', error);
    res.status(500).json({ message: 'Could not submit the offer.' });
  }
});

app.post('/api/sellers/me/pay-subscription', authenticateToken, async (req, res) => {
  const { planId } = req.body;
  if (planId === 'professional' || planId === 'enterprise') {
    return res.status(400).json({ message: 'Professional and Enterprise are managed through IyonicPay bundles.' });
  }
  const defaultSellerPricing = {
    starter: 0,
    basic: 15,
    professional: 29,
    enterprise: 99
  };

  const price = defaultSellerPricing[planId] ?? 0;
  if (!price) return res.status(400).json({ message: 'Free plans do not require payment.' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const sellerRes = await client.query('SELECT id, manager_id FROM sellers WHERE user_id = $1 FOR UPDATE', [req.user.id]);
    if (sellerRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Seller not found' });
    }
    const seller = sellerRes.rows[0];

    const walletRes = await client.query('SELECT id, balance, currency FROM wallets WHERE user_id = $1 FOR UPDATE', [req.user.id]);
    const wallet = walletRes.rows[0];
    if (!wallet || Number(wallet.balance) < price) {
      await client.query('ROLLBACK');
      return res.status(402).json({ message: `You need $${price.toFixed(2)} USD in your IyonicPay wallet to activate this plan.` });
    }

    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    await client.query(
      'UPDATE wallets SET balance = balance - $1 WHERE id = $2',
      [price, wallet.id]
    );

    await client.query(
      `INSERT INTO transactions (sender_wallet_id, amount, currency, type, status, description)
       VALUES ($1, $2, $3, 'invoice_payment', 'completed', $4)`,
      [wallet.id, price, wallet.currency || 'USD', `IyonicShop ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan`]
    );

    const nextSubscription = { plan: planId, status: 'active', startDate: new Date().toISOString(), endDate: nextMonth.toISOString() };
    await client.query(
      'UPDATE sellers SET subscription = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(nextSubscription), seller.id]
    );

    await client.query('COMMIT');

    // Log activity
    try {
      await db.query(
        `INSERT INTO admin_activities (action, description, user_id, severity)
         VALUES ($1, $2, $3, $4)`,
        ['seller_upgrade', `Seller ${seller.id} upgraded to ${planId} plan via IyonicPay wallet`, req.user.id, 'success']
      );
    } catch (logErr) { console.error('Activity log error:', logErr); }

    res.json({ message: `${planId.charAt(0).toUpperCase() + planId.slice(1)} plan activated via IyonicPay`, plan: planId, price });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Wallet subscription payment error:', err);
    res.status(500).json({ message: 'Could not process IyonicPay payment' });
  } finally {
    client.release();
  }
});

const SELLER_PLANS = {
  starter: { name: 'Starter', price: 0, description: 'Perfect to get started with IyonicShop and IyonicBots.', features: ['20 Products Limit', 'IyonicPay Integration', '7% Commission', 'Basic IyonicBots'] },
  basic: { name: 'Basic', price: 15, description: 'For growing businesses needing more products and advanced bots.', features: ['100 Products', 'IyonicPay + 2% Commission', 'Pro IyonicBots', 'Basic Automation'] },
  professional: { name: 'Professional', price: 29, description: 'For established stores with high volume and priority support.', features: ['Unlimited Products', 'IyonicPay + 1% Commission', 'Pro Max IyonicBots', 'Advanced Automation'] },
  enterprise: { name: 'Enterprise', price: 99, description: 'Custom solutions and white-glove support for large businesses.', features: ['Unlimited Products', 'Custom Pricing', 'Enterprise IyonicBots', 'VIP Support'] }
};

const BILL_ADDONS = {
  customDomain: { name: 'Custom Domain', price: 3, category: 'Brand', description: 'Connect your own domain to your store.' },
  advancedAnalytics: { name: 'Advanced Analytics', price: 7, category: 'Growth', description: 'Track sales, conversion and customer trends.' },
  premiumSupport: { name: 'Priority Support', price: 9, category: 'Support', description: 'Faster support response for your business.' },
  apiAccess: { name: 'API Access', price: 8, category: 'Automation', description: 'Connect your tools to IyonicShop and IyonicBots.' },
  whiteLabel: { name: 'White Label', price: 12, category: 'Brand', description: 'Remove Iyonicorp branding from your storefront.' }
};

const BUNDLES = {
  starter: { name: 'Starter Bundle', planIds: ['starter', 'starter'], basePrice: 0, description: 'Starter Shop + Starter Bots' },
  growth: { name: 'Basic Bundle', planIds: ['basic', 'basic'], basePrice: 16, description: 'Basic Shop + Basic Bots' },
  pro: { name: 'Professional Bundle', planIds: ['professional', 'pro'], basePrice: 34.99, description: 'Professional Shop + Pro Bots' },
  enterprise: { name: 'Enterprise Bundle', planIds: ['enterprise', 'promax'], basePrice: 118.99, description: 'Enterprise Shop + Pro Max Bots' }
};

const calculateBundleDiscount = (shopPlan, botPlan) => {
  const shopPrice = SELLER_PLANS[shopPlan]?.price || 0;
  const botPrice = IYONIC_BOT_PLANS[botPlan]?.price || 0;
  let discount = 0;
  if (shopPlan === 'basic' && botPlan === 'basic') discount = 1;
  else if (shopPlan === 'professional' && botPlan === 'pro') discount = 4;
  else if (shopPlan === 'enterprise' && botPlan === 'promax') discount = 10;
  return { basePrice: shopPrice + botPrice, discount, finalPrice: shopPrice + botPrice - discount };
};

app.get('/api/sellers/me/billing', authenticateToken, async (req, res) => {
  try {
    const sellerRes = await db.query('SELECT subscription FROM sellers WHERE user_id = $1', [req.user.id]);
    if (sellerRes.rows.length === 0) {
      return res.status(404).json({ message: 'Seller not found' });
    }
    const subscription = sellerRes.rows[0]?.subscription || { plan: 'starter', status: 'active', endDate: null };
    const wallet = await db.query('SELECT balance, currency FROM wallets WHERE user_id = $1', [req.user.id]);
    res.json({ subscription, plans: SELLER_PLANS, wallet: wallet.rows[0] || { balance: 0, currency: 'USD' } });
  } catch (err) {
    res.status(500).json({ message: 'Unable to load seller billing' });
  }
});

app.post('/api/sellers/me/paystack/initialize', authenticateToken, async (req, res) => {
  const { planId } = req.body;
  if (planId === 'professional' || planId === 'enterprise') return res.status(400).json({ message: 'Professional and Enterprise are managed through IyonicPay bundles.' });
  const selectedPlan = SELLER_PLANS[planId];
  if (!selectedPlan || selectedPlan.price <= 0) return res.status(400).json({ message: 'Choose a paid plan.' });
  const sellerRes = await db.query('SELECT id FROM sellers WHERE user_id = $1', [req.user.id]);
  if (sellerRes.rows.length === 0) return res.status(404).json({ message: 'Seller not found' });
  if (!process.env.PAYSTACK_SECRET_KEY) return res.status(503).json({ message: 'Direct card payments are not configured yet.' });

  try {
    const userResult = await db.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    const email = userResult.rows[0]?.email;
    if (!email) return res.status(422).json({ message: 'We could not find an email address for this account.' });
    const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);
    const callbackUrl = `${process.env.VITE_APP_URL || process.env.APP_URL || 'http://localhost:4000/'}/#/iyonicpay?tab=my-bills`;
    const payment = await new Promise((resolve, reject) => {
      paystack.transaction.initialize({
        email,
        amount: Math.round(selectedPlan.price * 100),
        currency: process.env.PAYSTACK_CURRENCY || 'USD',
        channels: ['card', 'mobile_money'],
        callback_url: callbackUrl,
        metadata: { type: 'iyonicshop_plan', planId, sellerId: sellerRes.rows[0].id }
      }, (err, body) => err ? reject(err) : resolve(body));
    });
    res.json({ authorizationUrl: payment.data.authorization_url, reference: payment.data.reference, planId });
  } catch (err) {
    console.error('Seller Paystack initialization error:', err);
    res.status(500).json({ message: 'Could not start direct payment' });
  }
});

app.post('/api/sellers/me/paystack/verify', authenticateToken, async (req, res) => {
  const { reference } = req.body;
  const { planId } = req.body;
  if (planId === 'professional' || planId === 'enterprise') return res.status(400).json({ message: 'Professional and Enterprise are managed through IyonicPay bundles.' });
  const selectedPlan = SELLER_PLANS[planId];
  if (!reference || !selectedPlan || selectedPlan.price <= 0) return res.status(400).json({ message: 'Invalid payment verification request' });
  const sellerRes = await db.query('SELECT id FROM sellers WHERE user_id = $1', [req.user.id]);
  if (sellerRes.rows.length === 0) return res.status(404).json({ message: 'Seller not found' });

  try {
    const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);
    const payment = await new Promise((resolve, reject) => {
      paystack.transaction.verify(reference, (err, body) => err ? reject(err) : resolve(body));
    });
    if (!payment.status || payment.data?.status !== 'success') return res.status(402).json({ message: 'Payment was not completed' });
    const paidAmount = Number(payment.data.amount) / 100;
    if (paidAmount < selectedPlan.price) return res.status(402).json({ message: 'Payment amount does not match the selected plan' });

    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const nextSubscription = { plan: planId, status: 'active', startDate: new Date().toISOString(), endDate: nextMonth.toISOString() };
    await db.query('UPDATE sellers SET subscription = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [JSON.stringify(nextSubscription), sellerRes.rows[0].id]);
    res.json({ message: `${selectedPlan.name} plan activated`, plan: { id: planId, ...selectedPlan } });
  } catch (err) {
    console.error('Seller Paystack verification error:', err);
    res.status(500).json({ message: 'Could not verify direct payment' });
  }
});

app.get('/api/billing/auto-renew', authenticateToken, async (req, res) => {
  try {
    const sellerRes = await db.query('SELECT auto_renew, subscription FROM sellers WHERE user_id = $1', [req.user.id]);
    if (sellerRes.rows.length === 0) return res.status(404).json({ message: 'Seller not found' });
    const seller = sellerRes.rows[0];
    const autoRenew = seller.auto_renew || { iyonicshop: { enabled: false }, iyonicbots: { enabled: false } };
    const shopPlan = (seller.subscription || {}).plan || 'starter';
    const shopEndDate = (seller.subscription || {}).endDate || null;
    const botPlan = (seller.subscription || {}).botPlan || 'starter';
    res.json({
      autoRenew,
      currentPlans: {
        iyonicshop: { plan: shopPlan, endDate: shopEndDate, status: (seller.subscription || {}).status || 'active' },
        iyonicbots: { plan: botPlan, endDate: (seller.subscription || {}).botPlanStartedAt || null, status: 'active' }
      },
      plans: SUBSCRIPTION_PLANS_CONFIG,
      wallet: seller.wallet || { balance: 0, currency: 'USD' }
    });
  } catch (err) {
    console.error('Auto-renew fetch error:', err);
    res.status(500).json({ message: 'Could not load auto-renew settings' });
  }
});

app.patch('/api/billing/auto-renew', authenticateToken, async (req, res) => {
  const { platform, enabled, planId } = req.body;
  if (!platform || !['iyonicshop', 'iyonicbots'].includes(platform)) {
    return res.status(400).json({ message: 'Invalid platform' });
  }

  try {
    const sellerRes = await db.query('SELECT auto_renew FROM sellers WHERE user_id = $1', [req.user.id]);
    if (sellerRes.rows.length === 0) return res.status(404).json({ message: 'Seller not found' });
    const current = sellerRes.rows[0].auto_renew || {};
    const updated = {
      ...current,
      [platform]: {
        enabled,
        plan: planId || (current[platform]?.plan || null),
        updatedAt: new Date().toISOString()
      }
    };
    await db.query('UPDATE sellers SET auto_renew = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2', [JSON.stringify(updated), req.user.id]);
    res.json({ message: `Auto-renew updated for ${platform}`, autoRenew: updated });
  } catch (err) {
    console.error('Auto-renew update error:', err);
    res.status(500).json({ message: 'Could not update auto-renew settings' });
  }
});

app.get('/api/billing/unified', authenticateToken, async (req, res) => {
  try {
    const sellerRes = await db.query(
      'SELECT subscription, auto_renew FROM sellers WHERE user_id = $1',
      [req.user.id]
    );
    if (sellerRes.rows.length === 0) return res.status(404).json({ message: 'Seller not found' });
    const seller = sellerRes.rows[0];
    const subscription = seller.subscription || {};
    const shopPlan = subscription.plan || 'starter';
    const botPlan = subscription.botPlan || 'starter';
    const autoRenew = seller.auto_renew || {
      iyonicshop: { enabled: false, plan: shopPlan },
      iyonicbots: { enabled: false, plan: botPlan }
    };
    const wallet = await db.query('SELECT balance, currency FROM wallets WHERE user_id = $1', [req.user.id]);

    res.json({
      bundles: BUNDLES,
      addons: BILL_ADDONS,
      shopPlans: SELLER_PLANS,
      botPlans: IYONIC_BOT_PLANS,
      currentSubscription: {
        shopPlan,
        botPlan,
        endDate: subscription.endDate || null,
        autoRenewEnabled: {
          iyonicshop: autoRenew.iyonicshop?.enabled || false,
          iyonicbots: autoRenew.iyonicbots?.enabled || false
        }
      },
      wallet: wallet.rows[0] || { balance: 0, currency: 'USD' },
      discounts: {
        starter: { name: 'Starter', planIds: ['starter', 'basic'], basePrice: 0, discount: 0, finalPrice: 0 },
        growth: calculateBundleDiscount('basic', 'basic'),
        pro: calculateBundleDiscount('professional', 'pro'),
        enterprise: calculateBundleDiscount('enterprise', 'promax')
      }
    });
  } catch (err) {
    console.error('Unified billing fetch error:', err);
    res.status(500).json({ message: 'Could not load unified billing' });
  }
});

app.post('/api/billing/unified/subscribe', authenticateToken, async (req, res) => {
  const { bundleId, addons, shopPlan, botPlan } = req.body;
  const wallet = await db.query('SELECT id, balance, currency FROM wallets WHERE user_id = $1 FOR UPDATE', [req.user.id]);
  const sellerRes = await db.query('SELECT id, subscription FROM sellers WHERE user_id = $1 FOR UPDATE', [req.user.id]);
  if (sellerRes.rows.length === 0) return res.status(404).json({ message: 'Seller not found' });
  const sellerId = sellerRes.rows[0].id;
  const walletRow = wallet.rows[0];
  if (!walletRow) return res.status(402).json({ message: 'No wallet found' });

  let totalPrice = 0;
  let descriptionParts = [];

  if (bundleId && BUNDLES[bundleId]) {
    const bundle = BUNDLES[bundleId];
    const bundlePricing = calculateBundleDiscount(bundle.planIds[0], bundle.planIds[1]);
    totalPrice += bundlePricing.finalPrice;
    descriptionParts.push(bundle.name);
  } else {
    if (shopPlan && SELLER_PLANS[shopPlan]) {
      totalPrice += SELLER_PLANS[shopPlan].price;
      descriptionParts.push(`IyonicShop ${SELLER_PLANS[shopPlan].name}`);
    }
    if (botPlan && IYONIC_BOT_PLANS[botPlan]) {
      totalPrice += IYONIC_BOT_PLANS[botPlan].price;
      descriptionParts.push(`IyonicBots ${IYONIC_BOT_PLANS[botPlan].name}`);
    }
  }

  if (addons && Array.isArray(addons)) {
    for (const addonId of addons) {
      if (BILL_ADDONS[addonId]) {
        totalPrice += BILL_ADDONS[addonId].price;
        descriptionParts.push(BILL_ADDONS[addonId].name);
      }
    }
  }

  if (totalPrice <= 0) return res.status(400).json({ message: 'No paid items selected' });

  if (Number(walletRow.balance) < totalPrice) {
    return res.status(402).json({ message: `You need $${totalPrice.toFixed(2)} USD in your IyonicPay wallet to complete this purchase.` });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [totalPrice, walletRow.id]);
    await client.query(
      `INSERT INTO transactions (sender_wallet_id, amount, currency, type, status, description)
       VALUES ($1, $2, $3, 'invoice_payment', 'completed', $4)`,
      [walletRow.id, totalPrice, walletRow.currency || 'USD', descriptionParts.join(' + ')]
    );

    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const currentSub = sellerRes.rows[0].subscription || {};

    if (bundleId && BUNDLES[bundleId]) {
      const bundle = BUNDLES[bundleId];
      const plans = BUNDLES[bundleId].planIds;
      const shopP = plans[0];
      const botPl = plans[1];
      const nextSub = {
        ...currentSub,
        plan: shopP,
        botPlan: botPl,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: nextMonth.toISOString(),
        botPlanStartedAt: new Date().toISOString(),
        addons: addons || [],
        bundle: bundleId
      };
      await client.query('UPDATE sellers SET subscription = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [JSON.stringify(nextSub), sellerId]);
    } else {
      const nextSub = {
        ...currentSub,
        plan: shopPlan || currentSub.plan,
        botPlan: botPlan || currentSub.botPlan,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: shopPlan ? nextMonth.toISOString() : currentSub.endDate,
        botPlanStartedAt: botPlan ? new Date().toISOString() : currentSub.botPlanStartedAt,
        addons: [...(currentSub.addons || []), ...(addons || [])],
        bundle: null
      };
      await client.query('UPDATE sellers SET subscription = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [JSON.stringify(nextSub), sellerId]);
    }

    await client.query('COMMIT');
    res.json({ message: 'Subscription updated via IyonicPay wallet', totalAmount: totalPrice, description: descriptionParts.join(' + ') });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Unified subscription error:', err);
    res.status(500).json({ message: 'Could not process subscription' });
  } finally {
    client.release();
  }
});

app.delete('/api/billing/unified/cancel', authenticateToken, async (req, res) => {
  const { platform } = req.body;
  try {
    const sellerRes = await db.query('SELECT subscription, auto_renew FROM sellers WHERE user_id = $1', [req.user.id]);
    if (sellerRes.rows.length === 0) return res.status(404).json({ message: 'Seller not found' });
    const currentSub = sellerRes.rows[0].subscription || {};
    const currentAutoRenew = sellerRes.rows[0].auto_renew || {};

    let nextSub = { ...currentSub };

    if (platform === 'iyonicshop' || !platform) {
      nextSub = {
        ...nextSub,
        plan: 'starter',
        status: 'cancelled',
        endDate: null
      };
    }
    if (platform === 'iyonicbots' || !platform) {
      nextSub = {
        ...nextSub,
        botPlan: 'basic',
        botPlanStartedAt: null
      };
    }
    if (!platform) {
      nextSub = {
        ...nextSub,
        addons: [],
        bundle: null
      };
    }

    let nextAutoRenew = { ...currentAutoRenew };
    if (platform && nextAutoRenew[platform]) {
      nextAutoRenew[platform] = { ...nextAutoRenew[platform], enabled: false };
    }
    if (!platform) {
      nextAutoRenew = { iyonicshop: { enabled: false }, iyonicbots: { enabled: false } };
    }

    const cancelShop = platform === 'iyonicshop' || !platform;
    await db.query(`UPDATE sellers
      SET subscription = $1,
          auto_renew = $2,
          theme = CASE
            WHEN $4 AND theme->>'selectedTheme' = 'tamira-salon'
            THEN jsonb_set(COALESCE(theme, '{}'::jsonb), '{selectedTheme}', '"modern-wellness"'::jsonb, TRUE)
            ELSE theme
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $3`,
      [JSON.stringify(nextSub), JSON.stringify(nextAutoRenew), req.user.id, cancelShop]);

    res.json({ message: platform ? `${platform} subscription cancelled` : 'All subscriptions cancelled', subscription: nextSub });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    res.status(500).json({ message: 'Could not cancel subscription' });
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

// Get Seller by ID (Public)
app.get('/api/sellers/:id/public', async (req, res) => {
  try {
    const sellerRes = await db.query("SELECT id, store_name, subdomain, logo, theme, theme->>'selectedTheme' AS theme_id, shop_type, description, contact_info, currency FROM sellers WHERE id = $1", [req.params.id]);
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
      
      // Create wallet - get seller's currency if user is a seller
      const sellerRes = await client.query('SELECT currency FROM sellers WHERE user_id = $1', [userId]);
      const sellerCurrency = sellerRes.rows[0]?.currency || 'USD';
      
      await client.query(
        'INSERT INTO wallets (user_id, balance, currency) VALUES ($1, 0, $2) ON CONFLICT (user_id) DO UPDATE SET currency = $2 WHERE wallets.currency IS NULL',
        [userId, sellerCurrency]
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
        receiverUserRes.rows[0],
        'USD'
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

// --- Cheque Routes ---

// Issue a cheque
app.post('/api/iyonicpay/cheques/issue', authenticateToken, async (req, res) => {
  const { amount, pin, recipientEmail, expiryDays = 7, includePinInEmail = false } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Get issuer wallet
    const issuerRes = await client.query('SELECT u.id, u.name, u.email, w.id as wallet_id, w.balance FROM users u JOIN wallets w ON u.id = w.user_id WHERE u.id = $1', [req.user.id]);
    if (issuerRes.rows.length === 0) throw new Error('Wallet not found');
    const issuer = issuerRes.rows[0];

    if (parseFloat(issuer.balance) < parseFloat(amount)) {
      return res.status(400).json({ message: 'Insufficient funds in wallet' });
    }

    // Hash the PIN
    const salt = await bcrypt.genSalt(10);
    const pinHash = await bcrypt.hash(pin.toString(), salt);

    // Generate unique token
    const token = nanoid(12);

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays));

    // Deduct from wallet immediately (escrow)
    await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [amount, issuer.wallet_id]);

    // Create cheque
    const chequeRes = await client.query(
      'INSERT INTO cheques (issuer_id, recipient_email, amount, token, pin_hash, include_pin_in_email, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.id, recipientEmail, amount, token, pinHash, includePinInEmail, expiresAt]
    );

    // Record transaction
    await client.query(`
      INSERT INTO transactions (sender_wallet_id, amount, type, status, description) 
      VALUES ($1, $2, 'withdrawal', 'completed', $3)
    `, [issuer.wallet_id, amount, `Issued cheque ${token}`]);

    await client.query('COMMIT');
    const cheque = toCamel(chequeRes.rows[0]);

    // Send Emails
    await mailer.sendChequeIssuedEmail({
      issuer: { name: issuer.name, email: issuer.email },
      recipientEmail,
      amount,
      currency: cheque.currency,
      token,
      pin: pin.toString(),
      includePin: includePinInEmail
    });

    res.status(201).json(cheque);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Issue Cheque Error:', err);
    res.status(500).json({ message: 'Failed to issue cheque', error: err.message });
  } finally {
    client.release();
  }
});

// Get cheque details (Public-ish)
app.get('/api/iyonicpay/cheques/:token', async (req, res) => {
  try {
    const chequeRes = await db.query(`
      SELECT c.amount, c.status, c.expires_at, u.name as issuer_name 
      FROM cheques c 
      JOIN users u ON c.issuer_id = u.id 
      WHERE c.token = $1
    `, [req.params.token]);

    if (chequeRes.rows.length === 0) return res.status(404).json({ message: 'Cheque not found' });
    
    const cheque = chequeRes.rows[0];
    if (cheque.status !== 'issued') return res.status(400).json({ message: `Cheque is already ${cheque.status}` });
    if (new Date(cheque.expires_at) < new Date()) return res.status(400).json({ message: 'Cheque has expired' });

    res.json(toCamel(cheque));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Claim a cheque
app.post('/api/iyonicpay/cheques/:token/claim', authenticateToken, async (req, res) => {
  const { pin } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Get cheque
    const chequeRes = await client.query('SELECT * FROM cheques WHERE token = $1', [req.params.token]);
    if (chequeRes.rows.length === 0) return res.status(404).json({ message: 'Cheque not found' });
    const cheque = chequeRes.rows[0];

    if (cheque.status !== 'issued') return res.status(400).json({ message: `Cheque is already ${cheque.status}` });
    if (new Date(cheque.expires_at) < new Date()) return res.status(400).json({ message: 'Cheque has expired' });

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin.toString(), cheque.pin_hash);
    if (!isPinValid) return res.status(400).json({ message: 'Invalid PIN' });

    // Get claimer wallet
    const claimerWalletRes = await client.query('SELECT id FROM wallets WHERE user_id = $1', [req.user.id]);
    let claimerWalletId;
    
    if (claimerWalletRes.rows.length === 0) {
      // Auto-create wallet if user opted in but wallet missing (rare)
      const newWalletRes = await client.query('INSERT INTO wallets (user_id, balance) VALUES ($1, 0) RETURNING id', [req.user.id]);
      claimerWalletId = newWalletRes.rows[0].id;
    } else {
      claimerWalletId = claimerWalletRes.rows[0].id;
    }

    // Update cheque status
    await client.query(
      'UPDATE cheques SET status = \'claimed\', claimed_by = $1, claimed_at = CURRENT_TIMESTAMP WHERE id = $2',
      [req.user.id, cheque.id]
    );

    // Add to claimer wallet
    await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [cheque.amount, claimerWalletId]);

    // Record transaction
    await client.query(`
      INSERT INTO transactions (receiver_wallet_id, amount, type, status, description) 
      VALUES ($1, $2, 'receive', 'completed', $3)
    `, [claimerWalletId, cheque.amount, `Claimed cheque ${cheque.token}`]);

    // Get issuer and claimer info for email
    const infoRes = await client.query(`
      SELECT 
        u_issuer.name as issuer_name, u_issuer.email as issuer_email,
        u_claimer.name as claimer_name, u_claimer.email as claimer_email
      FROM cheques c
      JOIN users u_issuer ON c.issuer_id = u_issuer.id
      JOIN users u_claimer ON u_claimer.id = $1
      WHERE c.id = $2
    `, [req.user.id, cheque.id]);
    
    const info = infoRes.rows[0];

    await client.query('COMMIT');

    // Send Emails
    await mailer.sendChequeClaimedEmail({
      issuer: { name: info.issuer_name, email: info.issuer_email },
      claimer: { name: info.claimer_name, email: info.claimer_email },
      amount: cheque.amount,
      currency: cheque.currency,
      token: cheque.token
    });

    res.json({ message: 'Cheque claimed successfully', amount: cheque.amount });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Claim Cheque Error:', err);
    res.status(500).json({ message: 'Failed to claim cheque', error: err.message });
  } finally {
    client.release();
  }
});

// List user cheques
app.get('/api/iyonicpay/cheques', authenticateToken, async (req, res) => {
  try {
    const chequesRes = await db.query(
      'SELECT * FROM cheques WHERE issuer_id = $1 OR claimed_by = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(toCamel(chequesRes.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
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
          callback_url: `${process.env.FRONTEND_URL || 'http://localhost:4000'}/iyonicpay/callback`,
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
          userRes.rows[0],
          'USD'
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
          'SELECT s.store_name, s.currency, u.email, u.name as user_name FROM sellers s JOIN users u ON s.user_id = u.id WHERE s.id = $1', 
          [order.seller_id]
        );
        const sellerInfo = sellerInfoRes.rows[0];
        
        const sellerData = {
          name: sellerInfo?.user_name || 'Seller',
          email: sellerInfo?.email,
          storeName: sellerInfo?.store_name || 'Our Store',
          currency: sellerInfo?.currency || 'USD'
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
              'SELECT s.store_name, s.currency, u.email, u.name as user_name FROM sellers s JOIN users u ON s.user_id = u.id WHERE s.id = $1', 
              [order.seller_id]
            );
            const sellerInfo = sellerInfoRes.rows[0];
            
            const sellerData = {
              name: sellerInfo?.user_name || 'Seller',
              email: sellerInfo?.email,
              storeName: sellerInfo?.store_name || 'Our Store',
              currency: sellerInfo?.currency || 'USD'
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
          'SELECT u.email, u.name, s.store_name, s.currency FROM users u LEFT JOIN sellers s ON u.id = s.user_id WHERE u.id = $1',
          [invoice.user_id]
        );
        const sellerUser = sellerUserRes.rows[0];
        
        const invoiceSellerData = {
          name: sellerUser?.name || 'Seller',
          email: sellerUser?.email,
          storeName: sellerUser?.store_name || 'Our Store',
          currency: sellerUser?.currency || currency
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
  const { amount, bankDetails, currency } = req.body;
  const client = await db.pool.connect();
  try {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Please enter a valid amount greater than 0' });
    }
    const payoutMethod = bankDetails?.method || 'bank';
    const bankPayoutValid = bankDetails?.bankName?.trim() && bankDetails?.accountNo?.trim() && bankDetails?.accountName?.trim();
    const walletPayoutValid = bankDetails?.walletProvider?.trim() && bankDetails?.walletNumber?.trim() && bankDetails?.accountName?.trim();
    if (payoutMethod === 'mobile_wallet' ? !walletPayoutValid : !bankPayoutValid) {
      return res.status(400).json({ message: payoutMethod === 'mobile_wallet' ? 'Please provide the mobile wallet provider, wallet number, and account name' : 'Please provide the bank name, account number, and account name' });
    }
    await client.query('BEGIN');
    
    const walletRes = await client.query('SELECT id, balance, currency FROM wallets WHERE user_id = $1', [req.user.id]);
    const wallet = walletRes.rows[0];

    if (!wallet) {
      return res.status(400).json({ message: 'Wallet not found. Please opt-in to IyonicPay first.' });
    }

    const ratesToUSD = { USD: 1, KES: 125, EUR: 0.92, GBP: 0.79, NGN: 1500, GHS: 13 };
    const requestedCurrency = String(currency || wallet.currency || 'USD').toUpperCase();
    const walletCurrency = String(wallet.currency || 'USD').toUpperCase();
    const requestedAmount = parseFloat(amount);
    const walletAmount = requestedAmount / (ratesToUSD[requestedCurrency] || 1) * (ratesToUSD[walletCurrency] || 1);
    const walletBalance = parseFloat(wallet.balance || 0);
    if (walletBalance < walletAmount) {
      return res.status(400).json({ message: `Insufficient funds. Available balance: ${walletBalance.toFixed(2)} ${walletCurrency}` });
    }

    await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [walletAmount, wallet.id]);
    
    const withdrawalRes = await client.query(
      'INSERT INTO withdrawals (user_id, amount, bank_details, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, walletAmount, JSON.stringify({ ...bankDetails, requestedAmount, requestedCurrency, walletAmount, walletCurrency }), 'pending']
    );

    await client.query(`
      INSERT INTO transactions (sender_wallet_id, amount, currency, type, status, description) 
      VALUES ($1, $2, $3, 'withdrawal', 'pending', 'Withdrawal Request')
    `, [wallet.id, walletAmount, walletCurrency]);

    await client.query('COMMIT');

    // Send withdrawal emails
    const userRes = await db.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];
    const withdrawal = withdrawalRes.rows[0];
    const userCurrency = wallet.currency || 'USD';
    
    // To User
    mailer.sendWithdrawalNotification(withdrawal, user, false, userCurrency).catch(err => {
      console.error('Failed to send withdrawal notification to user:', err.message || err);
    });
    // To Admin
    mailer.sendWithdrawalNotification(withdrawal, user, true, userCurrency).catch(err => {
      console.error('Failed to send withdrawal notification to admin:', err.message || err);
    });

    res.status(201).json(toCamel(withdrawalRes.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Withdrawal error:', err);
    res.status(500).json({ message: err.message || 'Withdrawal failed' });
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

const requireNlmAdmin = async (req, res, next) => {
  if (req.user?.role === 'manager_admin') return next();
  if (req.user?.role !== 'seller' || !req.user.sellerId) {
    return res.status(403).json({ message: 'A seller account with the NLM Songs theme is required.' });
  }

  try {
    const seller = await db.query(`SELECT id FROM sellers
      WHERE id = $1 AND user_id = $2 AND theme->>'selectedTheme' = 'nlmsongs'`, [req.user.sellerId, req.user.id]);
    if (!seller.rows.length) {
      return res.status(403).json({ message: 'Apply the NLM Songs theme before managing its catalogue.' });
    }
    next();
  } catch (err) {
    console.error('NLMSongs permission check error:', err);
    res.status(500).json({ message: 'Could not verify NLM Songs access.' });
  }
};

const parseNlmTags = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value.split(',');
  }
};

const cleanNlmTags = (value) => [...new Set(parseNlmTags(value)
  .map((tag) => String(tag).trim().slice(0, 50))
  .filter(Boolean))].slice(0, 20);


app.get('/api/nlmsongs', async (req, res) => {
  try {
    const songs = await db.query(`SELECT id, title, artist, description, genre, tags, lyrics, audio_url, thumbnail_url, created_at
      FROM nlm_songs WHERE is_active = TRUE ORDER BY created_at DESC`);
    res.json(toCamel(songs.rows));
  } catch (err) {
    console.error('NLMSongs public catalogue error:', err);
    res.status(500).json({ message: 'Could not load the NLMSongs library.' });
  }
});

app.get('/api/nlmsongs/admin', authenticateToken, requireNlmAdmin, async (req, res) => {
  try {
    const songs = req.user.role === 'manager_admin'
      ? await db.query('SELECT id, title, artist, description, genre, tags, lyrics, audio_url, thumbnail_url, audio_mime_type, thumbnail_mime_type, is_active, created_by, created_at FROM nlm_songs ORDER BY created_at DESC')
      : await db.query('SELECT id, title, artist, description, genre, tags, lyrics, audio_url, thumbnail_url, audio_mime_type, thumbnail_mime_type, is_active, created_by, created_at FROM nlm_songs WHERE seller_id = $1 ORDER BY created_at DESC', [req.user.sellerId]);
    res.json(toCamel(songs.rows));
  } catch (err) {
    console.error('NLMSongs admin catalogue error:', err);
    res.status(500).json({ message: 'Could not load the NLMSongs catalogue.' });
  }
});

app.post('/api/nlmsongs', authenticateToken, requireNlmAdmin, handleNlmSongUpload, async (req, res) => {
  const audio = req.files?.audio?.[0];
  const thumbnail = req.files?.thumbnail?.[0];
  const title = String(req.body.title || '').trim();
  const artist = String(req.body.artist || '').trim();
  const description = String(req.body.description || '').trim();
  const genre = String(req.body.genre || '').trim();
  const lyrics = String(req.body.lyrics || '').trim();
  const tags = cleanNlmTags(req.body.tags);
  if (!title || !audio) {
    return res.status(400).json({ message: 'Track title and audio file are required.' });
  }
  const finalArtist = artist || 'NLM Studio';
  try {
    const result = await db.query(`INSERT INTO nlm_songs (seller_id, title, artist, description, genre, tags, lyrics, audio_url, audio_data, audio_mime_type, thumbnail_data, thumbnail_mime_type, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, '', $8, $9, $10, $11, $12, $13) RETURNING id, title, artist, description, genre, tags, lyrics, audio_url, thumbnail_url, audio_mime_type, thumbnail_mime_type, is_active, created_by, created_at`,
    [req.user.role === 'seller' ? req.user.sellerId : null, title.slice(0, 255), finalArtist.slice(0, 255), description, genre.slice(0, 100), tags, lyrics, audio.buffer, audio.mimetype, thumbnail ? thumbnail.buffer : null, thumbnail ? thumbnail.mimetype : null, req.body.isActive !== 'false', req.user.id === 'admin-id' ? null : req.user.id]);
    const trackId = result.rows[0].id;
    const audioUrl = `/api/nlmsongs/${trackId}/stream`;
    const thumbnailUrl = thumbnail ? `/api/nlmsongs/${trackId}/thumbnail-stream` : null;
    await db.query('UPDATE nlm_songs SET audio_url = $1, thumbnail_url = COALESCE($2, thumbnail_url) WHERE id = $3', [audioUrl, thumbnailUrl, trackId]);
    res.status(201).json(toCamel({ ...result.rows[0], audio_url: audioUrl, thumbnail_url: thumbnailUrl }));
  } catch (err) {
    console.error('NLMSongs create error:', err);
    res.status(500).json({ message: 'Could not publish this song.' });
  }
});

app.get('/api/nlmsongs/:id/stream', async (req, res) => {
  try {
    const result = await db.query('SELECT audio_data, audio_mime_type FROM nlm_songs WHERE id = $1 AND is_active = TRUE', [req.params.id]);
    if (!result.rows.length || !result.rows[0].audio_data) return res.status(404).json({ message: 'Track not found.' });
    const audioData = Buffer.isBuffer(result.rows[0].audio_data) ? result.rows[0].audio_data : Buffer.from(result.rows[0].audio_data);
    const mimeType = result.rows[0].audio_mime_type && result.rows[0].audio_mime_type !== 'application/octet-stream'
      ? result.rows[0].audio_mime_type
      : 'audio/mpeg';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', audioData.length);
    res.setHeader('Accept-Ranges', 'bytes');
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : audioData.length - 1;
      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${audioData.length}`);
      res.setHeader('Content-Length', chunkSize);
      res.end(audioData.slice(start, end + 1));
    } else {
      res.end(audioData);
    }
  } catch (err) {
    console.error('NLMSongs stream error:', err);
    res.status(500).json({ message: 'Could not stream this track.' });
  }
});

app.get('/api/nlmsongs/:id/thumbnail-stream', async (req, res) => {
  try {
    const result = await db.query('SELECT thumbnail_data, thumbnail_mime_type FROM nlm_songs WHERE id = $1 AND is_active = TRUE', [req.params.id]);
    if (!result.rows.length || !result.rows[0].thumbnail_data) return res.status(404).end();
    const { thumbnail_data, thumbnail_mime_type } = result.rows[0];
    const thumbMimeType = thumbnail_mime_type && thumbnail_mime_type !== 'application/octet-stream'
      ? thumbnail_mime_type
      : 'image/jpeg';
    res.setHeader('Content-Type', thumbMimeType);
    res.setHeader('Content-Length', thumbnail_data.length);
    res.end(thumbnail_data);
  } catch (err) {
    console.error('NLMSongs thumbnail error:', err);
    res.status(500).end();
  }
});

app.patch('/api/nlmsongs/:id', authenticateToken, requireNlmAdmin, handleNlmSongUpload, async (req, res) => {
  const audio = req.files?.audio?.[0];
  const thumbnail = req.files?.thumbnail?.[0];
  try {
    const current = req.user.role === 'manager_admin'
      ? await db.query('SELECT id, tags, audio_url, thumbnail_url FROM nlm_songs WHERE id = $1', [req.params.id])
      : await db.query('SELECT id, tags, audio_url, thumbnail_url FROM nlm_songs WHERE id = $1 AND seller_id = $2', [req.params.id, req.user.sellerId]);
    if (!current.rows.length) {
      return res.status(404).json({ message: 'Song not found.' });
    }
    const oldSong = current.rows[0];
    const trackId = oldSong.id;
    const nextTags = req.body.tags === undefined ? oldSong.tags : cleanNlmTags(req.body.tags);
    const audioUrl = audio ? `/api/nlmsongs/${trackId}/stream` : null;
    const thumbnailUrl = thumbnail ? `/api/nlmsongs/${trackId}/thumbnail-stream` : null;
    const result = await db.query(`UPDATE nlm_songs SET
      title = COALESCE($1, title), artist = COALESCE($2, artist), description = COALESCE($3, description),
      genre = COALESCE($4, genre), tags = COALESCE($5, tags), lyrics = COALESCE($6, lyrics),
      audio_url = COALESCE($7, audio_url), audio_data = COALESCE($8, audio_data), audio_mime_type = COALESCE($9, audio_mime_type),
      thumbnail_url = CASE WHEN $10::boolean THEN $11 ELSE thumbnail_url END,
      thumbnail_data = CASE WHEN $10::boolean THEN $12 ELSE thumbnail_data END,
      thumbnail_mime_type = CASE WHEN $10::boolean THEN $13 ELSE thumbnail_mime_type END,
      is_active = COALESCE($14, is_active), updated_at = CURRENT_TIMESTAMP
      WHERE id = $15 AND ($16::boolean OR seller_id = $17) RETURNING id, title, artist, description, genre, tags, lyrics, audio_url, thumbnail_url, audio_mime_type, thumbnail_mime_type, is_active, created_by, created_at`, [
      req.body.title === undefined ? null : String(req.body.title).trim().slice(0, 255),
      req.body.artist === undefined ? null : String(req.body.artist).trim().slice(0, 255),
      req.body.description === undefined ? null : String(req.body.description).trim(),
      req.body.genre === undefined ? null : String(req.body.genre).trim().slice(0, 100),
      req.body.tags === undefined ? null : nextTags,
      req.body.lyrics === undefined ? null : String(req.body.lyrics).trim(),
      audioUrl,
      audio ? audio.buffer : null,
      audio ? audio.mimetype : null,
      Boolean(req.body.removeThumbnail === 'true' || thumbnail),
      thumbnailUrl,
      thumbnail ? thumbnail.buffer : null,
      thumbnail ? thumbnail.mimetype : null,
      req.body.isActive === undefined ? null : req.body.isActive === 'true', req.params.id,
      req.user.role === 'manager_admin', req.user.sellerId || null
    ]);
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    console.error('NLMSongs update error:', err);
    res.status(500).json({ message: 'Could not update this song.' });
  }
});

app.delete('/api/nlmsongs/:id', authenticateToken, requireNlmAdmin, async (req, res) => {
  try {
    const result = req.user.role === 'manager_admin'
      ? await db.query('DELETE FROM nlm_songs WHERE id = $1', [req.params.id])
      : await db.query('DELETE FROM nlm_songs WHERE id = $1 AND seller_id = $2', [req.params.id, req.user.sellerId]);
    if (!result.rowCount) return res.status(404).json({ message: 'Song not found.' });
    res.json({ message: 'Song removed from the catalogue.' });
  } catch (err) {
    console.error('NLMSongs delete error:', err);
    res.status(500).json({ message: 'Could not remove this song.' });
  }
});

app.get('/api/nlmsongs/search', async (req, res) => {
  try {
    const query = req.query.q;
    const limit = parseInt(String(req.query.limit), 10) || 20;
    if (!query || typeof query !== 'string') return res.json([]);
    const result = await db.query(`SELECT id, title, artist, description, genre, tags, lyrics, audio_url, thumbnail_url, is_active, created_at FROM nlm_songs
      WHERE is_active = TRUE
      AND (title ILIKE $1 OR artist ILIKE $1 OR genre ILIKE $1 OR description ILIKE $1)
      ORDER BY created_at DESC LIMIT $2`, [`%${query}%`, limit]);
    res.json(toCamel(result.rows));
  } catch (err) {
    console.error('NLMSongs search error:', err);
    res.status(500).json({ message: 'Could not search the catalogue.' });
  }
});

const requireNlmUser = (req, res, next) => {
  if (req.user?.role === 'manager_admin') return next();
  if (req.user?.role === 'seller' || req.user?.role === 'seller_manager' || req.user?.role === 'customer') return next();
  return res.status(403).json({ message: 'Authentication required.' });
};

app.get('/api/nlmsongs/playlists', authenticateToken, requireNlmUser, async (req, res) => {
  try {
    const result = await db.query(`SELECT p.id, p.user_id as "userId", p.name, p.description, p.cover_url as "coverUrl", p.is_public as "isPublic", p.track_count as "trackCount", p.created_at as "createdAt", p.updated_at as "updatedAt"
      FROM nlm_playlists p WHERE p.user_id = $1 ORDER BY p.created_at DESC`, [req.user.id]);
    res.json(toCamel(result.rows));
  } catch (err) {
    console.error('NLM playlists list error:', err);
    res.status(500).json({ message: 'Could not load playlists.' });
  }
});

app.get('/api/nlmsongs/playlists/:id', authenticateToken, requireNlmUser, async (req, res) => {
  try {
    const result = await db.query(`SELECT p.id, p.user_id as "userId", p.name, p.description, p.cover_url as "coverUrl", p.is_public as "isPublic", p.track_count as "trackCount", p.created_at as "createdAt", p.updated_at as "updatedAt"
      FROM nlm_playlists p WHERE p.id = $1 AND p.user_id = $2`, [req.params.id, req.user.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Playlist not found.' });
    const playlist = result.rows[0];
    const items = await db.query(`SELECT pi.id, pi.playlist_id as "playlistId", pi.track_id as "trackId", pi.position, pi.added_at as "addedAt"
      FROM nlm_playlist_items pi WHERE pi.playlist_id = $1 ORDER BY pi.position`, [req.params.id]);
    playlist.items = toCamel(items.rows);
    res.json(toCamel(playlist));
  } catch (err) {
    console.error('NLM playlist get error:', err);
    res.status(500).json({ message: 'Could not load playlist.' });
  }
});

app.post('/api/nlmsongs/playlists', authenticateToken, requireNlmUser, async (req, res) => {
  try {
    const { name, description = '', isPublic = false } = req.body;
    const result = await db.query(`INSERT INTO nlm_playlists (user_id, seller_id, name, description, is_public)
      VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id as "userId", name, description, cover_url as "coverUrl", is_public as "isPublic", track_count as "trackCount", created_at as "createdAt", updated_at as "updatedAt"`,
      [req.user.id, req.user.sellerId || null, name, description, isPublic]);
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error('NLM playlist create error:', err);
    res.status(500).json({ message: 'Could not create playlist.' });
  }
});

app.patch('/api/nlmsongs/playlists/:id', authenticateToken, requireNlmUser, async (req, res) => {
  try {
    const { name, description, isPublic, coverUrl } = req.body;
    const updates = [];
    const values = [];
    let i = 1;
    if (name !== undefined) { updates.push(`name = $${i++}`); values.push(name); }
    if (description !== undefined) { updates.push(`description = $${i++}`); values.push(description); }
    if (isPublic !== undefined) { updates.push(`is_public = $${i++}`); values.push(isPublic); }
    if (coverUrl !== undefined) { updates.push(`cover_url = $${i++}`); values.push(coverUrl); }
    if (updates.length === 0) return res.json({ message: 'No changes.' });
    values.push(req.params.id, req.user.id);
    const result = await db.query(`UPDATE nlm_playlists SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${i++} AND user_id = $${i++} RETURNING id, user_id as "userId", name, description, cover_url as "coverUrl", is_public as "isPublic", track_count as "trackCount", created_at as "createdAt", updated_at as "updatedAt"`, values);
    if (!result.rows.length) return res.status(404).json({ message: 'Playlist not found.' });
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    console.error('NLM playlist update error:', err);
    res.status(500).json({ message: 'Could not update playlist.' });
  }
});

app.delete('/api/nlmsongs/playlists/:id', authenticateToken, requireNlmUser, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM nlm_playlists WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!result.rowCount) return res.status(404).json({ message: 'Playlist not found.' });
    res.json({ message: 'Playlist removed.' });
  } catch (err) {
    console.error('NLM playlist delete error:', err);
    res.status(500).json({ message: 'Could not remove playlist.' });
  }
});

app.post('/api/nlmsongs/playlists/:id/tracks', authenticateToken, requireNlmUser, async (req, res) => {
  try {
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ message: 'trackId is required.' });
    const check = await db.query('SELECT 1 FROM nlm_songs WHERE id = $1', [trackId]);
    if (!check.rows.length) return res.status(404).json({ message: 'Track not found.' });
    const ownership = await db.query('SELECT 1 FROM nlm_playlists WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!ownership.rows.length) return res.status(404).json({ message: 'Playlist not found.' });
    const posResult = await db.query('SELECT COALESCE(MAX(position), 0) + 1 as pos FROM nlm_playlist_items WHERE playlist_id = $1', [req.params.id]);
    const position = posResult.rows[0].pos;
    await db.query('INSERT INTO nlm_playlist_items (playlist_id, track_id, position) VALUES ($1, $2, $3)', [req.params.id, trackId, position]);
    await db.query('UPDATE nlm_playlists SET track_count = track_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);
    res.status(201).json({ message: 'Track added to playlist.' });
  } catch (err) {
    console.error('NLM playlist add track error:', err);
    res.status(500).json({ message: 'Could not add track to playlist.' });
  }
});

app.delete('/api/nlmsongs/playlists/:id/tracks/:trackId', authenticateToken, requireNlmUser, async (req, res) => {
  try {
    await db.query('DELETE FROM nlm_playlist_items WHERE playlist_id = $1 AND track_id = $2', [req.params.id, req.params.trackId]);
    await db.query('UPDATE nlm_playlists SET track_count = GREATEST(track_count - 1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);
    res.json({ message: 'Track removed from playlist.' });
  } catch (err) {
    console.error('NLM playlist remove track error:', err);
    res.status(500).json({ message: 'Could not remove track from playlist.' });
  }
});

app.patch('/api/nlmsongs/playlists/:id/reorder', authenticateToken, requireNlmUser, async (req, res) => {
  try {
    const { trackIds } = req.body;
    if (!Array.isArray(trackIds)) return res.status(400).json({ message: 'trackIds must be an array.' });
    const ownership = await db.query('SELECT 1 FROM nlm_playlists WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!ownership.rows.length) return res.status(404).json({ message: 'Playlist not found.' });
    for (let i = 0; i < trackIds.length; i++) {
      await db.query('UPDATE nlm_playlist_items SET position = $1 WHERE playlist_id = $2 AND track_id = $3', [i, req.params.id, trackIds[i]]);
    }
    res.json({ message: 'Playlist reordered.' });
  } catch (err) {
    console.error('NLM playlist reorder error:', err);
    res.status(500).json({ message: 'Could not reorder playlist.' });
  }
});

app.get('/api/nlmsongs/history', authenticateToken, requireNlmUser, async (req, res) => {
  try {
    const limit = parseInt(String(req.query.limit), 10) || 50;
    const result = await db.query(`SELECT h.id, h.user_id as "userId", h.seller_id as "sellerId", h.track_id as "trackId", h.played_seconds as "playedSeconds", h.duration, h.created_at as "createdAt"
      FROM nlm_listening_history h WHERE h.user_id = $1 ORDER BY h.created_at DESC LIMIT $2`, [req.user.id, limit]);
    const history = toCamel(result.rows);
    const trackIds = history.map((h) => h.trackId);
    if (trackIds.length) {
      const tracksResult = await db.query(`SELECT id, title, artist, description, genre, tags, lyrics, audio_url as "audioUrl", thumbnail_url as "thumbnailUrl", is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt" FROM nlm_songs WHERE id = ANY($1)`, [trackIds]);
      const tracksById = Object.fromEntries(tracksResult.rows.map((t) => [t.id, toCamel(t)]));
      history.forEach((h) => { h.track = tracksById[h.trackId] || null; });
    }
    res.json(history);
  } catch (err) {
    console.error('NLM history error:', err);
    res.status(500).json({ message: 'Could not load history.' });
  }
});

app.post('/api/nlmsongs/history', authenticateToken, requireNlmUser, async (req, res) => {
  try {
    const { trackId, playedSeconds, duration } = req.body;
    if (!trackId) return res.status(400).json({ message: 'trackId is required.' });
    const trackCheck = await db.query('SELECT seller_id FROM nlm_songs WHERE id = $1', [trackId]);
    const sellerId = trackCheck.rows[0]?.seller_id || req.user.sellerId || null;
    await db.query(`INSERT INTO nlm_listening_history (user_id, seller_id, track_id, played_seconds, duration)
      VALUES ($1, $2, $3, $4, $5)`, [req.user.id, sellerId, trackId, playedSeconds || 0, duration || 0]);

    const today = new Date().toISOString().split('T')[0];
    const existing = await db.query('SELECT id FROM nlm_play_counts WHERE user_id = $1 AND track_id = $2 AND play_date = $3', [req.user.id, trackId, today]);
    if (existing.rows.length) {
      await db.query('UPDATE nlm_play_counts SET count = count + 1 WHERE id = $1', [existing.rows[0].id]);
    } else {
      await db.query('INSERT INTO nlm_play_counts (user_id, seller_id, track_id, play_date, count) VALUES ($1, $2, $3, $4, 1)', [req.user.id, sellerId, trackId, today]);
    }
    res.status(201).json({ message: 'Play recorded.' });
  } catch (err) {
    console.error('NLM history record error:', err);
    res.status(500).json({ message: 'Could not record play.' });
  }
});

app.delete('/api/nlmsongs/history', authenticateToken, requireNlmUser, async (req, res) => {
  try {
    await db.query('DELETE FROM nlm_listening_history WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'History cleared.' });
  } catch (err) {
    console.error('NLM history clear error:', err);
    res.status(500).json({ message: 'Could not clear history.' });
  }
});

app.get('/api/nlmsongs/history/playcounts', authenticateToken, requireNlmUser, async (req, res) => {
  try {
    const { trackId } = req.query;
    if (trackId) {
      const result = await db.query(`SELECT pc.id, pc.user_id as "userId", pc.seller_id as "sellerId", pc.track_id as "trackId", pc.play_date as "playDate", pc.count, pc.created_at as "createdAt"
        FROM nlm_play_counts pc WHERE pc.user_id = $1 AND pc.track_id = $2 ORDER BY pc.play_date DESC`, [req.user.id, trackId]);
      res.json(toCamel(result.rows));
    } else {
      const result = await db.query(`SELECT pc.id, pc.user_id as "userId", pc.seller_id as "sellerId", pc.track_id as "trackId", pc.play_date as "playDate", pc.count, pc.created_at as "createdAt"
        FROM nlm_play_counts pc WHERE pc.user_id = $1 ORDER BY pc.play_date DESC`, [req.user.id]);
      res.json(toCamel(result.rows));
    }
  } catch (err) {
    console.error('NLM playcounts error:', err);
    res.status(500).json({ message: 'Could not load play counts.' });
  }
});

// --- IxStream API Routes ---

app.get('/api/ixstream/content', async (req, res) => {
  try {
    const query = req.query;
    const typeFilter = query.type;
    const searchFilter = query.search ? `AND (title ILIKE '%${String(query.search).replace(/'/g, "''")}%' OR description ILIKE '%${String(query.search).replace(/'/g, "''")}%' OR genre ILIKE '%${String(query.search).replace(/'/g, "''")}%')` : '';
    const genreFilter = query.genre ? `AND genre = '${String(query.genre).replace(/'/g, "''")}'` : '';
    const songsResult = await db.query(`SELECT id, seller_id, title, description, type, genre, tags, release_year, duration, rating, thumbnail_url, video_url, is_active, created_at, updated_at
      FROM ixstream_content WHERE is_active = TRUE ${genreFilter} ${searchFilter} ${typeFilter ? `AND type = '${typeFilter}'` : ''} ORDER BY created_at DESC`);
    res.json(toCamel(songsResult.rows));
  } catch (err) {
    console.error('IxStream public catalogue error:', err);
    res.status(500).json({ message: 'Could not load the IxStream catalogue.' });
  }
});

app.get('/api/ixstream/content/admin', authenticateToken, requireIxsAdmin, async (req, res) => {
  try {
    const typeFilter = req.query.type;
    const result = req.user.role === 'manager_admin'
      ? await db.query(`SELECT * FROM ixstream_content ORDER BY created_at DESC${typeFilter ? " WHERE type = '" + typeFilter + "'" : ""}`)
      : await db.query(`SELECT * FROM ixstream_content WHERE seller_id = $1 ORDER BY created_at DESC${typeFilter ? " AND type = '" + typeFilter + "'" : ""}`, [req.user.sellerId]);
    res.json(toCamel(result.rows));
  } catch (err) {
    console.error('IxStream admin catalogue error:', err);
    res.status(500).json({ message: 'Could not load the IxStream catalogue.' });
  }
});

app.get('/api/ixstream/content/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM ixstream_content WHERE id = $1 AND is_active = TRUE', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Title not found.' });
    const content = toCamel(result.rows[0]);
    if (content.type === 'tvshow') {
      const seasonsResult = await db.query('SELECT * FROM ixstream_seasons WHERE content_id = $1 ORDER BY season_number', [req.params.id]);
      content.seasons = toCamel(seasonsResult.rows);
    }
    res.json(content);
  } catch (err) {
    console.error('IxStream get error:', err);
    res.status(500).json({ message: 'Could not load this title.' });
  }
});

app.post('/api/ixstream/content', authenticateToken, requireIxsAdmin, handleIxsUpload, async (req, res) => {
  const video = req.files?.video?.[0];
  const thumbnail = req.files?.thumbnail?.[0];
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  const contentType = String(req.body.type || 'movie').trim();
  const genre = String(req.body.genre || '').trim();
  const tags = (Array.isArray(req.body.tags) ? req.body.tags : String(req.body.tags || '').split(',').filter((t) => t.trim())).map((t) => String(t).trim()).filter(Boolean);
  const releaseYear = req.body.releaseYear ? parseInt(req.body.releaseYear) : null;
  const duration = req.body.duration ? parseInt(req.body.duration) : null;
  const rating = req.body.rating ? parseFloat(req.body.rating) : null;
  if (!title || !video || !['movie', 'tvshow'].includes(contentType)) {
    await removeIxsFiles([ixsFileUrl(video), ixsFileUrl(thumbnail)]);
    return res.status(400).json({ message: 'Title, video file, and a valid type (movie or tvshow) are required.' });
  }
  try {
    const result = await db.query(`INSERT INTO ixstream_content (seller_id, title, description, type, genre, tags, release_year, duration, rating, video_url, thumbnail_url, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
    [req.user.role === 'seller' ? req.user.sellerId : null, title.slice(0, 255), description, contentType, genre.slice(0, 100), tags, releaseYear, duration, rating, ixsFileUrl(video), ixsFileUrl(thumbnail), req.body.isActive !== 'false', req.user.id]);
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    await removeIxsFiles([ixsFileUrl(video), ixsFileUrl(thumbnail)]);
    console.error('IxStream create error:', err);
    res.status(500).json({ message: 'Could not publish this title.' });
  }
});

app.patch('/api/ixstream/content/:id', authenticateToken, requireIxsAdmin, handleIxsUpload, async (req, res) => {
  const video = req.files?.video?.[0];
  const thumbnail = req.files?.thumbnail?.[0];
  try {
    const current = req.user.role === 'manager_admin'
      ? await db.query('SELECT * FROM ixstream_content WHERE id = $1', [req.params.id])
      : await db.query('SELECT * FROM ixstream_content WHERE id = $1 AND seller_id = $2', [req.params.id, req.user.sellerId]);
    if (!current.rows.length) {
      await removeIxsFiles([ixsFileUrl(video), ixsFileUrl(thumbnail)]);
      return res.status(404).json({ message: 'Title not found.' });
    }
    const old = current.rows[0];
    const result = await db.query(`UPDATE ixstream_content SET
      title = COALESCE($1, title), description = COALESCE($2, description), type = COALESCE($3, type),
      genre = COALESCE($4, genre), tags = COALESCE($5, tags), release_year = COALESCE($6, release_year),
      duration = COALESCE($7, duration), rating = COALESCE($8, rating),
      video_url = COALESCE($9, video_url), thumbnail_url = CASE WHEN $10::boolean THEN $11 ELSE thumbnail_url END,
      is_active = COALESCE($12, is_active), updated_at = CURRENT_TIMESTAMP
      WHERE id = $13 AND ($14::boolean OR seller_id = $15) RETURNING *`,
    [
      req.body.title === undefined ? null : String(req.body.title).trim().slice(0, 255),
      req.body.description === undefined ? null : String(req.body.description).trim(),
      req.body.type === undefined ? null : String(req.body.type),
      req.body.genre === undefined ? null : String(req.body.genre).trim().slice(0, 100),
      req.body.tags === undefined ? null : (Array.isArray(req.body.tags) ? req.body.tags : String(req.body.tags).split(',').filter((t) => t.trim())),
      req.body.releaseYear === undefined ? null : parseInt(req.body.releaseYear),
      req.body.duration === undefined ? null : parseInt(req.body.duration),
      req.body.rating === undefined ? null : parseFloat(req.body.rating),
      ixsFileUrl(video),
      Boolean(req.body.removeThumbnail === 'true' || thumbnail),
      req.body.removeThumbnail === 'true' ? null : ixsFileUrl(thumbnail),
      req.body.isActive === undefined ? null : req.body.isActive === 'true',
      req.params.id,
      req.user.role === 'manager_admin', req.user.sellerId || null
    ]);
    await removeIxsFiles([video ? old.video_url : null, (thumbnail || req.body.removeThumbnail === 'true') ? old.thumbnail_url : null]);
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    await removeIxsFiles([ixsFileUrl(video), ixsFileUrl(thumbnail)]);
    console.error('IxStream update error:', err);
    res.status(500).json({ message: 'Could not update this title.' });
  }
});

app.delete('/api/ixstream/content/:id', authenticateToken, requireIxsAdmin, async (req, res) => {
  try {
    const result = req.user.role === 'manager_admin'
      ? await db.query('DELETE FROM ixstream_content WHERE id = $1 RETURNING video_url, thumbnail_url', [req.params.id])
      : await db.query('DELETE FROM ixstream_content WHERE id = $1 AND seller_id = $2 RETURNING video_url, thumbnail_url', [req.params.id, req.user.sellerId]);
    if (!result.rows.length) return res.status(404).json({ message: 'Title not found.' });
    await removeIxsFiles([result.rows[0].video_url, result.rows[0].thumbnail_url]);
    res.json({ message: 'Title removed from the catalogue.' });
  } catch (err) {
    console.error('IxStream delete error:', err);
    res.status(500).json({ message: 'Could not remove this title.' });
  }
});

app.get('/api/ixstream/content/:contentId/seasons', async (req, res) => {
  try {
    const seasons = await db.query('SELECT * FROM ixstream_seasons WHERE content_id = $1 ORDER BY season_number', [req.params.contentId]);
    res.json(toCamel(seasons.rows));
  } catch (err) {
    console.error('IxStream seasons error:', err);
    res.status(500).json({ message: 'Could not load seasons.' });
  }
});

app.post('/api/ixstream/content/:contentId/seasons', authenticateToken, requireIxsAdmin, async (req, res) => {
  const { seasonNumber, title, description } = req.body;
  try {
    const result = await db.query('INSERT INTO ixstream_seasons (content_id, season_number, title, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.contentId, seasonNumber, title || null, description || '']);
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error('IxStream create season error:', err);
    res.status(500).json({ message: 'Could not create season.' });
  }
});

app.get('/api/ixstream/seasons/:seasonId/episodes', async (req, res) => {
  try {
    const episodes = await db.query('SELECT * FROM ixstream_episodes WHERE season_id = $1 ORDER BY episode_number', [req.params.seasonId]);
    res.json(toCamel(episodes.rows));
  } catch (err) {
    console.error('IxStream episodes error:', err);
    res.status(500).json({ message: 'Could not load episodes.' });
  }
});

app.post('/api/ixstream/episodes', authenticateToken, requireIxsAdmin, handleIxsUpload, async (req, res) => {
  const video = req.files?.video?.[0];
  const thumbnail = req.files?.thumbnail?.[0];
  const { seasonId, episodeNumber, title, description, duration } = req.body;
  if (!seasonId || !episodeNumber || !title || !video) {
    await removeIxsFiles([ixsFileUrl(video), ixsFileUrl(thumbnail)]);
    return res.status(400).json({ message: 'Season, episode number, title, and video are required.' });
  }
  try {
    const result = await db.query(`INSERT INTO ixstream_episodes (season_id, episode_number, title, description, duration, video_url, thumbnail_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [seasonId, parseInt(episodeNumber), title.slice(0, 255), description || '', duration ? parseInt(duration) : null, ixsFileUrl(video), ixsFileUrl(thumbnail)]);
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    await removeIxsFiles([ixsFileUrl(video), ixsFileUrl(thumbnail)]);
    console.error('IxStream create episode error:', err);
    res.status(500).json({ message: 'Could not create episode.' });
  }
});

app.patch('/api/ixstream/episodes/:id', authenticateToken, requireIxsAdmin, handleIxsUpload, async (req, res) => {
  const video = req.files?.video?.[0];
  const thumbnail = req.files?.thumbnail?.[0];
  try {
    const current = await db.query('SELECT * FROM ixstream_episodes WHERE id = $1', [req.params.id]);
    if (!current.rows.length) {
      await removeIxsFiles([ixsFileUrl(video), ixsFileUrl(thumbnail)]);
      return res.status(404).json({ message: 'Episode not found.' });
    }
    const old = current.rows[0];
    const result = await db.query(`UPDATE ixstream_episodes SET
      episode_number = COALESCE($1, episode_number), title = COALESCE($2, title),
      description = COALESCE($3, description), duration = COALESCE($4, duration),
      video_url = COALESCE($5, video_url), thumbnail_url = CASE WHEN $6::boolean THEN $7 ELSE thumbnail_url END, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 RETURNING *`,
    [
      req.body.episodeNumber === undefined ? null : parseInt(req.body.episodeNumber),
      req.body.title === undefined ? null : String(req.body.title).trim().slice(0, 255),
      req.body.description === undefined ? null : String(req.body.description).trim(),
      req.body.duration === undefined ? null : parseInt(req.body.duration),
      ixsFileUrl(video),
      Boolean(req.body.removeThumbnail === 'true' || thumbnail),
      req.body.removeThumbnail === 'true' ? null : ixsFileUrl(thumbnail),
      req.params.id
    ]);
    await removeIxsFiles([video ? old.video_url : null, (thumbnail || req.body.removeThumbnail === 'true') ? old.thumbnail_url : null]);
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    await removeIxsFiles([ixsFileUrl(video), ixsFileUrl(thumbnail)]);
    console.error('IxStream update episode error:', err);
    res.status(500).json({ message: 'Could not update episode.' });
  }
});

app.delete('/api/ixstream/episodes/:id', authenticateToken, requireIxsAdmin, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM ixstream_episodes WHERE id = $1 RETURNING video_url, thumbnail_url', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Episode not found.' });
    await removeIxsFiles([result.rows[0].video_url, result.rows[0].thumbnail_url]);
    res.json({ message: 'Episode removed.' });
  } catch (err) {
    console.error('IxStream delete episode error:', err);
    res.status(500).json({ message: 'Could not remove this episode.' });
  }
});

app.get('/api/ixstream/plans', async (req, res) => {
  try {
    const plans = await db.query('SELECT * FROM ixstream_subscription_plans WHERE is_active = TRUE ORDER BY sort_order, created_at');
    res.json(toCamel(plans.rows));
  } catch (err) {
    console.error('IxStream plans error:', err);
    res.status(500).json({ message: 'Could not load plans.' });
  }
});

app.post('/api/ixstream/plans', authenticateToken, requireIxsAdmin, async (req, res) => {
  const { name, description, priceCents, currency, intervalType, intervalCount, features } = req.body;
  try {
    const result = await db.query(`INSERT INTO ixstream_subscription_plans (seller_id, name, description, price_cents, currency, interval_type, interval_count, features)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [req.user.role === 'seller' ? req.user.sellerId : null, name, description || '', priceCents, currency || 'USD', intervalType, intervalCount, features || []]);
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error('IxStream create plan error:', err);
    res.status(500).json({ message: 'Could not create plan.' });
  }
});

app.patch('/api/ixstream/plans/:id', authenticateToken, requireIxsAdmin, async (req, res) => {
  const { name, description, priceCents, currency, intervalType, intervalCount, features, isActive } = req.body;
  try {
    const result = await db.query(`UPDATE ixstream_subscription_plans SET
      name = COALESCE($1, name), description = COALESCE($2, description), price_cents = COALESCE($3, price_cents),
      currency = COALESCE($4, currency), interval_type = COALESCE($5, interval_type), interval_count = COALESCE($6, interval_count),
      features = COALESCE($7, features), is_active = COALESCE($8, is_active), updated_at = CURRENT_TIMESTAMP WHERE id = $9 RETURNING *`,
    [name, description, priceCents, currency, intervalType, intervalCount, features, isActive, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Plan not found.' });
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    console.error('IxStream update plan error:', err);
    res.status(500).json({ message: 'Could not update plan.' });
  }
});

app.delete('/api/ixstream/plans/:id', authenticateToken, requireIxsAdmin, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM ixstream_subscription_plans WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Plan not found.' });
    res.json({ message: 'Plan deleted.' });
  } catch (err) {
    console.error('IxStream delete plan error:', err);
    res.status(500).json({ message: 'Could not delete plan.' });
  }
});

app.get('/api/ixstream/subscriptions', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`SELECT s.*, p.name as plan_name, p.description as plan_description, p.price_cents, p.currency, p.interval_type, p.interval_count, p.features
      FROM ixstream_subscriptions s JOIN ixstream_subscription_plans p ON s.plan_id = p.id
      WHERE s.user_id = $1 ORDER BY s.created_at DESC`, [req.user.id]);
    res.json(toCamel(result.rows));
  } catch (err) {
    console.error('IxStream subscriptions error:', err);
    res.status(500).json({ message: 'Could not load subscriptions.' });
  }
});

app.post('/api/ixstream/subscriptions', authenticateToken, async (req, res) => {
  const { planId } = req.body;
  if (!planId) return res.status(400).json({ message: 'A plan ID is required.' });
  try {
    const planResult = await db.query('SELECT * FROM ixstream_subscription_plans WHERE id = $1 AND is_active = TRUE', [planId]);
    if (!planResult.rows.length) return res.status(404).json({ message: 'Plan not found.' });
    const plan = planResult.rows[0];
    const now = new Date();
    const periodEnd = new Date(now);
    if (plan.interval_type === 'day') periodEnd.setDate(periodEnd.getDate() + plan.interval_count);
    else if (plan.interval_type === 'week') periodEnd.setDate(periodEnd.getDate() + (plan.interval_count * 7));
    else if (plan.interval_type === 'month') periodEnd.setMonth(periodEnd.getMonth() + plan.interval_count);
    else if (plan.interval_type === 'year') periodEnd.setFullYear(periodEnd.getFullYear() + plan.interval_count);
    const result = await db.query(`INSERT INTO ixstream_subscriptions (user_id, seller_id, plan_id, status, current_period_start, current_period_end)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [req.user.id, plan.seller_id, plan.id, 'incomplete', now, periodEnd]);
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error('IxStream create subscription error:', err);
    res.status(500).json({ message: 'Could not subscribe.' });
  }
});

app.patch('/api/ixstream/subscriptions/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('UPDATE ixstream_subscriptions SET status = CASE WHEN current_period_end <= CURRENT_TIMESTAMP THEN \'canceled\' ELSE \'canceled\' END, cancel_at_period_end = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Subscription not found.' });
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    console.error('IxStream cancel subscription error:', err);
    res.status(500).json({ message: 'Could not cancel subscription.' });
  }
});

app.post('/api/ixstream/subscriptions/paystack/initialize', authenticateToken, async (req, res) => {
  const { planId } = req.body;
  if (!planId) return res.status(400).json({ message: 'A plan ID is required.' });
  try {
    const planResult = await db.query('SELECT * FROM ixstream_subscription_plans WHERE id = $1', [planId]);
    if (!planResult.rows.length) return res.status(404).json({ message: 'Plan not found.' });
    const plan = planResult.rows[0];
    const reference = `ixs-sub-${nanoid(12)}`;
    const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY);
    const response = await paystack.transaction.initialize({
      amount: plan.price_cents,
      currency: plan.currency,
      email: req.user.email,
      reference,
      callback_url: `${req.protocol}://${req.get('host')}/ixstream`,
    });
    res.json({ authorizationUrl: response.data.authorization_url, reference });
  } catch (err) {
    console.error('IxStream paystack init error:', err);
    res.status(500).json({ message: 'Could not initialize payment.' });
  }
});

app.post('/api/ixstream/subscriptions/paystack/verify', authenticateToken, async (req, res) => {
  const { reference } = req.body;
  if (!reference) return res.status(400).json({ message: 'Reference is required.' });
  try {
    const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY);
    const response = await paystack.transaction.verify({ reference });
    if (response.data.status === 'success') {
      const planResult = await db.query('SELECT * FROM ixstream_subscription_plans WHERE price_cents = $1 AND currency = $2', [response.data.amount / 100, response.data.currency]);
      if (planResult.rows.length > 0) {
        const plan = planResult.rows[0];
        const now = new Date();
        const periodEnd = new Date(now);
        if (plan.interval_type === 'month') periodEnd.setMonth(periodEnd.getMonth() + plan.interval_count);
        else if (plan.interval_type === 'year') periodEnd.setFullYear(periodEnd.getFullYear() + plan.interval_count);
        const subResult = await db.query(`INSERT INTO ixstream_subscriptions (user_id, seller_id, plan_id, status, current_period_start, current_period_end, payment_reference)
          VALUES ($1, $2, $3, 'active', $4, $5, $6) RETURNING *`,
        [req.user.id, plan.seller_id, plan.id, now, periodEnd, reference]);
        return res.json({ success: true, subscription: toCamel(subResult.rows[0]) });
      }
    }
    res.json({ success: false, subscription: null });
  } catch (err) {
    console.error('IxStream paystack verify error:', err);
    res.status(500).json({ message: 'Could not verify payment.' });
  }
});

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

app.get('/api/orders/my', authenticateToken, async (req, res) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ message: 'Customer access required' });
  }

  try {
    const ordersRes = await db.query(
      `SELECT o.* FROM orders o
       WHERE EXISTS (
         SELECT 1 FROM customers c
         WHERE c.id = o.customer_id AND c.user_id = $1
       )
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(toCamel(ordersRes.rows));
  } catch (err) {
    console.error('Fetch Customer Orders Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

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
  const { sellerId, customerId, customerName, customerEmail, customerPhone, items, total, subtotal, originalTotal, discount, currency: bodyCurrency, shippingAddress, paymentMethod, deliveryFee, deliveryLocation, paymentType, amountPaid, remainingBalance } = req.body;
  const client = await db.pool.connect();
  try {
    // Get seller's default currency and store name
    const sellerInfoRes = await db.query('SELECT currency, store_name FROM sellers WHERE id = $1', [sellerId]);
    const currency = bodyCurrency || sellerInfoRes.rows[0]?.currency || 'USD';
    const storeName = sellerInfoRes.rows[0]?.store_name || 'Our Store';
    const orderTotal = Math.max(0, Number(total) || 0);
    const paidAmount = paymentType === 'deposit'
      ? Math.min(orderTotal, Math.max(0, Number(amountPaid) || 0))
      : paymentType === 'pod' ? 0 : orderTotal;
    const balanceDue = paymentType === 'deposit'
      ? Math.max(0, Math.round((orderTotal - paidAmount) * 100) / 100)
      : 0;
    
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
      `INSERT INTO orders (seller_id, customer_id, customer_name, customer_email, items, total, subtotal, original_total, discount, currency, status, shipping_address, delivery_fee, delivery_location, amount_paid, remaining_balance, payment_type) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12, $13, $14, $15, $16) RETURNING *`,
      [sellerId, finalCustomerId, customerName, customerEmail, JSON.stringify(items), orderTotal, subtotal, originalTotal, JSON.stringify(discount), currency, JSON.stringify(shippingAddress), deliveryFee, deliveryLocation, paidAmount, balanceDue, paymentType || 'site']
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
               amount: Math.round((amountPaid || total) * 100),
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
        [sellerUserId, order.id, amountPaid || total, `Payment for Order #${order.id}`, linkToken]
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
            amount: Math.round((amountPaid || total) * 100), // in kobo/cents
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
          if (adminRes.rows.length > 0) {
            const adminId = adminRes.rows[0].id;
            
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
        }

        if (sellerFull?.manager_id) {
          const managerRes = await client.query('SELECT user_id, commission_rate, pricing_config FROM seller_managers WHERE id = $1', [sellerFull.manager_id]);
          if (managerRes.rows.length > 0) {
            const manager = managerRes.rows[0];
            const commissionRate = parseFloat(manager.commission_rate || 0);

            // Manager's subscription is stored in pricing_config with plan field
            let managerSubscription = {};
            try {
              managerSubscription = typeof manager.pricing_config === 'object' ? manager.pricing_config : JSON.parse(manager.pricing_config || '{}');
            } catch (e) {
              managerSubscription = {};
            }
            const actualManagerPlan = managerSubscription.plan || 'starter';

            // Sales commission is ONLY for Enterprise managers
            if (actualManagerPlan === 'enterprise' && commissionRate > 0 && manager.user_id) {
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
        if (order.customer_id) {
          await client.query(`
            UPDATE customers 
            SET total_orders = total_orders + 1, 
                total_spent = total_spent + $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [amount, order.customer_id]);
        }
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
      SELECT sm.*, u.name, u.email,
             (SELECT COUNT(*) FROM sellers s WHERE s.manager_id = sm.id) as live_total_sellers,
             (SELECT COUNT(*) FROM sellers s WHERE s.manager_id = sm.id AND s.subscription->>'status' = 'active') as live_active_sellers,
             COALESCE((SELECT SUM(o.total) FROM orders o JOIN sellers s ON s.id = o.seller_id WHERE s.manager_id = sm.id AND o.status != 'pending'), 0) as live_total_revenue
      FROM seller_managers sm
      JOIN users u ON sm.user_id = u.id
    `);

    const managersWithStats = managersRes.rows.map(manager => {
      const commissionRate = parseFloat(manager.commission_rate || 0.05);
      const totalRevenue = parseFloat(manager.live_total_revenue || 0);
      return {
        ...manager,
        stats: {
          totalSellers: parseInt(manager.live_total_sellers || 0),
          activeSellers: parseInt(manager.live_active_sellers || 0),
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
    const managerFullRes = await db.query('SELECT pricing_config FROM seller_managers WHERE id = $1', [managerId]);
    if (managerFullRes.rows.length > 0) {
      const manager = managerFullRes.rows[0];
      let managerSubscription = {};
      try {
        managerSubscription = typeof manager.pricing_config === 'object' ? manager.pricing_config : JSON.parse(manager.pricing_config || '{}');
      } catch (e) {
        managerSubscription = {};
      }
      const managerPlan = managerSubscription.plan || 'starter';
      
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

const IYONIC_BOT_PLANS = {
  starter: { name: 'Starter', price: 0, advanced: false, description: 'One role-based bot to get your store started.' },
  basic: { name: 'Basic', price: 2, advanced: false, description: 'Three role-based bots for everyday store support.' },
  pro: { name: 'Pro', price: 9.99, advanced: true, description: 'Advanced training and deployment for Professional sellers.' },
  promax: { name: 'Pro Max', price: 29.99, advanced: true, description: 'The complete IyonicBots capability set for Enterprise sellers.' }
};

const SUBSCRIPTION_PLANS_CONFIG = {
  iyonicshop: {
    plans: {
      starter: { name: 'Starter', price: 0, botPlan: 'basic' },
      basic: { name: 'Basic', price: 15, botPlan: 'basic' },
      professional: { name: 'Professional', price: 29, botPlan: 'pro' },
      enterprise: { name: 'Enterprise', price: 99, botPlan: 'promax' }
    }
  },
  iyonicbots: {
    plans: IYONIC_BOT_PLANS
  }
};

const getSellerBotPlan = async (sellerId) => {
  const result = await db.query('SELECT subscription FROM sellers WHERE id = $1', [sellerId]);
  const subscription = result.rows[0]?.subscription || {};
  const shopPlan = subscription.plan || 'starter';
  const planId = subscription.botPlan || 'starter';
  return { id: planId, shopPlan, ...IYONIC_BOT_PLANS[planId] };
};

app.get('/api/bots/billing', authenticateToken, async (req, res) => {
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Only sellers can manage bot billing' });
    const plan = await getSellerBotPlan(req.user.sellerId);
    const wallet = await db.query('SELECT balance, currency FROM wallets WHERE user_id = $1', [req.user.id]);
    const sellerRes = await db.query('SELECT auto_renew FROM sellers WHERE user_id = $1', [req.user.id]);
    const autoRenew = sellerRes.rows[0]?.auto_renew || { iyonicbots: { enabled: false } };
    res.json({ plan, plans: IYONIC_BOT_PLANS, wallet: wallet.rows[0] || { balance: 0, currency: 'USD' }, autoRenew });
  } catch (err) {
    res.status(500).json({ message: 'Unable to load bot billing' });
  }
});

app.post('/api/bots/billing/subscribe', authenticateToken, async (req, res) => {
  const requestedPlanId = req.body.planId === 'studio' ? 'pro' : req.body.planId === 'scale' ? 'promax' : req.body.planId;
  const planId = requestedPlanId;
  const selectedPlan = IYONIC_BOT_PLANS[planId];
  if (!selectedPlan) return res.status(400).json({ message: 'Invalid bot plan' });
  if (!req.user.sellerId) return res.status(403).json({ message: 'Only sellers can subscribe to bot plans' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const sellerResult = await client.query('SELECT subscription FROM sellers WHERE id = $1 FOR UPDATE', [req.user.sellerId]);
    const subscription = sellerResult.rows[0]?.subscription || {};
    const currentPlan = subscription.botPlan || 'starter';
    if (currentPlan === planId) {
      await client.query('ROLLBACK');
      return res.json({ message: 'Plan already active', plan: { id: planId, ...selectedPlan } });
    }

    if (selectedPlan.price > 0) {
      const walletResult = await client.query('SELECT id, balance, currency FROM wallets WHERE user_id = $1 FOR UPDATE', [req.user.id]);
      const wallet = walletResult.rows[0];
      if (!wallet || Number(wallet.balance) < selectedPlan.price) {
        await client.query('ROLLBACK');
        return res.status(402).json({ message: `You need ${selectedPlan.price.toFixed(2)} USD in your IyonicPay wallet to activate this plan.` });
      }
      await client.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [selectedPlan.price, wallet.id]);
      await client.query(
        `INSERT INTO transactions (sender_wallet_id, amount, currency, type, status, description)
         VALUES ($1, $2, $3, 'invoice_payment', 'completed', $4)`,
        [wallet.id, selectedPlan.price, wallet.currency || 'USD', `IyonicBots ${selectedPlan.name} plan`]
      );
    }

    const nextSubscription = { ...subscription, botPlan: planId, botPlanStartedAt: new Date().toISOString() };
    const updated = await client.query('UPDATE sellers SET subscription = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING subscription', [JSON.stringify(nextSubscription), req.user.sellerId]);
    await client.query('COMMIT');
    res.json({ message: `${selectedPlan.name} plan activated`, plan: { id: planId, ...selectedPlan }, subscription: updated.rows[0].subscription });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bot billing error:', err);
    res.status(500).json({ message: 'Could not activate bot plan' });
  } finally {
    client.release();
  }
});

app.post('/api/bots/billing/paystack/initialize', authenticateToken, async (req, res) => {
  const planId = req.body.planId === 'studio' ? 'pro' : req.body.planId === 'scale' ? 'promax' : req.body.planId;
  const selectedPlan = IYONIC_BOT_PLANS[planId];
  if (!selectedPlan || selectedPlan.price <= 0) return res.status(400).json({ message: 'Choose a paid bot plan.' });
  if (!req.user.sellerId) return res.status(403).json({ message: 'Only sellers can subscribe to bot plans' });
  if (!process.env.PAYSTACK_SECRET_KEY) return res.status(503).json({ message: 'Direct card payments are not configured yet.' });

  try {
    const userResult = await db.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    const email = userResult.rows[0]?.email;
    if (!email) return res.status(422).json({ message: 'We could not find an email address for this account.' });
    const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);
    const callbackUrl = `${process.env.VITE_APP_URL || process.env.APP_URL || 'http://localhost:4000'}/#/iyonicbots?plan=${encodeURIComponent(planId)}`;
    const payment = await new Promise((resolve, reject) => {
      paystack.transaction.initialize({
        email,
        amount: Math.round(selectedPlan.price * 100),
        currency: process.env.PAYSTACK_CURRENCY || 'USD',
        channels: ['card', 'mobile_money'],
        callback_url: callbackUrl,
        metadata: { type: 'iyonicbots_plan', planId, sellerId: req.user.sellerId }
      }, (err, body) => err ? reject(err) : resolve(body));
    });
    res.json({ authorizationUrl: payment.data.authorization_url, reference: payment.data.reference, planId });
  } catch (err) {
    console.error('Bot Paystack initialization error:', err);
    res.status(500).json({ message: 'Could not start direct payment' });
  }
});

app.post('/api/bots/billing/paystack/verify', authenticateToken, async (req, res) => {
  const { reference } = req.body;
  const planId = req.body.planId === 'studio' ? 'pro' : req.body.planId === 'scale' ? 'promax' : req.body.planId;
  const selectedPlan = IYONIC_BOT_PLANS[planId];
  if (!reference || !selectedPlan || selectedPlan.price <= 0) return res.status(400).json({ message: 'Invalid payment verification request' });
  if (!req.user.sellerId) return res.status(403).json({ message: 'Only sellers can verify bot payments' });

  try {
    const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);
    const payment = await new Promise((resolve, reject) => {
      paystack.transaction.verify(reference, (err, body) => err ? reject(err) : resolve(body));
    });
    if (!payment.status || payment.data?.status !== 'success') return res.status(402).json({ message: 'Payment was not completed' });
    const paidAmount = Number(payment.data.amount) / 100;
    if (paidAmount < selectedPlan.price) return res.status(402).json({ message: 'Payment amount does not match the selected plan' });

    const sellerResult = await db.query('SELECT subscription FROM sellers WHERE id = $1', [req.user.sellerId]);
    const subscription = sellerResult.rows[0]?.subscription || {};
    const nextSubscription = { ...subscription, botPlan: planId, botPlanStartedAt: new Date().toISOString() };
    await db.query('UPDATE sellers SET subscription = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [JSON.stringify(nextSubscription), req.user.sellerId]);
    res.json({ message: `${selectedPlan.name} plan activated`, plan: { id: planId, ...selectedPlan } });
  } catch (err) {
    console.error('Bot Paystack verification error:', err);
    res.status(500).json({ message: 'Could not verify direct payment' });
  }
});

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

// Business Brain: every query is scoped from the authenticated seller identity.
app.get('/api/bots/knowledge', authenticateToken, async (req, res) => {
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Only sellers can access business knowledge' });
    const [documents, faqs, gaps] = await Promise.all([
      db.query('SELECT id, title, document_type, source, source_url, metadata, status, created_at, updated_at FROM bot_knowledge_documents WHERE seller_id = $1 AND status <> \'archived\' ORDER BY created_at DESC', [req.user.sellerId]),
      db.query('SELECT id, question, answer, category, source, status, created_at, updated_at FROM bot_faqs WHERE seller_id = $1 AND status <> \'archived\' ORDER BY created_at DESC', [req.user.sellerId]),
      db.query('SELECT id, question, frequency, last_asked_at, suggested_category, sample_response, status FROM bot_knowledge_gaps WHERE seller_id = $1 ORDER BY frequency DESC, last_asked_at DESC LIMIT 50', [req.user.sellerId])
    ]);
    res.json({ documents: toCamel(documents.rows), faqs: toCamel(faqs.rows), gaps: toCamel(gaps.rows) });
  } catch (err) {
    console.error('Business Brain read error:', err);
    res.status(500).json({ message: 'Unable to load business knowledge' });
  }
});

app.post('/api/bots/knowledge/documents', authenticateToken, async (req, res) => {
  const { title, content, documentType = 'text', source = 'seller', sourceUrl = '', metadata = {} } = req.body;
  if (!title?.trim() || !content?.trim()) return res.status(400).json({ message: 'Title and content are required' });
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Only sellers can add business knowledge' });
    const result = await db.query(
      `INSERT INTO bot_knowledge_documents (seller_id, title, document_type, source, source_url, content, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, title, document_type, source, source_url, metadata, status, created_at, updated_at`,
      [req.user.sellerId, title.trim(), documentType, source, sourceUrl, content.trim(), JSON.stringify(metadata)]
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    console.error('Business Brain document error:', err);
    res.status(500).json({ message: 'Unable to save this knowledge document' });
  }
});

app.delete('/api/bots/knowledge/documents/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Only sellers can remove business knowledge' });
    const result = await db.query('UPDATE bot_knowledge_documents SET status = \'archived\', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND seller_id = $2 RETURNING id', [req.params.id, req.user.sellerId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Knowledge document not found' });
    res.json({ message: 'Knowledge document archived' });
  } catch (err) {
    res.status(500).json({ message: 'Unable to remove this knowledge document' });
  }
});

app.post('/api/bots/knowledge/faqs', authenticateToken, async (req, res) => {
  const { question, answer, category = 'general' } = req.body;
  if (!question?.trim() || !answer?.trim()) return res.status(400).json({ message: 'Question and answer are required' });
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Only sellers can add FAQs' });
    const result = await db.query(
      `INSERT INTO bot_faqs (seller_id, question, answer, category) VALUES ($1, $2, $3, $4)
       RETURNING id, question, answer, category, source, status, created_at, updated_at`,
      [req.user.sellerId, question.trim(), answer.trim(), category]
    );
    res.status(201).json(toCamel(result.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Unable to save this FAQ' });
  }
});

app.get('/api/bots/conversations', authenticateToken, async (req, res) => {
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Only sellers can access conversations' });
    const result = await db.query(
      `SELECT c.id, c.bot_id, c.session_id, c.status, c.resolution_status, c.created_at, c.updated_at,
              (SELECT content FROM bot_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
              (SELECT COUNT(*) FROM bot_messages WHERE conversation_id = c.id) AS message_count
       FROM bot_conversations c WHERE c.seller_id = $1 ORDER BY c.updated_at DESC LIMIT 100`,
      [req.user.sellerId]
    );
    res.json(toCamel(result.rows));
  } catch (err) {
    res.status(500).json({ message: 'Unable to load conversations' });
  }
});

app.get('/api/bots/analytics', authenticateToken, async (req, res) => {
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Only sellers can access analytics' });
    const [conversationStats, messageStats, gapStats] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active, COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved, COUNT(*) FILTER (WHERE status = 'escalated')::int AS escalated FROM bot_conversations WHERE seller_id = $1`, [req.user.sellerId]),
      db.query(`SELECT COUNT(*) FILTER (WHERE role = 'user')::int AS customer_messages, COUNT(*) FILTER (WHERE role = 'assistant')::int AS bot_messages FROM bot_messages m JOIN bot_conversations c ON c.id = m.conversation_id WHERE c.seller_id = $1`, [req.user.sellerId]),
      db.query(`SELECT COUNT(*) FILTER (WHERE status = 'unresolved')::int AS unresolved, COALESCE(SUM(frequency), 0)::int AS repeated_questions FROM bot_knowledge_gaps WHERE seller_id = $1`, [req.user.sellerId])
    ]);
    res.json({ conversations: conversationStats.rows[0], messages: messageStats.rows[0], knowledgeGaps: gapStats.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Unable to load bot analytics' });
  }
});

// Create a new bot
app.post('/api/bots', authenticateToken, async (req, res) => {
  const { name, type } = req.body;
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Only sellers can create bots' });
    
    if (!['support-pro', 'sales-genie', 'tech-guru'].includes(type)) return res.status(400).json({ message: 'Invalid bot category' });
    const existing = await db.query('SELECT id FROM bots WHERE seller_id = $1 AND type = $2 AND status = \'active\'', [req.user.sellerId, type]);
    if (existing.rows.length > 0) {
      const existingBot = await db.query('SELECT * FROM bots WHERE id = $1', [existing.rows[0].id]);
      return res.status(200).json({ ...toCamel(existingBot.rows[0]), alreadyActive: true });
    }
    const botRes = await db.query(
      'INSERT INTO bots (seller_id, name, type, status) VALUES ($1, $2, $3, \'inactive\') RETURNING *',
      [req.user.sellerId, name, type]
    );
    res.status(201).json(toCamel(botRes.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/bots/:id/activate', authenticateToken, async (req, res) => {
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Only sellers can activate bots' });
    const bot = await db.query('SELECT id, type FROM bots WHERE id = $1 AND seller_id = $2', [req.params.id, req.user.sellerId]);
    if (bot.rows.length === 0) return res.status(404).json({ message: 'Bot not found' });
    const conflict = await db.query('SELECT id FROM bots WHERE seller_id = $1 AND type = $2 AND status = \'active\' AND id <> $3', [req.user.sellerId, bot.rows[0].type, req.params.id]);
    if (conflict.rows.length > 0) return res.status(409).json({ message: 'Activate only one bot per category. Deactivate the current bot first.' });
    const updated = await db.query('UPDATE bots SET status = \'active\', deployments = deployments + 1 WHERE id = $1 AND seller_id = $2 RETURNING *', [req.params.id, req.user.sellerId]);
    res.json(toCamel(updated.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Could not activate bot' });
  }
});

app.post('/api/bots/:id/deactivate', authenticateToken, async (req, res) => {
  try {
    const updated = await db.query('UPDATE bots SET status = \'inactive\' WHERE id = $1 AND seller_id = $2 RETURNING *', [req.params.id, req.user.sellerId]);
    if (updated.rows.length === 0) return res.status(404).json({ message: 'Bot not found' });
    res.json(toCamel(updated.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Could not deactivate bot' });
  }
});

// Train a bot
app.post('/api/bots/:id/train', authenticateToken, async (req, res) => {
  const { trainingData } = req.body;
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Unauthorized' });
    const plan = await getSellerBotPlan(req.user.sellerId);
    if (!plan.advanced) return res.status(402).json({ message: 'Advanced training requires the Studio or Scale bot plan.' });
    
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

// Currency symbol mapping
const getCurrencySymbol = (currency) => {
  const symbols = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 'KES': 'KSh', 'NGN': '₦', 'GHS': 'GH₵', 
    'JPY': '¥', 'CAD': 'CA$', 'AUD': 'A$', 'INR': '₹', 'CNY': '¥', 'ZAR': 'R', 
    'MXN': '$', 'BRL': 'R$', 'RUB': '₽', 'TRY': '₺', 'ILS': '₪', 'AED': 'د.إ',
    'SAR': '﷼', 'EGP': '£', 'PKR': '₨', 'BDT': '৳', 'SGD': 'S$'
  };
  return symbols[currency?.toUpperCase()] || '$';
};

// Auto-train from store data - Fully enhanced with all seller data
app.post('/api/bots/:id/auto-train', authenticateToken, async (req, res) => {
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Unauthorized' });
    // Fetch ALL seller data including currency, delivery methods, payment terms, social links, contact info
    const sellerRes = await db.query(`
      SELECT s.store_name, s.description, s.shop_type, s.shipping_policy, s.return_policy, 
             s.privacy_policy, s.terms_of_service, s.delivery_locations, s.payment_terms, 
             s.social_links, s.contact_info, s.currency, u.name as owner_name, u.email as owner_email,
             s.social_links, s.contact_info, s.delivery_locations, s.payment_terms
      FROM sellers s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `, [req.user.sellerId]);
    
    // Fetch ALL product data individually
    const productsRes = await db.query(`
      SELECT name, description, category, price, stock, status, images, videos, urls, type
      FROM products 
      WHERE seller_id = $1 AND status = 'active'
      ORDER BY created_at DESC
    `, [req.user.sellerId]);
    
    const seller = sellerRes.rows[0];
    const products = productsRes.rows;
    const currency = seller.currency || 'USD';
    const currencySymbol = getCurrencySymbol(currency);
    
    // Get categories for training
    const categoriesRes = await db.query(`
      SELECT name FROM categories WHERE seller_id = $1
    `, [req.user.sellerId]);
    const categories = categoriesRes.rows.map(r => r.name);
    
    // Build comprehensive training data
    let autoData = `# ${seller.store_name} - Complete Business Training Data\n\n`;
    
    autoData += `## Store Information\n`;
    autoData += `Store Name: ${seller.store_name}\n`;
    autoData += `Store Currency: ${currency} (${currencySymbol})\n`;
    autoData += `Store Owner: ${seller.owner_name}\n`;
    autoData += `Owner Email: ${seller.owner_email}\n`;
    autoData += `Business Type: ${seller.shop_type === 'service' ? 'Service-Based Business' : 'Product Store'}\n`;
    autoData += `Description: ${seller.description || 'No description provided.'}\n\n`;
    
    autoData += `## Company Policies\n`;
    autoData += `Shipping Policy:\n${seller.shipping_policy || 'Standard shipping applies to all orders.'}\n\n`;
    autoData += `Return Policy:\n${seller.return_policy || 'Contact our support team for any return or refund requests.'}\n\n`;
    autoData += `Privacy Policy:\n${seller.privacy_policy || 'We respect your privacy and protect your personal data.'}\n\n`;
    autoData += `Terms of Service:\n${seller.terms_of_service || 'By using our services, you agree to our terms and conditions.'}\n\n`;
    
    autoData += `## Delivery Methods & Locations\n`;
    const deliveryLocations = seller.delivery_locations || [];
    if (deliveryLocations.length > 0) {
      deliveryLocations.forEach((loc, idx) => {
        autoData += `${idx + 1}. ${loc.name || 'Location'}: ${loc.fee ? loc.fee + ' ' + currency + ' fee' : 'Free delivery'}, ${loc.days ? loc.days + ' business days' : 'Standard timeframe'}\n`;
      });
    } else {
      autoData += `Standard delivery available for all locations.\n`;
    }
    autoData += `\n`;
    
    autoData += `## Payment Methods & Terms\n`;
    const paymentTerms = seller.payment_terms || {};
    const paymentMethods = paymentTerms.methods || ['site'];
    const paymentMethodLabels = {
      site: 'IyonicPay Platform',
      bank: 'Bank Transfer',
      card: 'Credit/Debit Card',
      mobile: 'Mobile Money',
      cash: 'Cash on Delivery'
    };
    autoData += `Available Methods: ${paymentMethods.map(m => paymentMethodLabels[m] || m).join(', ')}\n`;
    autoData += `Currency Accepted: ${currency}\n`;
    autoData += `Deposit Required: ${paymentTerms.depositPercentage || 50}%\n`;
    autoData += `Payment Rules: ${paymentTerms.rules || 'All methods accepted'}\n\n`;
    
    autoData += `## Contact Information\n`;
    const contactInfo = seller.contact_info || {};
    autoData += `Email: ${contactInfo.email || seller.owner_email || 'Contact via store'}\n`;
    autoData += `Phone: ${contactInfo.phone || 'Not specified'}\n`;
    autoData += `Address: ${contactInfo.address || 'Not specified'}\n`;
    autoData += `WhatsApp: ${contactInfo.whatsapp || 'Not specified'}\n\n`;
    
    autoData += `## Social Media Links\n`;
    const socialLinks = seller.social_links || {};
    const socialPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'];
    socialPlatforms.forEach(platform => {
      if (socialLinks[platform]) {
        autoData += `${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${socialLinks[platform]}\n`;
      }
    });
    autoData += `\n`;
    
    autoData += `## Product Categories (${categories.length} categories)\n`;
    if (categories.length > 0) {
      autoData += categories.join(', ') + '\n';
    }
    autoData += `\n`;
    
    autoData += `## All Products & Services (${products.length} items)\n\n`;
    
    // Include EACH product with FULL details individually
    products.forEach((p, idx) => {
      autoData += `### Product ${idx + 1}: ${p.name}\n`;
      autoData += `Category: ${p.category || 'Uncategorized'}\n`;
      autoData += `Product Type: ${p.type || 'product'}\n`;
      autoData += `Full Description: ${p.description || 'No description available.'}\n`;
      autoData += `Current Price: ${currencySymbol}${p.price}\n`;
      autoData += `Stock Level: ${p.stock > 0 ? `${p.stock} units available` : 'Currently out of stock'}\n`;
      autoData += `Availability Status: ${p.status}\n`;
      if (p.images && p.images.length > 0) {
        autoData += `Product Images: ${p.images.join(', ')}\n`;
      }
      if (p.videos && p.videos.length > 0) {
        autoData += `Product Videos: ${p.videos.join(', ')}\n`;
      }
      if (p.urls && p.urls.length > 0) {
        autoData += `Product URLs: ${p.urls.join(', ')}\n`;
      }
      // Add detailed Q&A examples for this product
      autoData += `Product Q&A: What is ${p.name}? ${p.description || 'High quality product'}. How much is ${p.name}? ${currencySymbol}${p.price}. Is ${p.name} in stock? ${p.stock > 0 ? 'Yes, we have ' + p.stock : 'Currently out of stock'}.\n\n`;
    });
    
    // Add conversation examples for continuous dialogue about the store
    autoData += `## Conversation Examples & FAQs\n\n`;
    
    // Business Hours
    autoData += `### Business Hours\n`;
    autoData += `User: What are your business hours?\n`;
    autoData += `Bot: We're available 24/7 online! You can place orders anytime. Our team is here to help whenever you need.\n\n`;
    
    // Warranty & Guarantee
    autoData += `### Warranty & Guarantee Conversations\n`;
    autoData += `User: Do you offer warranties?\n`;
    autoData += `Bot: We stand behind our products with quality guarantees. For specific warranty terms, please check individual product descriptions or contact our support team.\n\n`;
    
    // Comparison Conversations
    autoData += `### Product Comparison Conversations\n`;
    if (products.length >= 2) {
      autoData += `User: Compare ${products[0].name} and ${products[1].name}\n`;
      autoData += `Bot: Great comparison question! ${products[0].name} costs ${currencySymbol}${products[0].price} while ${products[1].name} costs ${currencySymbol}${products[1].price}. Each has unique features - would you like me to highlight the specific differences?\n\n`;
    }
    
    // Thank You & Goodbye
    autoData += `### Appreciation & Goodbye Conversations\n`;
    autoData += `User: Thank you!\n`;
    autoData += `Bot: You're welcome! Anything else I can help with?\n\n`;
    autoData += `User: Goodbye\n`;
    autoData += `Bot: Goodbye! Come back anytime you need help.\n\n`;
    
    // Help Intent
    autoData += `### Help Intent Conversation\n`;
    autoData += `User: I need help\n`;
    autoData += `Bot: I can help you with: Product information and prices, Order status and shipping, Return and refund policies, Payment methods, Store location and contact, Categories and recommendations! Just ask.\n\n`;
    
    autoData += `### General Store Conversations\n`;
    autoData += `User: What currencies do you accept?\n`;
    autoData += `Bot: We accept ${currency} (${currencySymbol}) as our primary currency. All our prices are displayed in ${currency}.\n\n`;
    
    autoData += `User: Where is your store located?\n`;
    autoData += `Bot: ${seller.store_name} is located at ${contactInfo.address || 'multiple locations'}. You can contact us via ${contactInfo.phone || contactInfo.whatsapp || 'our contact page'}.\n\n`;
    
    autoData += `User: Tell me about your store\n`;
    autoData += `Bot: ${seller.store_name} is ${seller.description || 'a premium online store'}. We specialize in ${categories.length > 0 ? categories.join(', ') : 'quality products'}. Our store owner is ${seller.owner_name}.\n\n`;
    
    autoData += `User: Who owns this store?\n`;
    autoData += `Bot: This store is owned by ${seller.owner_name}. You can reach us at ${contactInfo.email || seller.owner_email}.\n\n`;
    
    autoData += `### Product Conversations (${products.length} products available)\n`;
    products.slice(0, 5).forEach(p => {
      autoData += `User: Tell me about ${p.name}\n`;
      autoData += `Bot: ${p.name} is a ${p.type || 'product'} in our ${p.category} category. ${p.description || 'It is a high-quality item'}. Price: ${currencySymbol}${p.price}. ${p.stock > 0 ? 'Currently in stock!' : 'Temporarily out of stock'}.\n\n`;
      
      autoData += `User: How much does ${p.name} cost?\n`;
      autoData += `Bot: ${p.name} costs ${currencySymbol}${p.price} in ${currency}.\n\n`;
      
      autoData += `User: Is ${p.name} available?\n`;
      autoData += `Bot: ${p.stock > 0 ? `Yes, we have ${p.stock} units of ${p.name} in stock.` : `Sorry, ${p.name} is currently out of stock. We're restocking soon!`}\n\n`;
    });
    
    if (products.length > 5) {
      autoData += `User: What other products do you have?\n`;
      autoData += `Bot: We have ${products.length} products in total. Some other popular items include: ${products.slice(5, 10).map(p => p.name).join(', ')}. Would you like specific details about any of these?\n\n`;
    }
    
    autoData += `### Category-Based Conversations\n`;
    if (categories.length > 0) {
      categories.forEach(cat => {
        const catProducts = products.filter(p => p.category === cat);
        autoData += `User: What ${cat} products do you have?\n`;
        autoData += `Bot: In our ${cat} category, we have ${catProducts.length} product${catProducts.length !== 1 ? 's' : ''}: ${catProducts.map(p => p.name + ' (' + currencySymbol + p.price + ')').join(', ')}.\n\n`;
      });
    }
    
    autoData += `### Shipping Conversations\n`;
    autoData += `User: How long does shipping take?\n`;
    autoData += `Bot: ${seller.shipping_policy || 'Shipping typically takes 3-7 business days.'} ${deliveryLocations.length > 0 ? 'Delivery options: ' + deliveryLocations.map(l => l.name).join(', ') + '.' : ''}\n\n`;
    
    autoData += `User: Do you ship internationally?\n`;
    autoData += `Bot: ${deliveryLocations.length > 0 ? 'Yes, we have delivery options: ' + deliveryLocations.map(l => `${l.name} (${l.days ? l.days + ' days' : 'varies'})`).join(', ') + '.' : 'Please check our shipping page for delivery options.'}\n\n`;
    
    autoData += `### Payment Conversations\n`;
    autoData += `User: How can I pay?\n`;
    autoData += `Bot: We accept: ${paymentMethods.map(m => paymentMethodLabels[m] || m).join(', ')}. A ${paymentTerms.depositPercentage || 50}% deposit is required to place your order. All transactions are in ${currency}.\n\n`;
    
    autoData += `User: What payment methods are available?\n`;
    autoData += `Bot: Available payment methods are: ${paymentMethods.map(m => paymentMethodLabels[m] || m).join(', ')}. All prices are in ${currency}.\n\n`;
    
    autoData += `### Return & Refund Conversations\n`;
    autoData += `User: What is your return policy?\n`;
    autoData += `Bot: ${seller.return_policy || 'Our return policy varies by product. Please contact our support team for any refund or exchange requests.'}\n\n`;
    
    autoData += `### Price & Deal Conversations\n`;
    autoData += `User: What's the cheapest item?\n`;
    autoData += `Bot: Let me show you our most affordable options. Our prices range from ${currencySymbol}${products.length > 0 ? Math.min(...products.map(p => parseFloat(p.price))) : '0'} to ${currencySymbol}${products.length > 0 ? Math.max(...products.map(p => parseFloat(p.price))) : '0'}.\n\n`;
    
    autoData += `User: Do you have any discounts?\n`;
    autoData += `Bot: Check out our products for the best prices! We regularly update our inventory with competitive pricing.\n\n`;
    
    // Smart Recommendation Questions
    autoData += `### Smart Recommendation Questions\n`;
    autoData += `User: What do you recommend?\n`;
    autoData += `Bot: Based on our best-sellers, I'd recommend our ${products.length > 0 ? products.slice(0, 3).map(p => p.name).join(', ') : 'featured products'}. What type of product are you interested in?\n\n`;
    autoData += `User: What's popular?\n`;
    autoData += `Bot: Our customers love ${products.length > 0 ? products[0]?.name + ' and ' + products[1]?.name : 'our products'}. These are our top picks!\n\n`;
    
    autoData += `## Bot Personality Configuration\n`;
    autoData += `Tone: ${seller.shop_type === 'service' ? 'Professional and consultative' : 'Friendly and engaging'}\n`;
    autoData += `Style: Sales-focused with product expertise\n`;
    autoData += `Response: Quick and helpful, always aiming to assist customers.\n`;
    autoData += `Currency: ${currency} (${currencySymbol})\n`;
    autoData += `Store Owner: ${seller.owner_name}\n`;
    autoData += `Total Products: ${products.length}\n`;
    autoData += `Total Categories: ${categories.length}\n`;
    
    const botRes = await db.query(
      'UPDATE bots SET training_data = $1, last_trained = CURRENT_TIMESTAMP WHERE id = $2 AND seller_id = $3 RETURNING *',
      [autoData, req.params.id, req.user.sellerId]
    );
    
    if (botRes.rows.length === 0) return res.status(404).json({ message: 'Bot not found' });
    res.json({ ...toCamel(botRes.rows[0]), productCount: products.length, categoryCount: categories.length });
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

// Update bot custom responses
app.patch('/api/bots/:id/custom-responses', authenticateToken, async (req, res) => {
  const { customResponses } = req.body;
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Unauthorized' });
    
    const botRes = await db.query(
      'UPDATE bots SET custom_responses = $1 WHERE id = $2 AND seller_id = $3 RETURNING *',
      [JSON.stringify(customResponses), req.params.id, req.user.sellerId]
    );
    
    if (botRes.rows.length === 0) return res.status(404).json({ message: 'Bot not found' });
    res.json(toCamel(botRes.rows[0]));
  } catch (err) {
    console.error('Bot Custom Responses Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update bot personality
app.patch('/api/bots/:id/personality', authenticateToken, async (req, res) => {
  const { personality } = req.body;
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Unauthorized' });
    
    const botRes = await db.query(
      'UPDATE bots SET personality = $1 WHERE id = $2 AND seller_id = $3 RETURNING *',
      [JSON.stringify(personality), req.params.id, req.user.sellerId]
    );
    
    if (botRes.rows.length === 0) return res.status(404).json({ message: 'Bot not found' });
    res.json(toCamel(botRes.rows[0]));
  } catch (err) {
    console.error('Bot Personality Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

app.get('/api/bots/:id/configuration', authenticateToken, async (req, res) => {
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Only sellers can view bot configuration' });
    const result = await db.query('SELECT configuration FROM bots WHERE id = $1 AND seller_id = $2', [req.params.id, req.user.sellerId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Bot not found' });
    res.json(toCamel(result.rows[0].configuration || {}));
  } catch (err) {
    res.status(500).json({ message: 'Unable to load bot configuration' });
  }
});

app.patch('/api/bots/:id/configuration', authenticateToken, async (req, res) => {
  const allowedLengths = ['short', 'balanced', 'detailed'];
  const configuration = req.body.configuration || {};
  if (configuration.responseLength && !allowedLengths.includes(configuration.responseLength)) {
    return res.status(400).json({ message: 'Invalid response length' });
  }
  try {
    if (!req.user.sellerId) return res.status(403).json({ message: 'Only sellers can edit bot configuration' });
    const result = await db.query(
      'UPDATE bots SET configuration = COALESCE(configuration, \'{}\'::jsonb) || $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND seller_id = $3 RETURNING configuration',
      [JSON.stringify(configuration), req.params.id, req.user.sellerId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Bot not found' });
    res.json(toCamel(result.rows[0].configuration || {}));
  } catch (err) {
    console.error('Bot configuration error:', err);
    res.status(500).json({ message: 'Unable to save bot configuration' });
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

// Public endpoint for storefronts to fetch active bots by tenant
app.get('/api/public/bots/tenant/:tenantId', async (req, res) => {
  console.log('GET /api/public/bots/tenant/:tenantId hit', { tenantId: req.params.tenantId });
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
      'SELECT id, name, type, widget_config, custom_responses, personality FROM bots WHERE seller_id = $1 AND status = \'active\' ORDER BY last_trained DESC',
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

// Public endpoint to fetch bot by ID (for widget)
app.get('/api/public/bots/:id', async (req, res) => {
  try {
    const botsRes = await db.query(
      'SELECT id, name, type, widget_config, custom_responses, personality FROM bots WHERE id = $1 AND status = \'active\'',
      [req.params.id]
    );
    if (botsRes.rows.length === 0) return res.status(404).json({ message: 'Bot not found' });
    res.json(toCamel(botsRes.rows[0]));
  } catch (err) {
    console.error('Error fetching bot:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bot Chat API - Enhanced with currency support and continuous conversations
app.post('/api/public/bots/:id/chat', async (req, res) => {
  const { message, conversationId, sessionId } = req.body;
  try {
    if (!message?.trim()) return res.status(400).json({ message: 'A message is required' });
    // Fetch bot with training data and seller currency in ONE query
    const botRes = await db.query(`
      SELECT b.seller_id, b.name, b.type, b.training_data, b.custom_responses, b.personality, b.widget_config,
             s.currency, s.store_name, s.description, s.contact_info
      FROM bots b
      JOIN sellers s ON b.seller_id = s.id
      WHERE b.id = $1 AND b.status = 'active'
    `, [req.params.id]);
    if (botRes.rows.length === 0) return res.status(404).json({ message: 'Bot not found' });
    
    const bot = botRes.rows[0];
    const sellerId = bot.seller_id;
    const trainingData = bot.training_data || '';
    const customResponses = bot.custom_responses || {};
    const personality = bot.personality || { tone: 'professional', style: 'helpful' };
    const widgetConfig = bot.widget_config || { primaryColor: '#3b82f6', greeting: 'Hello! How can I help you today?', bubbleIcon: 'MessageSquare' };
    const currency = bot.currency || 'USD';
    const currencySymbol = getCurrencySymbol(currency);

    let conversation;
    if (conversationId) {
      const existingConversation = await db.query('SELECT id FROM bot_conversations WHERE id = $1 AND seller_id = $2 AND bot_id = $3', [conversationId, sellerId, req.params.id]);
      conversation = existingConversation.rows[0];
    }
    if (!conversation) {
      const conversationResult = await db.query(
        'INSERT INTO bot_conversations (seller_id, bot_id, session_id) VALUES ($1, $2, $3) RETURNING id',
        [sellerId, req.params.id, sessionId || null]
      );
      conversation = conversationResult.rows[0];
    }
    await db.query('INSERT INTO bot_messages (conversation_id, role, content) VALUES ($1, \'user\', $2)', [conversation.id, message.trim()]);

    const searchPhrase = message.trim().slice(0, 180);
    const knowledgeResult = await db.query(
      `SELECT title, source, content FROM bot_knowledge_documents WHERE seller_id = $1 AND status = 'active' AND content ILIKE $2
       UNION ALL
       SELECT 'FAQ: ' || question AS title, source, answer AS content FROM bot_faqs WHERE seller_id = $1 AND status = 'active' AND (question ILIKE $2 OR answer ILIKE $2)
       LIMIT 5`,
      [sellerId, `%${searchPhrase}%`]
    );
    const knowledgeSources = knowledgeResult.rows.map(row => ({ title: row.title, source: row.source }));
    
    // Increment interaction count
    await db.query('UPDATE bots SET interactions = interactions + 1 WHERE id = $1', [req.params.id]);
    
    let response = "";
    const lowerMessage = message.toLowerCase().trim();
    
// Enhanced Detection Patterns for continuous conversations
    const patterns = {
      greeting: /\b(hello|hi|hey|greetings|good (morning|afternoon|evening))\b/i,
      cheapest: /\b(cheapest|lowest price|best deal|affordable|price low to high|budget|cheap)\b/i,
      recommendation: /\b(recommend|suggest|best for|good for|top rated|popular|looking for)\b/i,
      catalog: /\b(sell|catalog|products|items|inventory|available|stock|options|what do you sell)\b/i,
      identity: /\b(who are you|your name|what do you do|help me with)\b/i,
      priceQuery: /\b(how much|price of|cost of|what is the price)\b/i,
      shipping: /\b(shipping|delivery|deliver|ship to|how long to ship|how long)\b/i,
      returns: /\b(return|refund|exchange|back my money)\b/i,
      currency: /\b(currency|money|dollars|euros|coins|exchange rate|accept)\b/i,
      location: /\b(where|location|address|based|located|find you)\b/i,
      storeInfo: /\b(store|business|company|about|who owns|owner|tell me about)\b/i,
      contact: /\b(contact|email|phone|whatsapp|call|reach|talk to)\b/i,
      social: /\b(social|facebook|instagram|twitter|linkedin|youtube|tiktok|follow)\b/i,
      categories: /\b(categories|category|types of products|product types)\b/i,
      stock: /\b(in stock|available|have|out of stock|do you have|available)\b/i,
      description: /\b(describe|details|tell me about|what is|what's|whats)\b/i,
      compare: /\b(compare|versus|vs|better|difference|vs\.?|versus)\b/i,
      warranty: /\b(warranty|guarantee|warranties|warrant)\b/i,
      hours: /\b(hours|open|close|business hours|operating hours|when are you|time)\b/i,
      thank: /\b(thanks|thank you|appreciate)\b/i,
      bye: /\b(bye|goodbye|see ya|later|see you)\b/i,
      help: /\b(help|assist|support)\b/i
    };
    
    const pickResponse = (responses) => responses[Math.floor(Math.random() * responses.length)];
    const botPrefix = customResponses.responsePrefix || pickResponse({
      'support-pro': ['I can help with that. ', 'Let me look into that for you. ', 'Absolutely, let\'s sort that out. '],
      'sales-genie': ['Let\'s find the right fit. ', 'I have a couple of strong options for you. ', 'Good question. Let\'s make sure you get the best value. '],
      'tech-guru': ['Let\'s narrow this down. ', 'Here\'s the clearest way to approach it. ', 'I\'ll help you troubleshoot that step by step. ']
    }[bot.type] || ['I can help with that. ']);

    // Each bot has a different job before it reaches the shared store knowledge base.
    if (bot.type === 'tech-guru' && /\b(error|bug|debug|api|code|integration|endpoint|database|stack trace)\b/i.test(lowerMessage)) {
      response = `${botPrefix}What are you seeing exactly: the error message, the request or command that caused it, and what you expected to happen? With those three details I can isolate the likely cause instead of guessing.`;
    }
    else if (bot.type === 'support-pro' && /\b(order status|where is my order|late|missing|damaged|cancel)\b/i.test(lowerMessage)) {
      response = `${botPrefix}I\'m sorry this has been frustrating. Share your order number and I\'ll help you work through the next step. If you\'re asking about a return or refund, I can also walk you through the store policy.`;
    }
    else if (bot.type === 'sales-genie' && /\b(buy|purchase|deal|discount|offer|gift|recommend)\b/i.test(lowerMessage)) {
      response = `${botPrefix}Tell me what matters most to you: lowest price, fastest delivery, or the best overall option. I\'ll keep the shortlist focused and explain why each pick makes sense.`;
    }
    const roleResponse = response;
    
    // 1. Identity / Who are you
    if (!response && patterns.identity.test(lowerMessage)) {
      if (customResponses.identity) {
        response = customResponses.identity.replace('{botName}', bot.name);
      } else if (bot.type === 'sales-genie') {
        response = "I'm SalesGenie, and my only mission is to find you the absolute best products at prices you won't believe! What can I sell you today?";
      } else if (bot.type === 'tech-guru') {
        response = "I am TechGuru. I specialize in technical analysis, specifications, and ensuring you get the most efficient solution for your requirements.";
      } else {
        response = `I am ${bot.name}, your intelligent AI shopping assistant. I can help you find products, check prices, and recommend the best items for your needs. What can I help you with today?`;
      }
    }
    // 2. Greeting
    else if (!response && patterns.greeting.test(lowerMessage)) {
      const greetingResponse = customResponses.greetingResponse || customResponses.greeting || "Hello! I am {botName}, your AI assistant. How can I help you find what you're looking for today?";
      response = greetingResponse.replace('{botName}', bot.name);
    } 
    // 3. Shipping Info
    else if (!response && patterns.shipping.test(lowerMessage)) {
      const sellerRes = await db.query('SELECT shipping_policy, delivery_locations FROM sellers WHERE id = $1', [sellerId]);
      const seller = sellerRes.rows[0];
      
      if (customResponses.shipping) {
        response = customResponses.shipping;
      } else if (seller.delivery_locations && seller.delivery_locations.length > 0) {
        const deliveryInfo = seller.delivery_locations.map(loc => 
          `${loc.name || 'Location'}: ${loc.fee ? loc.fee + ' ' + currency + ' fee' : 'Free'}, ${loc.days ? loc.days + ' days' : ''}`
        ).join(' | ');
        response = seller.shipping_policy || `Delivery options: ${deliveryInfo}`;
      } else {
        response = seller.shipping_policy || "We offer standard shipping on all orders. Please proceed to checkout for specific rates and timelines.";
      }
      response = botPrefix + response;
    }
    // 4. Return Info
    else if (!response && patterns.returns.test(lowerMessage)) {
      const sellerRes = await db.query('SELECT return_policy FROM sellers WHERE id = $1', [sellerId]);
      if (customResponses.returns) {
        response = botPrefix + customResponses.returns;
      } else {
        response = botPrefix + (sellerRes.rows[0]?.return_policy || "Our return policy varies by product. Please contact our support team for any refund or exchange requests.");
      }
    }
    // 5. Currency Info
    else if (!response && patterns.currency.test(lowerMessage) && /\b(currency|accept)\b/i.test(lowerMessage)) {
      const sellerRes = await db.query('SELECT currency FROM sellers WHERE id = $1', [sellerId]);
      response = botPrefix + `We accept ${currency} (${currencySymbol}) as our primary currency. All our prices are displayed in ${currency}.`;
    }
    // 6. Currency in price responses
    else if (patterns.priceQuery.test(lowerMessage)) {
      const productName = lowerMessage.replace(patterns.priceQuery, '').replace(/\?|\.|!/g, '').trim();
      if (productName.length > 2) {
        const productRes = await db.query(
          "SELECT name, price, stock, images, description FROM products WHERE seller_id = $1 AND name ILIKE $2 AND status = 'active' LIMIT 1",
          [sellerId, `%${productName}%`]
        );
        if (productRes.rows.length > 0) {
          const p = productRes.rows[0];
          response = `${botPrefix}The ${p.name} costs ${currencySymbol}${p.price}. ${p.stock > 0 ? 'It is currently in stock!' : 'It is currently out of stock.'}`;
          if (p.images && p.images.length > 0) {
            response += `\nIMAGE: ${p.images[0]}`;
          }
        } else {
          response = `${botPrefix}I couldn't find the price for "${productName}". Let me show you our cheapest items instead?`;
        }
      } else {
        response = `${botPrefix}Which product's price would you like to know? All prices are in ${currency} (${currencySymbol}).`;
      }
    }
    // 7. Delivery Options
    else if (/\b(delivery options|delivery methods|shipping methods|ways to get)\b/i.test(lowerMessage)) {
      const sellerRes = await db.query('SELECT delivery_locations FROM sellers WHERE id = $1', [sellerId]);
      const seller = sellerRes.rows[0];
      if (seller.delivery_locations && seller.delivery_locations.length > 0) {
        response = botPrefix + "Available delivery methods:\n" + seller.delivery_locations.map((loc, idx) => 
          `${idx + 1}. ${loc.name}: ${loc.fee ? 'Fee: ' + currencySymbol + loc.fee : 'Free'} - ${loc.days ? loc.days + ' days' : 'Standard delivery time'}`
        ).join('\n');
      } else {
        response = botPrefix + "Standard delivery is available for all orders.";
      }
    }
    // 8. Payment Methods
    else if (/\b(payment|pay|methods|how to pay|checkout)\b/i.test(lowerMessage)) {
      const sellerRes = await db.query('SELECT payment_terms FROM sellers WHERE id = $1', [sellerId]);
      const paymentTerms = sellerRes.rows[0]?.payment_terms || {};
      const methodLabels = { site: 'IyonicPay', bank: 'Bank Transfer', card: 'Credit/Debit Card', mobile: 'Mobile Money', cash: 'Cash on Delivery' };
      const methods = paymentTerms.methods || ['site'];
      if (customResponses.payments) {
        response = botPrefix + customResponses.payments;
      } else {
        response = botPrefix + "Payment methods available: " + methods.map(m => methodLabels[m] || m).join(', ') + ". Deposit: " + (paymentTerms.depositPercentage || 50) + "% required to place order. All transactions in " + currency + ".";
      }
    }
    // 9. Intent: Cheapest Product
    else if (patterns.cheapest.test(lowerMessage)) {
      const cheapestRes = await db.query(
        'SELECT name, price, images FROM products WHERE seller_id = $1 AND status = \'active\' AND stock > 0 ORDER BY price ASC LIMIT 3',
        [sellerId]
      );
      if (cheapestRes.rows.length > 0) {
        response = `${botPrefix}I found these budget-friendly options for you:\n` + 
          cheapestRes.rows.map(p => {
            let line = `• ${p.name}: ${currencySymbol}${p.price}`;
            if (p.images && p.images.length > 0) line += ` (IMAGE: ${p.images[0]})`;
            return line;
          }).join('\n');
      } else {
        response = `${botPrefix}I'm sorry, I couldn't find any items in stock right now.`;
      }
    }
    // 10. Intent: Recommendations / "Best for"
    else if (patterns.recommendation.test(lowerMessage)) {
      let searchTerms = lowerMessage.replace(patterns.recommendation, '').replace(/\?|\.|!/g, '').trim();
      if (searchTerms.startsWith('for ')) searchTerms = searchTerms.substring(4);
      
      const recommendRes = await db.query(
        "SELECT name, description, price, category, images FROM products WHERE seller_id = $1 AND status = 'active' AND stock > 0 AND (category ILIKE $2 OR description ILIKE $2 OR name ILIKE $2) ORDER BY price DESC LIMIT 3",
        [sellerId, `%${searchTerms}%`]
      );
      
      if (recommendRes.rows.length > 0) {
        response = `${botPrefix}Here are my top recommendations for ${searchTerms || 'you'}:\n` + 
          recommendRes.rows.map(p => {
            let line = `• ${p.name} (${currencySymbol}${p.price}) - ${p.description ? p.description.substring(0, 100) + '...' : 'Premium quality'}`;
            if (p.images && p.images.length > 0) line += `\nIMAGE: ${p.images[0]}`;
            return line;
          }).join('\n');
      } else {
        const popularRes = await db.query('SELECT name, price, images FROM products WHERE seller_id = $1 AND status = \'active\' AND stock > 0 LIMIT 3', [sellerId]);
        response = `${botPrefix}I couldn't find something specifically for "${searchTerms}", but check out our most popular items:\n` + 
          popularRes.rows.map(p => {
            let line = `• ${p.name} (${currencySymbol}${p.price})`;
            if (p.images && p.images.length > 0) line += ` (IMAGE: ${p.images[0]})`;
            return line;
          }).join('\n');
      }
    }
    // 11. Intent: Catalog / "What do you sell"
    else if (patterns.catalog.test(lowerMessage)) {
      const productsRes = await db.query(
        'SELECT DISTINCT category FROM products WHERE seller_id = $1 AND status = \'active\'',
        [sellerId]
      );
      if (productsRes.rows.length > 0) {
        const categories = productsRes.rows.map(r => r.category).join(', ');
        response = `${botPrefix}We have a great selection! We specialize in: ${categories}. All items are priced in ${currency} (${currencySymbol}). Is there a specific category you're interested in?`;
      } else {
        response = `${botPrefix}We have many exciting products! What are you looking for today?`;
      }
    }
    // 12. Store Information / Location
    else if (patterns.location.test(lowerMessage) || patterns.storeInfo.test(lowerMessage)) {
      const sellerRes = await db.query('SELECT store_name, description, contact_info FROM sellers WHERE id = $1', [sellerId]);
      const seller = sellerRes.rows[0];
      const contact = seller.contact_info || {};
      response = `${botPrefix}${seller.store_name} is ${seller.description || 'your trusted online store'}. ${contact.address ? 'Located at: ' + contact.address + '.' : ''} ${contact.phone ? 'Phone: ' + contact.phone + '.' : ''} All prices in ${currency} (${currencySymbol}).`;
    }
    // 13. Contact Information
    else if (patterns.contact.test(lowerMessage)) {
      const contact = bot.contact_info || {};
      response = `${botPrefix}You can reach us via: ${contact.email ? 'Email: ' + contact.email : ''} ${contact.phone ? '| Phone: ' + contact.phone : ''} ${contact.whatsapp ? '| WhatsApp: ' + contact.whatsapp : ''}. All inquiries welcome!`;
    }
    // 14. Social Media
    else if (patterns.social.test(lowerMessage)) {
      const socialLinks = bot.social_links || {};
      const socialPlatforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'];
      const availableSocials = socialPlatforms.filter(p => socialLinks[p]).map(p => `${p.charAt(0).toUpperCase() + p.slice(1)}: ${socialLinks[p]}`).join('\n');
      response = availableSocials ? `${botPrefix}Find us on social media:\n${availableSocials}` : `${botPrefix}We're working on expanding our social presence. Stay tuned!`;
    }
    // 15. Product Comparison
    else if (patterns.compare.test(lowerMessage)) {
      const productNames = lowerMessage.replace(patterns.compare, '').replace(/\?|\.|!/g, '').trim();
      const names = productNames.split(/,|vs|versus|and|&/i).map(n => n.trim()).filter(n => n.length > 2);
      
      if (names.length >= 2) {
        const productsRes = await db.query(
          `SELECT name, price, description, images FROM products WHERE seller_id = $1 AND status = 'active' AND (${names.map((_, i) => `name ILIKE $${i + 2}`).join(' OR ')})`,
          [sellerId, ...names.map(n => `%${n}%`)]
        );
        
        if (productsRes.rows.length >= 2) {
          response = `${botPrefix}Here's a comparison of our products:\n` +
            productsRes.rows.map(p => {
              let line = `• ${p.name}: ${currencySymbol}${p.price}`;
              if (p.description && p.description.length > 50) {
                line += `\n  ${p.description.substring(0, 80)}...`;
              }
              return line;
            }).join('\n') +
            `\n\nNeed more details about any of these? Just ask!`;
        } else {
          response = `${botPrefix}I found some products but not all for comparison. Let me show you what I found: ${productsRes.rows.map(p => p.name).join(', ') || 'Nothing found'}.`;
        }
      } else {
        const allProductsRes = await db.query(
          'SELECT name, price FROM products WHERE seller_id = $1 AND status = \'active\' ORDER BY price DESC LIMIT 4',
          [sellerId]
        );
        response = `${botPrefix}To compare products, tell me which ones! For example: "Compare Product A and Product B". Here are some popular options:\n` +
          allProductsRes.rows.map(p => `• ${p.name} (${currencySymbol}${p.price})`).join('\n');
      }
    }
    // 16. Warranty Information
    else if (patterns.warranty.test(lowerMessage)) {
      const sellerRes = await db.query('SELECT warranty_info FROM sellers WHERE id = $1', [sellerId]);
      const warrantyInfo = sellerRes.rows[0]?.warranty_info;
      if (customResponses.warranty) {
        response = botPrefix + customResponses.warranty;
      } else if (warrantyInfo) {
        response = botPrefix + warrantyInfo;
      } else {
        response = botPrefix + "We stand behind our products with quality guarantees. For specific warranty terms, please check individual product descriptions or contact our support team.";
      }
    }
    // 17. Business Hours
    else if (patterns.hours.test(lowerMessage)) {
      const sellerRes = await db.query('SELECT business_hours FROM sellers WHERE id = $1', [sellerId]);
      const hours = sellerRes.rows[0]?.business_hours;
      if (hours) {
        const hoursText = typeof hours === 'string' ? hours : 
          Object.entries(hours).map(([day, time]) => `${day}: ${time}`).join('\n');
        response = `${botPrefix}Our business hours:\n${hoursText}`;
      } else {
        response = botPrefix + "We're available 24/7 online! You can place orders anytime. For immediate assistance, our AI bot is always here to help.";
      }
    }
    // 18. Thank You Response
    else if (patterns.thank.test(lowerMessage)) {
      const thankResponses = [
        "You're welcome! Anything else I can help with?",
        "Happy to help! Need anything else?",
        "My pleasure! What else can I assist you with?",
        "Anytime! Ready to help with more questions."
      ];
      response = botPrefix + thankResponses[Math.floor(Math.random() * thankResponses.length)];
    }
    // 19. Goodbye Response
    else if (patterns.bye.test(lowerMessage)) {
      const byeResponses = [
        "Goodbye! Come back anytime you need help.",
        "See you later! Have a great day!",
        "Take care! We're here when you need us.",
        "Bye! Don't hesitate to reach out again."
      ];
      response = botPrefix + byeResponses[Math.floor(Math.random() * byeResponses.length)];
    }
    // 20. Help Intent
    else if (patterns.help.test(lowerMessage)) {
      response = botPrefix + "I can help you with:\n• Product information and prices\n• Order status and shipping\n• Return and refund policies\n• Payment methods\n• Store location and contact\n• Categories and recommendations\n• And much more! Just ask.";
    }
    // 15. Fallback to Training Data with enhanced matching for continuous conversations
    else if (knowledgeResult.rows.length > 0) {
      response = botPrefix + knowledgeResult.rows.map(row => row.content).join('\n\n');
    }
    // Fallback to bot-specific training data only after tenant knowledge has been checked.
    else if (trainingData) {
      const sentences = trainingData.split(/[.!\n]/).filter(s => s.trim().length > 15);
      const userWords = lowerMessage.split(/\s+/).filter(w => w.length > 2);
      
      // Enhanced scoring: exact matches get higher scores, partial matches get partial scores
      const rankedSentences = sentences.map(s => {
        const sLower = s.toLowerCase();
        let score = 0;
        userWords.forEach(word => {
          if (sLower.includes(word)) {
            // Exact phrase match gets more points
            const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
            const matches = sLower.match(wordRegex);
            score += matches ? 2 : 1;
          }
        });
        return { sentence: s.trim(), score };
      }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
      
      if (rankedSentences.length > 0) {
        response = `${botPrefix}` + rankedSentences.slice(0, 2).map(s => s.sentence).join('. ') + '.';
      } else {
        // Creative fallback: try to generate a helpful response from training data
        const creativeFallbacks = [
          "I have information about that in my knowledge base! Let me find the right details for you.",
          "Great question! I can tell you about our products and services.",
          "I can definitely help with that - let me look up the specifics.",
          `I can tell you all about our offerings in ${currency}! What specifically interests you?`
        ];
        response = botPrefix + (customResponses.fallback || creativeFallbacks[Math.floor(Math.random() * creativeFallbacks.length)]);
      }
    } else {
      response = botPrefix + "I'm currently being trained to better assist you. Please ask about our products, categories, or the best deals!";
    }
    
    const cleanResponse = (roleResponse || response)
      .replace(/#/g, '')
      .replace(/\bFAQS?\b/gi, 'frequently asked questions')
      .replace(/\s{2,}/g, ' ')
      .trim();
    await db.query('INSERT INTO bot_messages (conversation_id, role, content, sources) VALUES ($1, \'assistant\', $2, $3)', [conversation.id, cleanResponse, JSON.stringify(knowledgeSources)]);
    await db.query('UPDATE bot_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND seller_id = $2', [conversation.id, sellerId]);
    if (!knowledgeResult.rows.length && (cleanResponse.toLowerCase().includes('cannot') || cleanResponse.toLowerCase().includes('currently being trained'))) {
      await db.query(
        `INSERT INTO bot_knowledge_gaps (seller_id, bot_id, question, frequency, sample_response)
         VALUES ($1, $2, $3, 1, $4)
         ON CONFLICT (seller_id, question) DO UPDATE SET frequency = bot_knowledge_gaps.frequency + 1, last_asked_at = CURRENT_TIMESTAMP, sample_response = EXCLUDED.sample_response, updated_at = CURRENT_TIMESTAMP`,
        [sellerId, req.params.id, message.trim().slice(0, 500), cleanResponse]
      );
    }
    res.json({ response: cleanResponse, conversationId: conversation.id, sources: knowledgeSources });
  } catch (err) {
    console.error('Bot Chat Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// --- Admin Routes ---

app.post('/api/admin/seller-managers/invite', authenticateToken, async (req, res) => {
  if (req.user.role !== 'manager_admin') return res.status(403).json({ message: 'Unauthorized' });
  const { firstName, lastName, email, commissionRate } = req.body;
  if (!firstName?.trim() || !lastName?.trim() || !email?.trim()) return res.status(400).json({ message: 'First name, last name, and email are required' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'A user with this email already exists' });
    }
    const pendingInvite = await client.query(`SELECT id FROM manager_invitations WHERE LOWER(email) = LOWER($1) AND status = 'pending' AND expires_at > NOW()`, [email.trim()]);
    if (pendingInvite.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'A pending invitation already exists for this email' });
    }

    const invitationToken = nanoid(48);
    await client.query(
      `INSERT INTO manager_invitations (first_name, last_name, email, commission_rate, invitation_token, expires_at) VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')`,
      [firstName.trim(), lastName.trim(), email.trim().toLowerCase(), commissionRate ? Number(commissionRate) / 100 : 0.05, invitationToken]
    );
    await client.query('COMMIT');

    const inviteUrl = `${(process.env.FRONTEND_URL || 'http://localhost:4000').replace(/\/$/, '')}/#/accept-manager-invitation?token=${invitationToken}`;
    const emailResult = await mailer.sendEmail({
      to: email.trim(),
      subject: 'You are invited to manage sellers on IyoniCorp',
      text: `Hello ${firstName.trim()} ${lastName.trim()}, you have been invited to IyoniCorp as a seller manager. Accept your invitation here: ${inviteUrl}`,
      html: `<p>Hello ${firstName.trim()} ${lastName.trim()},</p><p>You have been invited to manage sellers on IyoniCorp.</p><p><a href="${inviteUrl}">Accept invitation and set your account details</a></p><p>This invitation expires in 7 days.</p>`
    });
    if (!emailResult) return res.status(502).json({ message: 'Invitation created, but the email could not be sent' });
    res.status(201).json({ message: 'Invitation sent successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Manager invitation error:', err);
    res.status(500).json({ message: 'Server error sending manager invitation' });
  } finally {
    client.release();
  }
});

app.post('/api/auth/accept-manager-invitation', async (req, res) => {
  const { token, firstName, lastName, phoneNumber, password } = req.body;
  if (!token || !firstName?.trim() || !lastName?.trim() || !password || password.length < 6) return res.status(400).json({ message: 'First name, last name, token, and a password of at least 6 characters are required' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const invitationResult = await client.query(`SELECT * FROM manager_invitations WHERE invitation_token = $1 AND status = 'pending' AND expires_at > NOW() FOR UPDATE`, [token]);
    if (invitationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'This invitation is invalid or has expired' });
    }
    const invitation = invitationResult.rows[0];
    const name = `${firstName.trim()} ${lastName.trim()}`;
    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role, first_name, last_name, phone_number) VALUES ($1, $2, $3, 'seller_manager', $4, $5, $6) RETURNING id, name, email, role`,
      [name, invitation.email, passwordHash, firstName.trim(), lastName.trim(), phoneNumber?.trim() || null]
    );
    await client.query(
      `INSERT INTO seller_managers (user_id, display_name, commission_rate) VALUES ($1, $2, $3)`,
      [userResult.rows[0].id, name, invitation.commission_rate]
    );
    await client.query(`UPDATE manager_invitations SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP WHERE id = $1`, [invitation.id]);
    await client.query('COMMIT');
    res.json({ message: 'Invitation accepted. You can now sign in.', user: toCamel(userResult.rows[0]) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Accept manager invitation error:', err);
    res.status(500).json({ message: 'Server error accepting invitation' });
  } finally {
    client.release();
  }
});

app.get('/api/auth/manager-invitation/:token', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT first_name, last_name, email
      FROM manager_invitations
      WHERE invitation_token = $1 AND status = 'pending' AND expires_at > NOW()
    `, [req.params.token]);
    if (!result.rows.length) return res.status(404).json({ message: 'This invitation is invalid or has expired' });
    res.json(toCamel(result.rows[0]));
  } catch (err) {
    res.status(500).json({ message: 'Server error loading invitation' });
  }
});

app.get('/api/admin/seller-manager-invitations', authenticateToken, async (req, res) => {
  if (req.user.role !== 'manager_admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const result = await db.query(`
      SELECT id, first_name, last_name, email, commission_rate, status, expires_at, created_at
      FROM manager_invitations
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `);
    res.json(toCamel(result.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error loading invitations' });
  }
});

app.patch('/api/admin/sellers/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'manager_admin') return res.status(403).json({ message: 'Unauthorized' });
  const { storeName, isLive, subscription } = req.body;
  try {
    const result = await db.query(`UPDATE sellers SET store_name = COALESCE($1, store_name), is_live = COALESCE($2, is_live), subscription = COALESCE($3, subscription), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`, [storeName || null, isLive, subscription ? JSON.stringify(subscription) : null, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Seller not found' });
    res.json(toCamel(result.rows[0]));
  } catch (err) { res.status(500).json({ message: 'Server error updating seller' }); }
});

app.delete('/api/admin/sellers/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'manager_admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const result = await db.query('DELETE FROM sellers WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Seller not found' });
    res.json({ message: 'Seller deleted successfully' });
  } catch (err) { res.status(500).json({ message: 'Server error deleting seller' }); }
});

app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'manager_admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    // Currency conversion rates to USD
    const ratesToUSD = { 'USD': 1, 'KES': 125, 'EUR': 0.92, 'GBP': 0.79, 'NGN': 1500, 'GHS': 13 };
    const convertToUSD = (amount, currency) => (parseFloat(amount || 0) / (ratesToUSD[(currency || 'USD').toUpperCase()] || 1));
    
    // Get all sellers with their currencies and revenue for USD conversion
    const sellersRes = await db.query(`
      SELECT s.id, s.currency, COALESCE((s.stats->>'totalRevenue')::numeric, 0) as revenue
      FROM sellers s
    `);
    
    // Convert all revenues to USD
    let totalUSDRevenue = 0;
    sellersRes.rows.forEach(seller => {
      totalUSDRevenue += convertToUSD(seller.revenue, seller.currency);
    });
    
    const responseData = {
      total_platform_revenue_usd: totalUSDRevenue,
      total_platform_revenue: await db.query('SELECT COALESCE(SUM(total), 0) as total FROM orders').then(r => parseFloat(r.rows[0].total)),
      total_users: await db.query('SELECT COUNT(*) as count FROM users').then(r => parseInt(r.rows[0].count)),
      total_sellers: await db.query('SELECT COUNT(*) as count FROM sellers').then(r => parseInt(r.rows[0].count)),
      total_managers: await db.query('SELECT COUNT(*) as count FROM seller_managers').then(r => parseInt(r.rows[0].count)),
      total_orders: await db.query('SELECT COUNT(*) as count FROM orders').then(r => parseInt(r.rows[0].count)),
      total_products: await db.query('SELECT COUNT(*) as count FROM products').then(r => parseInt(r.rows[0].count)),
      total_customers: await db.query('SELECT COUNT(*) as count FROM customers').then(r => parseInt(r.rows[0].count)),
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
    // Currency conversion rates to USD
    const ratesToUSD = { 'USD': 1, 'KES': 125, 'EUR': 0.92, 'GBP': 0.79, 'NGN': 1500, 'GHS': 13 };
    const convertToUSD = (amount, currency) => (parseFloat(amount || 0) / (ratesToUSD[(currency || 'USD').toUpperCase()] || 1));
    
    const statsRes = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM wallets) as total_wallets,
        (SELECT COUNT(*) FROM transactions) as total_transactions,
        (SELECT COUNT(*) FROM withdrawals WHERE status = 'pending') as pending_withdrawals
    `);
    const walletBalancesRes = await db.query('SELECT balance, currency FROM wallets');
    const transactionVolumeRes = await db.query(`SELECT t.amount, COALESCE(t.currency, w.currency, 'USD') as currency FROM transactions t LEFT JOIN wallets w ON w.id = t.sender_wallet_id WHERE t.status = 'completed'`);
    const totalWalletBalancesUSD = walletBalancesRes.rows.reduce((sum, wallet) => sum + convertToUSD(wallet.balance, wallet.currency), 0);
    const totalVolumeUSD = transactionVolumeRes.rows.reduce((sum, transaction) => sum + convertToUSD(transaction.amount, transaction.currency), 0);
    
    // Get all sellers with their currencies and revenue
    const sellersRes = await db.query(`
      SELECT s.id, s.store_name, s.currency, COALESCE((s.stats->>'totalRevenue')::numeric, 0) as revenue, COALESCE((s.stats->>'totalOrders')::integer, 0) as orders
      FROM sellers s
    `);
    
    // Convert all revenues to USD for aggregation
    let totalUSDRevenue = 0;
    const sellersWithUSDRevenue = sellersRes.rows.map(seller => {
      const usdRevenue = convertToUSD(seller.revenue, seller.currency);
      totalUSDRevenue += usdRevenue;
      return {
        ...seller,
        revenue_usd: usdRevenue,
        revenue_original: seller.revenue,
        currency: seller.currency || 'USD'
      };
    });
    
    res.json(toCamel({
      ...statsRes.rows[0],
      total_wallet_balances: totalWalletBalancesUSD,
      total_volume: totalVolumeUSD,
      total_platform_revenue_usd: totalUSDRevenue,
      sellers: sellersWithUSDRevenue
    }));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/iyonicpay/transactions', authenticateToken, async (req, res) => {
  if (req.user.role !== 'manager_admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const ratesToUSD = { USD: 1, KES: 125, EUR: 0.92, GBP: 0.79, NGN: 1500, GHS: 13 };
    const transRes = await db.query(`
      SELECT t.*, 
             su.email as sender_email, 
             ru.email as receiver_email,
             COALESCE(t.currency, sw.currency, rw.currency, 'USD') as transaction_currency
      FROM transactions t
      LEFT JOIN wallets sw ON t.sender_wallet_id = sw.id
      LEFT JOIN wallets rw ON t.receiver_wallet_id = rw.id
      LEFT JOIN users su ON sw.user_id = su.id
      LEFT JOIN users ru ON rw.user_id = ru.id
      ORDER BY t.created_at DESC
      LIMIT 100
    `);
    res.json(toCamel(transRes.rows.map(transaction => ({
      ...transaction,
      amount: Number(transaction.amount || 0) / (ratesToUSD[String(transaction.transaction_currency || 'USD').toUpperCase()] || 1),
      currency: 'USD'
    }))));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/iyonicpay/wallets', authenticateToken, async (req, res) => {
  if (req.user.role !== 'manager_admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const ratesToUSD = { USD: 1, KES: 125, EUR: 0.92, GBP: 0.79, NGN: 1500, GHS: 13 };
    const result = await db.query(`
      SELECT w.id, w.balance, w.currency, w.created_at, w.updated_at,
             u.name as user_name, u.email as user_email, u.role as user_role
      FROM wallets w
      JOIN users u ON u.id = w.user_id
      ORDER BY w.updated_at DESC
    `);
    res.json(toCamel(result.rows.map(wallet => ({
      ...wallet,
      native_balance: Number(wallet.balance || 0),
      usd_balance: Number(wallet.balance || 0) / (ratesToUSD[String(wallet.currency || 'USD').toUpperCase()] || 1)
    }))));
  } catch (err) {
    res.status(500).json({ message: 'Server error loading wallets' });
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
    const ratesToUSD = { USD: 1, KES: 125, EUR: 0.92, GBP: 0.79, NGN: 1500, GHS: 13 };
    const rows = withRes.rows.map(w => {
      const camelCase = toCamel(w);
      const walletCurrency = (camelCase.bankDetails?.walletCurrency || 'USD').toUpperCase();
      const usdAmount = parseFloat(camelCase.amount || 0) / (ratesToUSD[walletCurrency] || 1);
      return { ...camelCase, usdAmount: Number(usdAmount.toFixed(2)) };
    });
    res.json(rows);
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
    const withRes = await db.query('SELECT id, user_id, amount, bank_details, status FROM withdrawals WHERE id = $1', [id]);
    if (withRes.rows.length > 0) {
      const withdrawal = withRes.rows[0];
      const { user_id, amount } = withdrawal;
      const walletRes = await db.query('SELECT id, currency FROM wallets WHERE user_id = $1', [user_id]);
      if (walletRes.rows.length > 0) {
        const walletId = walletRes.rows[0].id;
        await db.query(
          "UPDATE transactions SET status = $1 WHERE sender_wallet_id = $2 AND amount = $3 AND type = 'withdrawal' AND status = 'pending'",
          [status === 'completed' ? 'completed' : 'failed', walletId, amount]
        );
      }

      // Send status update email to user
      const userRes = await db.query('SELECT name, email FROM users WHERE id = $1', [user_id]);
      if (userRes.rows.length > 0) {
        const userCurrency = walletRes.rows[0]?.currency || 'USD';
        const withdrawalWithDetails = {
          id: withdrawal.id,
          amount: withdrawal.amount,
          bank_details: typeof withdrawal.bank_details === 'string' ? JSON.parse(withdrawal.bank_details) : withdrawal.bank_details,
          status: status
        };
        mailer.sendWithdrawalStatusUpdateEmail(withdrawalWithDetails, userRes.rows[0], status, userCurrency).catch(err => {
          console.error('Failed to send withdrawal status email:', err.message || err);
        });
      }
     }

     // Log activity
    const adminUserId = req.user.id === 'admin-id' ? null : req.user.id;
    const adminName = req.user.name || 'Admin';
    const adminEmail = req.user.email || 'admin@iyonicorp.com';
    await db.query(
      'INSERT INTO admin_activities (action, description, entity_type, entity_id, user_id, user_name, user_email, severity) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      ['withdrawal_status_updated', `Withdrawal #${id.substring(0, 8)} marked as ${status}`, 'withdrawal', id, adminUserId, adminName, adminEmail, 'info']
    );

    res.json({ message: 'Withdrawal status updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get admin activities
app.get('/api/admin/activities', authenticateToken, async (req, res) => {
  if (req.user.role !== 'manager_admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const activitiesRes = await db.query(`
      SELECT * FROM admin_activities 
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    res.json(toCamel(activitiesRes.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get system stats for admin
app.get('/api/admin/system/stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'manager_admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const systemStats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM sellers) as total_sellers,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT COUNT(*) FROM products) as total_products,
        (SELECT COUNT(*) FROM wallets) as total_wallets,
        (SELECT COUNT(*) FROM api_keys WHERE is_active = TRUE) as active_api_keys,
        (SELECT COALESCE(SUM(balance), 0) FROM wallets) as total_wallet_balance,
        (SELECT COUNT(*) FROM social_media_accounts WHERE is_connected = TRUE) as connected_social_accounts,
        (SELECT COUNT(*) FROM bots WHERE status = 'active') as active_bots,
        (SELECT COUNT(*) FROM email_campaigns WHERE status = 'sending') as sending_campaigns
    `);
    
    const serverStatus = await db.query(`
      SELECT s.id, s.store_name, s.subdomain, s.is_live,
             (SELECT COUNT(*) FROM products p WHERE p.seller_id = s.id) as total_products,
             (SELECT COUNT(*) FROM orders o WHERE o.seller_id = s.id) as total_orders,
             (s.subscription->>'status') as subscription_status
      FROM sellers s
      ORDER BY s.created_at DESC
      LIMIT 5
    `);
    
    const databaseSize = await db.query('SELECT pg_database_size(current_database()) as bytes');
    const getDirectorySize = (directory) => {
      if (!fs.existsSync(directory)) return 0;
      return fs.readdirSync(directory, { withFileTypes: true }).reduce((total, entry) => {
        const entryPath = path.join(directory, entry.name);
        return total + (entry.isDirectory() ? getDirectorySize(entryPath) : fs.statSync(entryPath).size);
      }, 0);
    };
    const uploadedStorageBytes = getDirectorySize(path.join(__dirname, 'public'));
    const databaseStorageBytes = Number(databaseSize.rows[0]?.bytes || 0);
    
    res.json(toCamel({
      ...systemStats.rows[0],
      platform_storage_bytes: uploadedStorageBytes + databaseStorageBytes,
      database_storage_bytes: databaseStorageBytes,
      uploaded_storage_bytes: uploadedStorageBytes,
      recent_sellers: serverStatus.rows
    }));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get security events
app.get('/api/admin/security/events', authenticateToken, async (req, res) => {
  if (req.user.role !== 'manager_admin') return res.status(403).json({ message: 'Unauthorized' });
  try {
    const securityRes = await db.query(`
      SELECT * FROM admin_activities 
      WHERE action IN ('login', 'login_failed', 'password_reset', 'suspension', 'api_key_created')
         OR severity IN ('warning', 'error')
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    res.json(toCamel(securityRes.rows));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Log activity helper (internal)
const logActivity = async (action, description, entityType, entityId, userId, userName, userEmail, severity = 'info') => {
  try {
    const validUserId = userId === 'admin-id' ? null : userId;
    await db.query(
      'INSERT INTO admin_activities (action, description, entity_type, entity_id, user_id, user_name, user_email, severity) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [action, description, entityType, entityId, validUserId, userName, userEmail, severity]
    );
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

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

// Send test email
app.post('/api/email-marketing/test', authenticateToken, async (req, res) => {
  try {
    const { to, subject, html, settingsId } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ success: false, message: 'Recipient and subject are required' });
    }

    let transporter;
    let fromEmail = process.env.SMTP_USER;
    let fromName = 'ShopRight';

    if (settingsId) {
      const { settings, transporter: builtTransporter } = await buildTransporterFromSettingsId(settingsId);
      if (settings) {
        transporter = builtTransporter;
        fromEmail = settings.from_email || fromEmail;
        fromName = settings.from_name || fromName;
      } else {
        return res.status(404).json({ success: false, message: 'Email settings not found or inactive' });
      }
    } else {
      const { sendEmail } = await import('./mailer.js');
      transporter = { sendMail: sendEmail };
    }

    if (!transporter || !transporter.sendMail) {
      return res.status(400).json({ success: false, message: 'No email transporter configured. Set SMTP_USER and SMTP_PASS in .env or configure email settings.' });
    }

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html
    });

    res.json({ success: true, message: 'Test email sent successfully', messageId: info.messageId || info });
  } catch (err) {
    console.error('Test email error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error sending test email' });
  }
});

// Verify email settings
app.post('/api/email-marketing/settings/:id/verify', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT * FROM email_marketing_settings WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ verified: false, message: 'Email settings not found' });
    }

    const settings = result.rows[0];
    const transporter = createTransporterFromSettings(settings);

    if (!transporter) {
      // Fall back to system mailer
      const { sendEmail } = await import('./mailer.js');
      const verifyResult = await sendEmail({ to: settings.from_email, subject: 'Verify', text: 'Verify' });
      if (verifyResult) {
        await db.query('UPDATE email_marketing_settings SET is_verified = TRUE WHERE id = $1', [id]);
        return res.json({ verified: true, message: 'Settings verified successfully (system mailer)' });
      }
      return res.status(400).json({ verified: false, message: 'SMTP authentication failed. Check your credentials.' });
    }

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('SMTP connection timed out after 15 seconds'));
      }, 15000);

      transporter.verify((err, _success) => {
        clearTimeout(timeout);
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });

    await db.query('UPDATE email_marketing_settings SET is_verified = TRUE WHERE id = $1', [id]);
    res.json({ verified: true, message: 'Settings verified successfully' });
  } catch (err) {
    console.error('Email settings verification error:', err);
    const isAuthError = err.code === 'EAUTH' || err.responseCode === 535 || err.code === 'EACCES';
    const message = isAuthError
      ? 'SMTP authentication failed. For Gmail, ensure 2FA is enabled and SMTP_PASS is a valid 16-character app password.'
      : err.message || 'Server error verifying settings';
    res.status(400).json({ verified: false, message });
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
      
      // Create transporter using shared helper
      transporter = createTransporterFromSettings(settings);
      if (!transporter) {
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


// ✅ Catch-all route to serve index.html for React Router
app.get(/.*/, (req, res, next) => {
  // If it's an API request or test-db, don't serve index.html
  if (req.url.startsWith('/api/') || req.url === '/test-db') {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

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

      // 3. Process expired cheques and refund issuers
      const expiredChequesRes = await db.query(
        "SELECT c.*, u.name as issuer_name, u.email as issuer_email, w.id as wallet_id FROM cheques c JOIN users u ON c.issuer_id = u.id JOIN wallets w ON u.id = w.user_id WHERE c.status = 'issued' AND c.expires_at <= $1",
        [now]
      );

      for (const cheque of expiredChequesRes.rows) {
        console.log(`[BACKGROUND] Refunding expired cheque: ${cheque.token}`);
        const client = await db.pool.connect();
        try {
          await client.query('BEGIN');
          
          // Refund to issuer wallet
          await client.query('UPDATE wallets SET balance = balance + $1 WHERE id = $2', [cheque.amount, cheque.wallet_id]);
          
          // Mark cheque as expired
          await client.query("UPDATE cheques SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [cheque.id]);
          
          // Record refund transaction
          await client.query(`
            INSERT INTO transactions (receiver_wallet_id, amount, type, status, description) 
            VALUES ($1, $2, 'receive', 'completed', $3)
          `, [cheque.wallet_id, cheque.amount, `Refund for expired cheque ${cheque.token}`]);
          
          await client.query('COMMIT');

          // Send Email
          await mailer.sendChequeExpiredEmail({
            issuer: { name: cheque.issuer_name, email: cheque.issuer_email },
            amount: cheque.amount,
            currency: cheque.currency,
            token: cheque.token
          });
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`Error refunding cheque ${cheque.id}:`, err);
        } finally {
          client.release();
        }
      }

      // 4. Subscription renewal reminders (3 days before expiration) and auto-renewal
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 3);
      const reminderDateStr = reminderDate.toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      // Check IyonicShop subscriptions for renewal reminders
      const shopRenewalSellers = await db.query(
        `SELECT s.user_id, s.subscription, s.auto_renew, u.email, u.name
         FROM sellers s
         JOIN users u ON s.user_id = u.id
         WHERE s.subscription ->> 'endDate' IS NOT NULL
         AND (s.subscription ->> 'endDate')::date <= $1
         AND (s.subscription ->> 'endDate')::date > $2
         AND s.subscription ->> 'status' = 'active'`,
        [reminderDateStr, todayStr]
      );

      for (const seller of shopRenewalSellers.rows) {
        const plan = seller.subscription.plan;
        const planConfig = SELLER_PLANS[plan];
        if (planConfig && planConfig.price > 0) {
          await mailer.sendSubscriptionReminderEmail({
            user: { email: seller.email, name: seller.name },
            platform: 'IyonicShop',
            planName: planConfig.name,
            price: planConfig.price,
            renewalDate: seller.subscription.endDate
          });
          console.log(`[BACKGROUND] Sent IyonicShop renewal reminder to ${seller.email}`);
        }
      }

      // Auto-renew IyonicShop subscriptions that expired today
      const expiredShopSellers = await db.query(
        `SELECT s.id, s.user_id, s.subscription, s.auto_renew, u.email, u.name, w.id as wallet_id, w.balance, w.currency
         FROM sellers s
         JOIN users u ON s.user_id = u.id
         JOIN wallets w ON u.id = w.user_id
         WHERE (s.subscription ->> 'endDate')::date <= $1
         AND s.subscription ->> 'status' = 'active'
         AND s.auto_renew->'iyonicshop'->>'enabled' = 'true'`,
        [todayStr]
      );

      for (const seller of expiredShopSellers.rows) {
        const autoRenew = seller.auto_renew || {};
        const shopAuto = autoRenew.iyonicshop || {};
        const planId = shopAuto.plan || seller.subscription.plan;
        const planConfig = SELLER_PLANS[planId];
        if (!planConfig || planConfig.price <= 0) continue;
        if (Number(seller.balance) < planConfig.price) continue;

        const client2 = await db.pool.connect();
        try {
          await client2.query('BEGIN');
          const nextMonth = new Date();
          nextMonth.setDate(nextMonth.getDate() + 30);
          await client2.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [planConfig.price, seller.wallet_id]);
          await client2.query(
            `INSERT INTO transactions (sender_wallet_id, amount, currency, type, status, description)
             VALUES ($1, $2, $3, 'invoice_payment', 'completed', $4)`,
            [seller.wallet_id, planConfig.price, seller.currency || 'USD', `IyonicShop ${planConfig.name} plan - auto-renewal`]
          );
          const nextSubscription = { ...seller.subscription, plan: planId, startDate: new Date().toISOString(), endDate: nextMonth.toISOString() };
          await client2.query(
            'UPDATE sellers SET subscription = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify(nextSubscription), seller.id]
          );
          await client2.query('COMMIT');
          console.log(`[BACKGROUND] Auto-renewed IyonicShop plan for seller ${seller.id}`);
        } catch (err) {
          await client2.query('ROLLBACK');
          console.error(`Auto-renewal error for seller ${seller.id}:`, err);
        } finally {
          client2.release();
        }
      }

      // Auto-renew IyonicBots subscriptions that expired today
      const expiredBotSellers = await db.query(
        `SELECT s.id, s.user_id, s.subscription, s.auto_renew, u.email, u.name, w.id as wallet_id, w.balance, w.currency
         FROM sellers s
         JOIN users u ON s.user_id = u.id
         JOIN wallets w ON u.id = w.user_id
         WHERE s.subscription->>'botPlanStartedAt' IS NOT NULL
         AND s.auto_renew->'iyonicbots'->>'enabled' = 'true'`,
      );

      for (const seller of expiredBotSellers.rows) {
        const autoRenew = seller.auto_renew || {};
        const botAuto = autoRenew.iyonicbots || {};
        const planId = botAuto.plan;
        const planConfig = IYONIC_BOT_PLANS[planId];
        if (!planConfig || planConfig.price <= 0) continue;
        if (Number(seller.balance) < planConfig.price) continue;

        const client3 = await db.pool.connect();
        try {
          await client3.query('BEGIN');
          await client3.query('UPDATE wallets SET balance = balance - $1 WHERE id = $2', [planConfig.price, seller.wallet_id]);
          await client3.query(
            `INSERT INTO transactions (sender_wallet_id, amount, currency, type, status, description)
             VALUES ($1, $2, $3, 'invoice_payment', 'completed', $4)`,
            [seller.wallet_id, planConfig.price, seller.currency || 'USD', `IyonicBots ${planConfig.name} plan - auto-renewal`]
          );
          const nextSubscription = { ...seller.subscription, botPlan: planId, botPlanStartedAt: new Date().toISOString() };
          await client3.query(
            'UPDATE sellers SET subscription = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify(nextSubscription), seller.id]
          );
          await client3.query('COMMIT');
          console.log(`[BACKGROUND] Auto-renewed IyonicBots plan for seller ${seller.id}`);
        } catch (err) {
          await client3.query('ROLLBACK');
          console.error(`Bot auto-renewal error for seller ${seller.id}:`, err);
        } finally {
          client3.release();
        }
      }
    } catch (err) {
      console.error('Background Job Error:', err);
    }
  }, 60000);
};

// Start background jobs
startBackgroundJobs();

// === Apex POS WebSocket + Routes ===
import http from 'http';
const httpServer = http.createServer(app);
import { Server as SocketIOServer } from 'socket.io';
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  socket.on('subscribe:seller', (sellerId) => {
    if (sellerId) socket.join(`seller:${sellerId}`);
  });
  socket.on('unsubscribe:seller', (sellerId) => {
    if (sellerId) socket.leave(`seller:${sellerId}`);
  });
  console.log(`[WS] Client connected: ${socket.id}`);
});

mountPosRoutes(app, authenticateToken, io);

// ✅ IMPORTANT: bind to 0.0.0.0 for Coolify
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
