import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';

const JWT_SECRET = process.env.JWT_SECRET || 'iyonicorp_secret_key';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  return value && UUID_REGEX.test(value);
}

function generateSchoolCode() {
  return nanoid(8).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function mountSmsAuthRoutes(app, authenticateToken, db, toCamel, normalizeStoreSubdomain, isValidStoreSubdomain, generateStoreSubdomain) {
  const SMS_THEME_IDS = new Set(['sms']);

  // ============================================
  // School Admin Registration — creates seller + admin user + academic year + invite code
  // ============================================
  app.post('/api/sms/auth/register/school', async (req, res) => {
    const {
      schoolName,
      subdomain,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName,
      adminPhone,
      address,
      city,
      state,
      country,
      postalCode,
      phone,
      email,
    } = req.body;

    if (!schoolName || !adminEmail || !adminPassword) {
      return res.status(400).json({ message: 'School name, admin email, and password are required.' });
    }

    try {
      const requestedSubdomain = normalizeStoreSubdomain(subdomain || schoolName);
      if (!isValidStoreSubdomain(requestedSubdomain)) {
        return res.status(400).json({ message: 'Choose a valid subdomain using letters, numbers, and hyphens only (min 2 chars).' });
      }

      const subdomainCheck = await db.query('SELECT id FROM sellers WHERE subdomain = $1', [requestedSubdomain]);
      if (subdomainCheck.rows.length > 0) {
        return res.status(409).json({ message: 'That school URL is already in use. Choose another one.' });
      }

      const emailCheck = await db.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ message: 'An account with this email already exists. Try signing in.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);
      const schoolCode = generateSchoolCode();

      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');

        const userRes = await client.query(
          `INSERT INTO users (name, email, password_hash, role, first_name, last_name, phone_number)
           VALUES ($1, $2, $3, 'school_staff', $4, $5, $6) RETURNING id, name, email, role, created_at`,
          [schoolName, adminEmail, passwordHash, adminFirstName || schoolName, adminLastName || '', adminPhone || null]
        );
        const user = userRes.rows[0];

        const themeSettings = {
          selectedTheme: 'sms',
          primaryColor: '#16a34a',
          secondaryColor: '#1e3a5f',
          fontFamily: 'Inter',
          customizations: {
            sms: { schoolCode, schoolName, address, city, state, country, postalCode, phone, email },
          },
        };

        const defaultSubscription = JSON.stringify({
          plan: 'starter',
          status: 'active',
          startDate: new Date().toISOString(),
          endDate: null,
        });

        await client.query(
          `INSERT INTO sellers (user_id, store_name, subdomain, shop_type, subscription, theme, acquired_themes, is_live)
           VALUES ($1, $2, $3, 'service', $4, $5, '["sms"]'::jsonb, TRUE)`,
          [user.id, schoolName, requestedSubdomain, defaultSubscription, JSON.stringify(themeSettings)]
        );

        const sellerRes = await client.query('SELECT id FROM sellers WHERE user_id = $1', [user.id]);
        const sellerId = sellerRes.rows[0]?.id;

        // Create default academic year (current year)
        const now = new Date();
        const academicYearStart = new Date(now.getFullYear(), 0, 1);
        const academicYearEnd = new Date(now.getFullYear(), 11, 31);
        await client.query(
          `INSERT INTO sms_academic_years (seller_id, year, start_date, end_date, is_current, is_active)
           VALUES ($1, $2, $3, $4, TRUE, TRUE)`,
          [sellerId, `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(-2)}`, academicYearStart, academicYearEnd]
        );

        // Create a single shared school invite code for teacher and parent access.
        // The invite code is school-scoped, so it must be unique per school rather than duplicated per role.
        await client.query(
          `INSERT INTO sms_school_invites (seller_id, code, role, expires_at, max_uses, created_by, is_active)
           VALUES ($1, $2, 'teacher', NULL, 0, $3, TRUE)`,
          [sellerId, schoolCode, user.id]
        );

        await client.query('COMMIT');

        const token = jwt.sign({ id: user.id, role: 'school_staff', sellerId }, JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({
          user: toCamel({ ...user, seller_id: sellerId }),
          token,
          schoolCode,
          subdomain: requestedSubdomain,
        });
      } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505' && err.constraint === 'sellers_subdomain_key') {
          return res.status(409).json({ message: 'That school URL is already in use. Choose another one.' });
        }
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('SMS school registration error:', err.message);
      res.status(500).json({ message: 'Server error during registration' });
    }
  });

  // ============================================
  // Teacher Registration — via school code
  // ============================================
  app.post('/api/sms/auth/register/teacher', async (req, res) => {
    const { schoolCode, firstName, lastName, email, password, phone, qualification, department } = req.body;

    if (!schoolCode || !firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'School code, name, email, and password are required.' });
    }

    try {
      const inviteRes = await db.query(
        `SELECT i.*, s.store_name, u.name AS admin_name FROM sms_school_invites i
         JOIN sellers s ON i.seller_id = s.id
         JOIN users u ON i.created_by = u.id
         WHERE i.code = $1 AND i.is_active = TRUE AND i.role IN ('teacher', 'parent')`,
        [schoolCode.toUpperCase()]
      );

      if (inviteRes.rows.length === 0) {
        return res.status(404).json({ message: 'Invalid school code. Please check with your school administrator.' });
      }

      const invite = inviteRes.rows[0];
      const sellerId = invite.seller_id;

      const emailCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ message: 'An account with this email already exists. Try signing in.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');

        const userRes = await client.query(
          `INSERT INTO users (name, email, password_hash, role, first_name, last_name, phone_number)
           VALUES ($1, $2, $3, 'teacher', $4, $5, $6) RETURNING id, name, email, role, created_at`,
          [email, email, passwordHash, firstName, lastName, phone || null]
        );
        const user = userRes.rows[0];

        // Create teaching staff entry
        const staffRes = await client.query(
          `INSERT INTO sms_teaching_staff (seller_id, user_id, employee_id, first_name, last_name, email, phone, qualification, department, hire_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE) RETURNING id`,
          [sellerId, user.id, `TCH-${nanoid(6).toUpperCase()}`, firstName, lastName, email, phone || null, qualification || null, department || null]
        );

        await client.query(
          `UPDATE sms_school_invites SET used_count = used_count + 1 WHERE id = $1`,
          [invite.id]
        );

        await client.query('COMMIT');

        const token = jwt.sign({ id: user.id, role: 'teacher', sellerId }, JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({
          user: toCamel({ ...user, seller_id: sellerId }),
          token,
          schoolName: invite.store_name,
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('SMS teacher registration error:', err.message);
      res.status(500).json({ message: 'Server error during registration' });
    }
  });

  // ============================================
  // Parent/Guardian Registration — via school code
  // ============================================
  app.post('/api/sms/auth/register/parent', async (req, res) => {
    const { schoolCode, firstName, lastName, email, password, phone, relationship, childAdmissionNumbers } = req.body;

    if (!schoolCode || !firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'School code, name, email, and password are required.' });
    }

    try {
      const inviteRes = await db.query(
        `SELECT i.*, s.store_name FROM sms_school_invites i
         JOIN sellers s ON i.seller_id = s.id
         WHERE i.code = $1 AND i.is_active = TRUE AND i.role IN ('teacher', 'parent')`,
        [schoolCode.toUpperCase()]
      );

      if (inviteRes.rows.length === 0) {
        return res.status(404).json({ message: 'Invalid school code. Please check with your school administrator.' });
      }

      const invite = inviteRes.rows[0];
      const sellerId = invite.seller_id;

      const emailCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ message: 'An account with this email already exists. Try signing in.' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');

        const userRes = await client.query(
          `INSERT INTO users (name, email, password_hash, role, first_name, last_name, phone_number)
           VALUES ($1, $2, $3, 'customer', $4, $5, $6) RETURNING id, name, email, role, created_at`,
          [email, email, passwordHash, firstName, lastName, phone || null]
        );
        const user = userRes.rows[0];

        // Create guardian entry
        const guardianRes = await client.query(
          `INSERT INTO sms_guardians (seller_id, first_name, last_name, email, phone, relationship)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [sellerId, firstName, lastName, email, phone || null, relationship || 'Parent']
        );
        const guardianId = guardianRes.rows[0].id;

        // Link students if admission numbers are provided
        if (Array.isArray(childAdmissionNumbers) && childAdmissionNumbers.length > 0) {
          for (const admissionNumber of childAdmissionNumbers) {
            await client.query(
              `UPDATE sms_students SET guardian_id = $1 WHERE student_id = $2 AND seller_id = $3`,
              [guardianId, admissionNumber, sellerId]
            );
          }
        }

        await client.query(
          `UPDATE sms_school_invites SET used_count = used_count + 1 WHERE id = $1`,
          [invite.id]
        );

        await client.query('COMMIT');

        const token = jwt.sign({ id: user.id, role: 'customer', sellerId }, JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({
          user: toCamel({ ...user, seller_id: sellerId }),
          token,
          schoolName: invite.store_name,
          guardianId,
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('SMS parent registration error:', err.message);
      res.status(500).json({ message: 'Server error during registration' });
    }
  });

  // ============================================
  // SMS Login — uses existing users table
  // ============================================
  app.post('/api/sms/auth/login', async (req, res) => {
    const { email, password, schoolCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
      const userRes = await db.query(
        `SELECT u.*,
                COALESCE(s.id, ts.seller_id) as seller_id,
                COALESCE(s.store_name, ts_s.store_name) as store_name,
                COALESCE(s.theme, ts_s.theme) as theme
         FROM users u
         LEFT JOIN sellers s ON s.user_id = u.id
         LEFT JOIN sms_teaching_staff ts ON ts.user_id = u.id AND ts.is_active = TRUE
         LEFT JOIN sellers ts_s ON ts_s.id = ts.seller_id
         WHERE u.email = $1`,
        [email]
      );

      if (userRes.rows.length === 0) {
        return res.status(401).json({ code: 'ACCOUNT_NOT_FOUND', message: 'No account found with this email.' });
      }

      const user = userRes.rows[0];
      if (user.is_suspended) {
        return res.status(403).json({ code: 'ACCOUNT_SUSPENDED', message: 'Account suspended.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ code: 'INCORRECT_PASSWORD', message: 'Incorrect password.' });
      }

      // If schoolCode provided, verify it matches the user's seller
      if (schoolCode) {
        const inviteRes = await db.query(
          `SELECT seller_id FROM sms_school_invites WHERE code = $1 AND is_active = TRUE`,
          [schoolCode.toUpperCase()]
        );
        if (inviteRes.rows.length === 0) {
          return res.status(403).json({ message: 'Invalid school code.' });
        }
        const invite = inviteRes.rows[0];
        if (user.seller_id && user.seller_id !== invite.seller_id) {
          return res.status(403).json({ message: 'This account does not belong to the specified school.' });
        }
      }

      const sellerId = user.seller_id || user.sellerId;
      const token = jwt.sign({ id: user.id, role: user.role, sellerId }, JWT_SECRET, { expiresIn: '1d' });

      const { password_hash, ...userWithoutPassword } = user;
      res.json({
        user: toCamel({ ...userWithoutPassword, seller_id: sellerId }),
        token,
      });
    } catch (err) {
      console.error('SMS login error:', err.message);
      res.status(500).json({ message: 'Server error during login' });
    }
  });

  // ============================================
  // Get current SMS user + school info
  // ============================================
  app.get('/api/sms/auth/me', authenticateToken, async (req, res) => {
    try {
      const result = await db.query(
        `SELECT u.id, u.name, u.email, u.role, u.first_name, u.last_name, u.phone_number, u.avatar, u.created_at,
                COALESCE(s.id, ts.seller_id) as seller_id,
                COALESCE(s.store_name, ts_s.store_name) as store_name,
                COALESCE(s.subdomain, ts_s.subdomain) as subdomain,
                COALESCE(s.theme, ts_s.theme) as theme,
                COALESCE(s.shop_type, ts_s.shop_type) as shop_type,
                COALESCE(s.is_live, ts_s.is_live) as is_live
         FROM users u
         LEFT JOIN sellers s ON s.user_id = u.id
         LEFT JOIN sms_teaching_staff ts ON ts.user_id = u.id AND ts.is_active = TRUE
         LEFT JOIN sellers ts_s ON ts_s.id = ts.seller_id
         WHERE u.id = $1`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const user = result.rows[0];
      const sellerId = user.seller_id;

      // Fetch school customizations if available
      let schoolCode = null;
      let smsData = null;
      if (sellerId && user.theme && typeof user.theme === 'object') {
        const customizations = user.theme.customizations || {};
        schoolCode = customizations.sms?.schoolCode || null;
      }

      // For school_staff role, fetch school-related data
      if (user.role === 'school_staff' && sellerId) {
        const academicYearRes = await db.query(
          `SELECT id, year, start_date, end_date, is_current, is_active FROM sms_academic_years
           WHERE seller_id = $1 ORDER BY is_current DESC, start_date DESC LIMIT 5`,
          [sellerId]
        );
        const statsRes = await db.query(
          `SELECT
             (SELECT COUNT(*) FROM sms_students WHERE seller_id = $1) as total_students,
             (SELECT COUNT(*) FROM sms_teaching_staff WHERE seller_id = $1) as total_teachers,
             (SELECT COUNT(*) FROM sms_classes WHERE seller_id = $1) as total_classes,
             (SELECT COUNT(*) FROM sms_subjects WHERE seller_id = $1) as total_subjects
           FROM sms_academic_years WHERE seller_id = $1 LIMIT 1`,
          [sellerId]
        );
        smsData = {
          schoolCode,
          academicYears: toCamel(academicYearRes.rows),
          stats: toCamel(statsRes.rows[0]),
        };
      }

      res.json({
        user: toCamel({
          ...user,
          seller_id: sellerId,
          sellerId,
            seller: toCamel({
            id: sellerId,
            storeName: user.store_name,
            subdomain: user.subdomain,
            shopType: user.shop_type,
            isLive: user.is_live,
          }),
        }),
        smsData,
      });
    } catch (err) {
      console.error('SMS auth/me error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Generate a new school invite code (admin only)
  // ============================================
  app.post('/api/sms/auth/invite', authenticateToken, async (req, res) => {
    const { role, maxUses, expiresAt } = req.body;

    if (!role || !['teacher', 'parent', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Valid role (teacher, parent, admin) is required.' });
    }

    try {
      const sellerId = req.user.sellerId;
      if (!sellerId) {
        return res.status(403).json({ message: 'No active school selected.' });
      }

      const code = generateSchoolCode();
      const result = await db.query(
        `INSERT INTO sms_school_invites (seller_id, code, role, expires_at, max_uses, created_by, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING code, role, expires_at, max_uses, created_at`,
        [sellerId, code, role, expiresAt || null, maxUses || 0, req.user.id]
      );

      res.status(201).json(toCamel(result.rows[0]));
    } catch (err) {
      console.error('SMS invite error:', err.message);
      res.status(500).json({ message: 'Server error generating invite' });
    }
  });

  // ============================================
  // List active invite codes for the school (admin only)
  // ============================================
  app.get('/api/sms/auth/invites', authenticateToken, async (req, res) => {
    try {
      const sellerId = req.user.sellerId;
      if (!sellerId) {
        return res.status(403).json({ message: 'No active school selected.' });
      }

      const result = await db.query(
        `SELECT id, code, role, expires_at, max_uses, used_count, is_active, created_at
         FROM sms_school_invites
         WHERE seller_id = $1 AND is_active = TRUE
         ORDER BY created_at DESC`,
        [sellerId]
      );

      res.json(toCamel(result.rows));
    } catch (err) {
      console.error('SMS list invites error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  console.log('✅ SMS auth routes mounted');
}
