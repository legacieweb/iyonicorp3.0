const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  return value && UUID_REGEX.test(value);
}

const SNAKE_CASE_ALIASES = {
  admissionNumber: 'student_id',
  studentId: 'student_id',
  employeeId: 'employee_id',
  feeStructureId: 'fee_structure_id',
  feeStructureItemId: 'fee_structure_item_id',
  academicYearId: 'academic_year_id',
  classId: 'class_id',
  sectionId: 'section_id',
  subjectId: 'subject_id',
  teacherId: 'teacher_id',
  studentIdRef: 'student_id',
  guardianId: 'guardian_id',
  teacherIds: 'teacher_ids',
  recipientIds: 'recipient_ids',
  isRead: 'is_read',
  isActive: 'is_active',
  isMandatory: 'is_mandatory',
  isCurrent: 'is_current',
  isAllDay: 'is_all_day',
  isEmergencyContact: 'is_emergency_contact',
  startDate: 'start_date',
  endDate: 'end_date',
  dueDate: 'due_date',
  enrollmentDate: 'enrollment_date',
  dateOfBirth: 'date_of_birth',
  first_name: 'first_name',
  last_name: 'last_name',
};

function toSnakeCase(key) {
  if (SNAKE_CASE_ALIASES[key]) return SNAKE_CASE_ALIASES[key];
  return key.replace(/[A-Z]/g, (letter, index) => (index ? '_' : '') + letter.toLowerCase());
}

function normalizeBody(body) {
  if (!body || typeof body !== 'object') return {};
  const result = {};
  for (const [key, value] of Object.entries(body)) {
    result[toSnakeCase(key)] = value;
  }
  return result;
}

function generateCrud(app, authenticateToken, requireSchool, db, toCamel, table, route, columns) {
  const base = `/api/sms/${route}`;

  // List
  app.get(base, authenticateToken, requireSchool, async (req, res) => {
    try {
      const result = await db.query(
        `SELECT * FROM ${table} WHERE seller_id = $1 ORDER BY created_at DESC`,
        [req.sellerId]
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Get one
  app.get(`${base}/:id`, authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
      const result = await db.query(
        `SELECT * FROM ${table} WHERE id = $1 AND seller_id = $2`,
        [req.params.id, req.sellerId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
      res.json(toCamel(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Create
  app.post(base, authenticateToken, requireSchool, async (req, res) => {
    const body = normalizeBody(req.body);
    const cols = [];
    const placeholders = [];
    const values = [];
    let idx = 1;
    for (const col of columns) {
      if (body[col] !== undefined) {
        cols.push(col);
        placeholders.push(`$${idx++}`);
        values.push(body[col]);
      }
    }
    if (cols.length === 0) {
      return res.status(400).json({ message: 'No valid fields provided' });
    }
    values.push(req.sellerId);
    placeholders.push(`$${idx}`);

    try {
      const result = await db.query(
        `INSERT INTO ${table} (${[...cols, 'seller_id'].join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        values
      );
      res.status(201).json(toCamel(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Update (partial) — support both PUT and PATCH
  const updateHandler = async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
    const body = normalizeBody(req.body);
    const assignments = [];
    const values = [];
    let idx = 1;
    for (const col of columns) {
      if (body[col] !== undefined) {
        assignments.push(`${col} = $${idx++}`);
        values.push(body[col]);
      }
    }
    if (assignments.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    values.push(req.params.id, req.sellerId);

    try {
      const result = await db.query(
        `UPDATE ${table} SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} AND seller_id = $${idx + 1} RETURNING *`,
        values
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
      res.json(toCamel(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  };
  app.put(`${base}/:id`, authenticateToken, requireSchool, updateHandler);
  app.patch(`${base}/:id`, authenticateToken, requireSchool, updateHandler);

  // Delete
  app.delete(`${base}/:id`, authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
      const result = await db.query(
        `DELETE FROM ${table} WHERE id = $1 AND seller_id = $2 RETURNING id`,
        [req.params.id, req.sellerId]
      );
      if (result.rowCount === 0) return res.status(404).json({ message: 'Not found' });
      res.json({ message: `${table} deleted` });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
}

export function mountSmsRoutes(app, authenticateToken, db, toCamel) {
  const requireSchool = (req, res, next) => {
    if (req.user && (req.user.sellerId || req.user.seller_id)) {
      req.sellerId = req.user.sellerId || req.user.seller_id;
      return next();
    }
    res.status(401).json({ message: 'No active school selected.' });
  };

  app.get('/api/sms/owner/analytics', authenticateToken, async (req, res) => {
    if (req.user.role !== 'manager_admin' && req.user.role !== 'seller') {
      return res.status(403).json({ message: 'Only the SMS platform owner can view cross-school analytics.' });
    }

    if (req.user.role === 'seller') {
      try {
        const ownership = await db.query(
          `SELECT id
           FROM sellers
           WHERE user_id = $1
              AND theme->>'selectedTheme' = 'sms'
           LIMIT 1`,
          [req.user.id]
        );
        if (ownership.rows.length === 0) {
          return res.status(403).json({ message: 'An active SMS platform license is required to view owner analytics.' });
        }
      } catch (err) {
        console.error('SMS platform owner access check failed:', err.message);
        return res.status(500).json({ message: 'Unable to verify SMS platform ownership.' });
      }
    }

    try {
      const [overviewRes, schoolsRes, revenueTrendRes, subscriptionRes] = await Promise.all([
        db.query(
          `WITH sms_schools AS (
             SELECT s.id
             FROM sellers s
              WHERE s.theme->>'selectedTheme' = 'sms'
           )
           SELECT
             (SELECT COUNT(*)::int FROM sms_schools) AS total_schools,
             (SELECT COUNT(*)::int FROM sms_schools ss JOIN sellers s ON s.id = ss.id WHERE s.is_live = TRUE) AS live_schools,
             (SELECT COUNT(*)::int FROM sms_students st JOIN sms_schools ss ON ss.id = st.seller_id WHERE st.is_active = TRUE) AS total_students,
             (SELECT COUNT(*)::int FROM sms_teaching_staff staff JOIN sms_schools ss ON ss.id = staff.seller_id WHERE staff.is_active = TRUE) AS total_teachers,
             (SELECT COUNT(*)::int FROM sms_classes c JOIN sms_schools ss ON ss.id = c.seller_id WHERE c.is_active = TRUE) AS total_classes,
             (SELECT COUNT(*)::int FROM sms_attendance a JOIN sms_schools ss ON ss.id = a.seller_id WHERE a.date = CURRENT_DATE) AS attendance_records_today,
             (SELECT COUNT(*)::int FROM sms_attendance a JOIN sms_schools ss ON ss.id = a.seller_id WHERE a.date = CURRENT_DATE AND a.status = 'present') AS students_present_today,
             (SELECT COALESCE(SUM(p.amount), 0)::numeric
                FROM vip_theme_purchases p
                JOIN sms_schools ss ON ss.id = p.seller_id
                WHERE p.theme_id = 'sms' AND p.currency = 'USD') AS license_revenue_usd,
             (SELECT COUNT(*)::int FROM vip_theme_purchases p
                JOIN sms_schools ss ON ss.id = p.seller_id
                WHERE p.theme_id = 'sms') AS paid_licenses,
             (SELECT COALESCE(SUM(p.amount), 0)::numeric
                FROM sms_fee_payments p
                JOIN sms_schools ss ON ss.id = p.seller_id
                WHERE p.status = 'completed') AS school_fee_collection`,
          []
        ),
        db.query(
          `WITH sms_schools AS (
             SELECT s.id, s.user_id, s.store_name, s.subdomain, s.is_live, s.created_at,
                    s.subscription, s.theme->'customizations'->'sms' AS contact_details,
                    u.email AS owner_email,
                    ay.year AS academic_year
             FROM sellers s
             LEFT JOIN users u ON u.id = s.user_id
             LEFT JOIN sms_academic_years ay ON ay.seller_id = s.id AND ay.is_current = TRUE
              WHERE s.theme->>'selectedTheme' = 'sms'
           ),
           license_purchases AS (
             SELECT seller_id,
                    COUNT(*) FILTER (WHERE theme_id = 'sms')::int AS paid_license_count,
                    COALESCE(SUM(amount) FILTER (WHERE theme_id = 'sms' AND currency = 'USD'), 0)::numeric AS license_revenue_usd
             FROM vip_theme_purchases
             GROUP BY seller_id
           )
           SELECT ss.id, ss.store_name, ss.subdomain, ss.is_live, ss.created_at,
                  ss.contact_details, ss.owner_email, ss.academic_year,
                  ss.subscription->>'plan' AS plan,
                  ss.subscription->>'status' AS subscription_status,
                  COUNT(DISTINCT st.id) FILTER (WHERE st.is_active = TRUE)::int AS total_students,
                  COUNT(DISTINCT staff.id) FILTER (WHERE staff.is_active = TRUE)::int AS total_teachers,
                  COUNT(DISTINCT c.id) FILTER (WHERE c.is_active = TRUE)::int AS total_classes,
                  COUNT(DISTINCT a.id) FILTER (WHERE a.date = CURRENT_DATE)::int AS attendance_today,
                  COALESCE(lp.paid_license_count, 0)::int AS paid_license_count,
                  COALESCE(lp.license_revenue_usd, 0)::numeric AS license_revenue_usd
           FROM sms_schools ss
           LEFT JOIN sms_students st ON st.seller_id = ss.id
           LEFT JOIN sms_teaching_staff staff ON staff.seller_id = ss.id
           LEFT JOIN sms_classes c ON c.seller_id = ss.id
           LEFT JOIN sms_attendance a ON a.seller_id = ss.id
           LEFT JOIN license_purchases lp ON lp.seller_id = ss.id
           GROUP BY ss.id, ss.store_name, ss.subdomain, ss.is_live, ss.created_at,
                    ss.contact_details, ss.owner_email, ss.academic_year, ss.subscription,
                    lp.paid_license_count, lp.license_revenue_usd
           ORDER BY ss.created_at DESC`,
          []
        ),
        db.query(
          `WITH sms_schools AS (
             SELECT s.id FROM sellers s
              WHERE s.theme->>'selectedTheme' = 'sms'
           ),
           months AS (
             SELECT month::date AS month
             FROM generate_series(
               date_trunc('month', CURRENT_DATE) - INTERVAL '11 months',
               date_trunc('month', CURRENT_DATE),
               INTERVAL '1 month'
             ) AS month
           )
           SELECT months.month,
                  COALESCE(SUM(p.amount) FILTER (WHERE p.currency = 'USD'), 0)::numeric AS revenue_usd,
                  COUNT(p.id)::int AS purchases
           FROM months
           LEFT JOIN vip_theme_purchases p
             ON p.theme_id = 'sms'
             AND p.paid_at >= months.month
             AND p.paid_at < months.month + INTERVAL '1 month'
             AND p.seller_id IN (SELECT id FROM sms_schools)
           GROUP BY months.month
            ORDER BY months.month`,
           []
         ),
         db.query(
           `WITH sms_schools AS (
              SELECT s.id FROM sellers s
              WHERE s.theme->>'selectedTheme' = 'sms'
            ),
            school_subs AS (
              SELECT ss.seller_id, p.name AS plan_name, p.price_cents, ss.status,
                     ss.current_period_start, ss.current_period_end
              FROM sms_school_subscriptions ss
              JOIN sms_subscription_plans p ON p.id = ss.plan_id
              WHERE ss.seller_id IN (SELECT id FROM sms_schools)
            ),
            monthly_sub_revenue AS (
              SELECT months.month::date AS month,
                     COALESCE(SUM(
                       CASE WHEN ss.status = 'active'
                            THEN (p.price_cents / 100.0)::numeric
                            ELSE 0
                       END
                     ), 0)::numeric AS revenue_usd,
                     COUNT(ss.id)::int AS active_subscriptions
              FROM generate_series(
                date_trunc('month', CURRENT_DATE) - INTERVAL '11 months',
                date_trunc('month', CURRENT_DATE),
                INTERVAL '1 month'
              ) AS months(month)
              LEFT JOIN sms_school_subscriptions ss ON ss.current_period_start <= months.month + INTERVAL '1 month'
                AND (ss.current_period_end IS NULL OR ss.current_period_end >= months.month)
                AND ss.status = 'active'
              LEFT JOIN sms_subscription_plans p ON p.id = ss.plan_id
              GROUP BY months.month
              ORDER BY months.month
            )
            SELECT
              (SELECT COALESCE(SUM(p.price_cents), 0)::numeric / 100 FROM school_subs p2
                JOIN sms_school_subscriptions ss2 ON ss2.id = p2.id
                WHERE ss2.status = 'active') AS mrr_usd,
              (SELECT COALESCE(SUM(p.price_cents), 0)::numeric / 100 FROM school_subs
                WHERE status = 'active') AS monthly_recurring_revenue,
              jsonb_object_agg(plan_name, cnt) AS plan_distribution
            FROM (
              SELECT plan_name, COUNT(*)::int AS cnt FROM school_subs GROUP BY plan_name
            ) pd
            `,
           []
         ),
       ]);

      const overview = overviewRes.rows[0];
      const subscriptionData = subscriptionRes.rows[0] || {
        mrr_usd: 0,
        monthly_recurring_revenue: 0,
        plan_distribution: {},
      };
      res.json({
        totalSchools: overview.total_schools,
        liveSchools: overview.live_schools,
        totalStudents: overview.total_students,
        totalTeachers: overview.total_teachers,
        totalClasses: overview.total_classes,
        attendanceRecordsToday: overview.attendance_records_today,
        studentsPresentToday: overview.students_present_today,
        licenseRevenueUsd: Number(overview.license_revenue_usd),
        subscriptionRevenueUsd: Number(subscriptionData.monthly_recurring_revenue || 0),
        totalMonthlyRecurringRevenue: Number(subscriptionData.monthly_recurring_revenue || 0),
        totalPlatformRevenue: Number(overview.license_revenue_usd) + Number(subscriptionData.monthly_recurring_revenue || 0),
        paidLicenses: overview.paid_licenses,
        schoolFeeCollection: Number(overview.school_fee_collection),
        schools: toCamel(schoolsRes.rows),
        planDistribution: subscriptionData.plan_distribution || {},
        revenueTrend: revenueTrendRes.rows.map((row) => ({
          month: row.month,
          revenueUsd: Number(row.revenue_usd),
          purchases: row.purchases,
        })),
      });
    } catch (err) {
      console.error('SMS platform owner analytics error:', err.message);
      res.status(500).json({ message: 'Unable to load platform-wide school analytics.' });
    }
  });

  // ============================================
  // SMS Subscription Plans — public list
  // ============================================
  app.get('/api/sms/plans', async (req, res) => {
    try {
      const result = await db.query(
        'SELECT id, name, description, price_cents, currency, interval_type, features, max_students, max_teachers, max_classes, sort_order FROM sms_subscription_plans WHERE is_active = TRUE ORDER BY sort_order'
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      console.error('SMS plans list error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // SMS Subscription Plans — platform owner management
  // ============================================
  app.get('/api/sms/owner/plans', authenticateToken, async (req, res) => {
    if (req.user.role !== 'manager_admin' && req.user.role !== 'seller') {
      return res.status(403).json({ message: 'Only the SMS platform owner can manage subscription plans.' });
    }
    if (req.user.role === 'seller') {
      try {
        const ownership = await db.query(
          `SELECT id FROM sellers WHERE user_id = $1 AND theme->>'selectedTheme' = 'sms' LIMIT 1`,
          [req.user.id]
        );
        if (ownership.rows.length === 0) {
          return res.status(403).json({ message: 'An active SMS platform license is required.' });
        }
      } catch (err) {
        console.error('SMS plan owner check failed:', err.message);
        return res.status(500).json({ message: 'Unable to verify SMS platform ownership.' });
      }
    }
    try {
      const result = await db.query(
        'SELECT id, name, description, price_cents, currency, interval_type, features, max_students, max_teachers, max_classes, sort_order, is_active, created_at, updated_at FROM sms_subscription_plans ORDER BY sort_order'
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      console.error('SMS plans fetch error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/sms/owner/plans', authenticateToken, async (req, res) => {
    if (req.user.role !== 'manager_admin' && req.user.role !== 'seller') {
      return res.status(403).json({ message: 'Only the SMS platform owner can manage subscription plans.' });
    }
    if (req.user.role === 'seller') {
      try {
        const ownership = await db.query(
          `SELECT id FROM sellers WHERE user_id = $1 AND theme->>'selectedTheme' = 'sms' LIMIT 1`,
          [req.user.id]
        );
        if (ownership.rows.length === 0) {
          return res.status(403).json({ message: 'An active SMS platform license is required.' });
        }
      } catch (err) {
        return res.status(500).json({ message: 'Unable to verify SMS platform ownership.' });
      }
    }
    const { name, description, priceCents, currency, intervalType, features, maxStudents, maxTeachers, maxClasses, sortOrder } = req.body;
    if (!name || typeof priceCents !== 'number' || priceCents < 0) {
      return res.status(400).json({ message: 'Valid name and price are required.' });
    }
    try {
      const result = await db.query(
        `INSERT INTO sms_subscription_plans (name, description, price_cents, currency, interval_type, features, max_students, max_teachers, max_classes, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [name, description || null, priceCents, currency || 'USD', intervalType || 'month', features || [], maxStudents || null, maxTeachers || null, maxClasses || null, sortOrder || 0]
      );
      res.status(201).json(toCamel(result.rows[0]));
    } catch (err) {
      console.error('SMS plan create error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.put('/api/sms/owner/plans/:id', authenticateToken, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid plan ID' });
    if (req.user.role !== 'manager_admin' && req.user.role !== 'seller') {
      return res.status(403).json({ message: 'Only the SMS platform owner can manage subscription plans.' });
    }
    if (req.user.role === 'seller') {
      try {
        const ownership = await db.query(
          `SELECT id FROM sellers WHERE user_id = $1 AND theme->>'selectedTheme' = 'sms' LIMIT 1`,
          [req.user.id]
        );
        if (ownership.rows.length === 0) {
          return res.status(403).json({ message: 'An active SMS platform license is required.' });
        }
      } catch (err) {
        return res.status(500).json({ message: 'Unable to verify SMS platform ownership.' });
      }
    }
    const { name, description, priceCents, currency, intervalType, features, maxStudents, maxTeachers, maxClasses, sortOrder, isActive } = req.body;
    const fields = [];
    const values = [];
    let idx = 1;
    if (name !== undefined) { values.push(name); fields.push(`name = $${idx++}`); }
    if (description !== undefined) { values.push(description); fields.push(`description = $${idx++}`); }
    if (priceCents !== undefined) { values.push(priceCents); fields.push(`price_cents = $${idx++}`); }
    if (currency !== undefined) { values.push(currency); fields.push(`currency = $${idx++}`); }
    if (intervalType !== undefined) { values.push(intervalType); fields.push(`interval_type = $${idx++}`); }
    if (features !== undefined) { values.push(JSON.stringify(features)); fields.push(`features = $${idx++}::jsonb`); }
    if (maxStudents !== undefined) { values.push(maxStudents); fields.push(`max_students = $${idx++}`); }
    if (maxTeachers !== undefined) { values.push(maxTeachers); fields.push(`max_teachers = $${idx++}`); }
    if (maxClasses !== undefined) { values.push(maxClasses); fields.push(`max_classes = $${idx++}`); }
    if (sortOrder !== undefined) { values.push(sortOrder); fields.push(`sort_order = $${idx++}`); }
    if (isActive !== undefined) { values.push(isActive); fields.push(`is_active = $${idx++}`); }
    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    values.push(req.params.id);
    try {
      const result = await db.query(
        `UPDATE sms_subscription_plans SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${idx} RETURNING *`,
        values
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Plan not found' });
      res.json(toCamel(result.rows[0]));
    } catch (err) {
      console.error('SMS plan update error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.delete('/api/sms/owner/plans/:id', authenticateToken, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid plan ID' });
    if (req.user.role !== 'manager_admin' && req.user.role !== 'seller') {
      return res.status(403).json({ message: 'Only the SMS platform owner can manage subscription plans.' });
    }
    if (req.user.role === 'seller') {
      try {
        const ownership = await db.query(
          `SELECT id FROM sellers WHERE user_id = $1 AND theme->>'selectedTheme' = 'sms' LIMIT 1`,
          [req.user.id]
        );
        if (ownership.rows.length === 0) {
          return res.status(403).json({ message: 'An active SMS platform license is required.' });
        }
      } catch (err) {
        return res.status(500).json({ message: 'Unable to verify SMS platform ownership.' });
      }
    }
    try {
      const result = await db.query(
        `DELETE FROM sms_subscription_plans WHERE id = $1 RETURNING id`,
        [req.params.id]
      );
      if (result.rowCount === 0) return res.status(404).json({ message: 'Plan not found' });
      res.json({ message: 'Plan deleted' });
    } catch (err) {
      console.error('SMS plan delete error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // School subscription management
  // ============================================
  app.get('/api/sms/subscription', authenticateToken, requireSchool, async (req, res) => {
    try {
      const result = await db.query(
        `SELECT ss.id, ss.status, ss.current_period_start, ss.current_period_end, ss.cancel_at_period_end,
                p.id AS plan_id, p.name AS plan_name, p.description AS plan_description,
                p.price_cents, p.currency, p.interval_type, p.features, p.max_students, p.max_teachers, p.max_classes
         FROM sms_school_subscriptions ss
         JOIN sms_subscription_plans p ON p.id = ss.plan_id
         WHERE ss.seller_id = $1`,
        [req.sellerId]
      );
      if (result.rows.length === 0) {
        return res.json({
          subscription: null,
          plans: await db.query('SELECT id, name, description, price_cents, currency, interval_type, features, max_students, max_teachers, max_classes FROM sms_subscription_plans WHERE is_active = TRUE ORDER BY sort_order').then(r => toCamel(r.rows)),
        });
      }
      const planRes = await db.query(
        'SELECT id, name, description, price_cents, currency, interval_type, features, max_students, max_teachers, max_classes FROM sms_subscription_plans WHERE is_active = TRUE ORDER BY sort_order'
      );
      res.json({
        subscription: toCamel(result.rows[0]),
        plans: toCamel(planRes.rows),
      });
    } catch (err) {
      console.error('SMS subscription fetch error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.post('/api/sms/subscription/change', authenticateToken, requireSchool, async (req, res) => {
    const { planId } = req.body;
    if (!isValidUuid(planId)) return res.status(400).json({ message: 'Valid plan ID is required.' });

    try {
      const planRes = await db.query(
        'SELECT id, name, price_cents, currency, interval_type FROM sms_subscription_plans WHERE id = $1 AND is_active = TRUE',
        [planId]
      );
      if (planRes.rows.length === 0) return res.status(400).json({ message: 'Selected plan is not available.' });

      const plan = planRes.rows[0];
      const now = new Date();
      const periodEnd = new Date(now);
      if (plan.interval_type === 'year') {
        periodEnd.setFullYear(now.getFullYear() + 1);
      } else {
        periodEnd.setMonth(now.getMonth() + 1);
      }

      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO sms_school_subscriptions (seller_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end)
           VALUES ($1, $2, 'active', $3, $4, FALSE)
           ON CONFLICT (seller_id) DO UPDATE SET
             plan_id = EXCLUDED.plan_id,
             status = 'active',
             current_period_start = EXCLUDED.current_period_start,
             current_period_end = EXCLUDED.current_period_end,
             cancel_at_period_end = FALSE,
             updated_at = CURRENT_TIMESTAMP`,
          [req.sellerId, planId, now, periodEnd]
        );

        await client.query(
          `UPDATE sellers SET subscription = COALESCE(subscription, '{}'::jsonb)
             || jsonb_build_object('plan', $1, 'status', 'active', 'startDate', $3, 'endDate', $4)
           WHERE id = $2`,
          [plan.name.toLowerCase(), req.sellerId, now.toISOString(), periodEnd.toISOString()]
        );

        await logAudit(req.sellerId, 'subscription_change', 'subscription', planId, req.user.id, req.user.role, `Changed subscription to ${plan.name}`);

        await client.query('COMMIT');
        res.json({
          message: 'Subscription updated',
          plan: plan.name,
          priceCents: Number(plan.price_cents),
          currency: plan.currency,
          currentPeriodEnd: periodEnd.toISOString(),
        });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('SMS subscription change error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });

  const logAudit = async (sellerId, action, entityType, entityId, userId, userRole, description, metadata = {}) => {
    try {
      await db.query(
        `INSERT INTO sms_audit_log (seller_id, action, entity_type, entity_id, user_id, user_role, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [sellerId, action, entityType, entityId, userId, userRole, description, JSON.stringify(metadata)]
      );
    } catch (logErr) {
      console.error('Audit log error:', logErr.message);
    }
  };

  app.get('/api/sms/dashboard/stats', authenticateToken, requireSchool, async (req, res) => {
    if (!['seller', 'school_staff', 'manager_admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only school owners and administrators can view platform analytics.' });
    }

    try {
      const [metricsRes, attendanceTrendRes, feeTrendRes, classRes, schoolRes] = await Promise.all([
        db.query(
          `SELECT
             (SELECT COUNT(*)::int FROM sms_students WHERE seller_id = $1 AND is_active = TRUE) AS total_students,
             (SELECT COUNT(*)::int FROM sms_teaching_staff WHERE seller_id = $1 AND is_active = TRUE) AS total_teachers,
             (SELECT COUNT(*)::int FROM sms_classes WHERE seller_id = $1 AND is_active = TRUE) AS total_classes,
             (SELECT COUNT(*)::int FROM sms_sections WHERE seller_id = $1 AND is_active = TRUE) AS total_sections,
             (SELECT COUNT(*)::int FROM sms_subjects WHERE seller_id = $1 AND is_active = TRUE) AS total_subjects,
             (SELECT COUNT(*)::int FROM sms_enrollments WHERE seller_id = $1 AND is_active = TRUE) AS total_enrollments,
             (SELECT COUNT(*)::int FROM sms_exams WHERE seller_id = $1 AND is_active = TRUE) AS total_exams,
             (SELECT COUNT(*)::int FROM sms_assignments WHERE seller_id = $1 AND is_active = TRUE) AS total_assignments,
             (SELECT COUNT(*)::int FROM sms_attendance WHERE seller_id = $1 AND date = CURRENT_DATE AND status = 'present') AS attendance_present,
             (SELECT COUNT(*)::int FROM sms_attendance WHERE seller_id = $1 AND date = CURRENT_DATE AND status = 'absent') AS attendance_absent,
             (SELECT COUNT(*)::int FROM sms_attendance WHERE seller_id = $1 AND date = CURRENT_DATE AND status = 'late') AS attendance_late,
             (SELECT COUNT(*)::int FROM sms_attendance WHERE seller_id = $1 AND date = CURRENT_DATE AND status = 'half_day') AS attendance_excused,
             (SELECT COUNT(*)::int FROM sms_messages WHERE seller_id = $1 AND sent_at >= CURRENT_DATE - INTERVAL '6 days') AS recent_messages,
             (SELECT COUNT(*)::int FROM sms_announcements WHERE seller_id = $1 AND is_active = TRUE) AS unread_announcements,
             (SELECT COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0)::numeric
                FROM sms_fee_payments p WHERE p.seller_id = $1) AS fees_collected,
             (SELECT COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'pending'), 0)::numeric
                FROM sms_fee_payments p WHERE p.seller_id = $1) AS fees_pending,
             (SELECT COALESCE(SUM(p.amount) FILTER (
                  WHERE p.status = 'pending'
                    AND f.due_date_day IS NOT NULL
                    AND f.due_date_day < EXTRACT(DAY FROM CURRENT_DATE)
                ), 0)::numeric
                FROM sms_fee_payments p
                JOIN sms_fee_structures f ON f.id = p.fee_structure_id
                WHERE p.seller_id = $1) AS fees_overdue`,
          [req.sellerId]
        ),
        db.query(
          `SELECT days.day::date AS date,
                  COUNT(a.id) FILTER (WHERE a.status = 'present')::int AS present,
                  COUNT(a.id) FILTER (WHERE a.status = 'absent')::int AS absent,
                  COUNT(a.id) FILTER (WHERE a.status = 'late')::int AS late
           FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS days(day)
           LEFT JOIN sms_attendance a ON a.seller_id = $1 AND a.date = days.day::date
           GROUP BY days.day
           ORDER BY days.day`,
          [req.sellerId]
        ),
        db.query(
          `SELECT months.month::date AS month,
                  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'completed'), 0)::numeric AS collected
           FROM generate_series(
             date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
             date_trunc('month', CURRENT_DATE),
             INTERVAL '1 month'
           ) AS months(month)
           LEFT JOIN sms_fee_payments p
             ON p.seller_id = $1
             AND p.payment_date >= months.month
             AND p.payment_date < months.month + INTERVAL '1 month'
           GROUP BY months.month
           ORDER BY months.month`,
          [req.sellerId]
        ),
        db.query(
          `SELECT c.id, c.name,
                  COUNT(s.id) FILTER (WHERE s.is_active = TRUE)::int AS student_count
           FROM sms_classes c
           LEFT JOIN sms_students s ON s.class_id = c.id AND s.seller_id = c.seller_id
           WHERE c.seller_id = $1 AND c.is_active = TRUE
           GROUP BY c.id, c.name
           ORDER BY student_count DESC, c.name
           LIMIT 6`,
          [req.sellerId]
        ),
        db.query(
          `SELECT s.store_name, s.subdomain, s.is_live, s.created_at,
                  s.theme->'customizations'->'sms' AS contact_details,
                  ay.year AS academic_year,
                  ay.start_date AS academic_year_start,
                  ay.end_date AS academic_year_end
           FROM sellers s
           LEFT JOIN sms_academic_years ay ON ay.seller_id = s.id AND ay.is_current = TRUE
           WHERE s.id = $1`,
          [req.sellerId]
        ),
      ]);

      const metrics = metricsRes.rows[0];
      const school = schoolRes.rows[0];
      if (!school) return res.status(404).json({ message: 'School platform not found.' });

      res.json({
        totalStudents: metrics.total_students,
        totalTeachers: metrics.total_teachers,
        totalClasses: metrics.total_classes,
        totalSections: metrics.total_sections,
        totalSubjects: metrics.total_subjects,
        totalEnrollments: metrics.total_enrollments,
        totalExams: metrics.total_exams,
        totalAssignments: metrics.total_assignments,
        attendanceToday: {
          present: metrics.attendance_present,
          absent: metrics.attendance_absent,
          late: metrics.attendance_late,
          excused: metrics.attendance_excused,
        },
        feeCollection: {
          totalCollected: Number(metrics.fees_collected),
          totalPending: Number(metrics.fees_pending),
          totalOverdue: Number(metrics.fees_overdue),
        },
        recentMessages: metrics.recent_messages,
        unreadAnnouncements: metrics.unread_announcements,
        attendanceTrend: attendanceTrendRes.rows.map((row) => ({
          date: row.date,
          present: row.present,
          absent: row.absent,
          late: row.late,
        })),
        feeTrend: feeTrendRes.rows.map((row) => ({
          month: row.month,
          collected: Number(row.collected),
        })),
        classEnrollment: toCamel(classRes.rows),
        school: toCamel(school),
      });
    } catch (err) {
      console.error('SMS dashboard analytics error:', err.message);
      res.status(500).json({ message: 'Unable to load school analytics.' });
    }
  });

  // ============================================
  // Entity configurations: table, route, updatable columns
  // ============================================
  const smsEntities = [
    {
      table: 'sms_academic_years', route: 'academic-years',
      columns: ['year', 'start_date', 'end_date', 'is_current', 'is_active']
    },
    {
      table: 'sms_classes', route: 'classes',
      columns: ['academic_year_id', 'name', 'code', 'description', 'class_teacher_id', 'is_active']
    },
    {
      table: 'sms_sections', route: 'sections',
      columns: ['class_id', 'name', 'section_code', 'description', 'class_teacher_id', 'is_active']
    },
    {
      table: 'sms_subjects', route: 'subjects',
      columns: ['name', 'code', 'description', 'class_id', 'credits', 'is_mandatory', 'is_active']
    },
    {
      table: 'sms_students', route: 'students',
      columns: ['student_id', 'first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender', 'address', 'guardian_id', 'enrollment_date', 'class_id', 'section_id', 'academic_year_id', 'is_active']
    },
    {
      table: 'sms_guardians', route: 'guardians',
      columns: ['first_name', 'last_name', 'email', 'phone', 'alternate_phone', 'address', 'relationship', 'is_emergency_contact']
    },
    {
      table: 'sms_enrollments', route: 'enrollments',
      columns: ['student_id', 'class_id', 'section_id', 'academic_year_id', 'enrollment_date', 'status', 'is_active']
    },
    {
      table: 'sms_teaching_staff', route: 'staff',
      columns: ['user_id', 'employee_id', 'first_name', 'last_name', 'email', 'phone', 'qualification', 'department', 'hire_date', 'is_active']
    },
    {
      table: 'sms_teacher_assignments', route: 'teacher-assignments',
      columns: ['teacher_id', 'class_id', 'section_id', 'subject_id', 'academic_year_id']
    },
    {
      table: 'sms_attendance', route: 'attendance',
      columns: ['student_id', 'class_id', 'section_id', 'academic_year_id', 'date', 'status', 'remarks', 'recorded_by']
    },
    {
      table: 'sms_grade_schemes', route: 'grade-schemes',
      columns: ['name', 'description', 'min_score', 'max_score', 'grade_letter', 'points']
    },
    {
      table: 'sms_exams', route: 'exams',
      columns: ['name', 'type', 'class_id', 'subject_id', 'academic_year_id', 'max_marks', 'start_date', 'end_date', 'is_active']
    },
    {
      table: 'sms_exam_results', route: 'exam-results',
      columns: ['exam_id', 'student_id', 'marks_obtained', 'max_marks', 'grade', 'remarks', 'recorded_by']
    },
    {
      table: 'sms_assignments', route: 'assignments',
      columns: ['title', 'description', 'class_id', 'subject_id', 'teacher_id', 'academic_year_id', 'due_date', 'max_marks', 'is_active']
    },
    {
      table: 'sms_submissions', route: 'assignment-submissions',
      columns: ['assignment_id', 'student_id', 'content', 'file_url', 'submitted_at', 'status', 'marks_obtained', 'feedback', 'graded_by', 'graded_at']
    },
    {
      table: 'sms_timetable', route: 'timetable',
      columns: ['class_id', 'section_id', 'subject_id', 'teacher_id', 'academic_year_id', 'day_of_week', 'period_number', 'start_time', 'end_time', 'room']
    },
    {
      table: 'sms_events', route: 'events',
      columns: ['title', 'description', 'start_date', 'end_date', 'is_all_day', 'location', 'audience', 'class_ids', 'section_ids', 'academic_year_id', 'is_active', 'color']
    },
    {
      table: 'sms_fee_structures', route: 'fee-structures',
      columns: ['name', 'description', 'class_id', 'amount', 'currency', 'frequency', 'due_date_day', 'is_mandatory', 'academic_year_id', 'is_active']
    },
    {
      table: 'sms_fee_structure_items', route: 'fee-structure-items',
      columns: ['fee_structure_id', 'name', 'description', 'amount', 'is_mandatory', 'is_active']
    },
    {
      table: 'sms_fee_payments', route: 'fee-payments',
      columns: ['student_id', 'fee_structure_id', 'amount', 'currency', 'payment_date', 'payment_method', 'reference', 'status', 'academic_year_id', 'recorded_by']
    },
    {
      table: 'sms_concessions', route: 'fee-concessions',
      columns: ['student_id', 'type', 'amount', 'percentage', 'reason', 'start_date', 'end_date', 'is_active', 'approved_by', 'academic_year_id']
    },
    {
      table: 'sms_messages', route: 'messages',
      columns: ['sender_id', 'recipient_type', 'recipient_ids', 'subject', 'message', 'attachments', 'is_read', 'sent_at']
    },
    {
      table: 'sms_announcements', route: 'announcements',
      columns: ['title', 'content', 'priority', 'audience', 'class_ids', 'section_ids', 'academic_year_id', 'is_active', 'sent_at']
    },
    {
      table: 'sms_documents', route: 'documents',
      columns: ['name', 'file_url', 'file_name', 'file_size', 'mime_type', 'document_type', 'accessible_by', 'related_to_id', 'related_to_type', 'academic_year_id', 'uploaded_by']
    }
  ];

  // Generate standard CRUD for every entity
  for (const entity of smsEntities) {
    generateCrud(app, authenticateToken, requireSchool, db, toCamel, entity.table, entity.route, entity.columns);
  }

  // ============================================
  // Audit Log (read-only)
  // ============================================
  app.get('/api/sms/audit-log', authenticateToken, requireSchool, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit || 100, 10);
      const result = await db.query(
        'SELECT * FROM sms_audit_log WHERE seller_id = $1 ORDER BY created_at DESC LIMIT $2',
        [req.sellerId, limit]
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/api/sms/audit-log/:id', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
      const result = await db.query(
        'SELECT * FROM sms_audit_log WHERE id = $1 AND seller_id = $2',
        [req.params.id, req.sellerId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
      res.json(toCamel(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Attendance bulk
  // ============================================
  app.post('/api/sms/attendance/bulk', authenticateToken, requireSchool, async (req, res) => {
    const { records, class_id, section_id, date, academic_year_id } = req.body;
    try {
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ message: 'records array is required' });
      }
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        const inserted = [];
        for (const rec of records) {
          const result = await client.query(
            `INSERT INTO sms_attendance (seller_id, student_id, class_id, section_id, academic_year_id, date, status, remarks, recorded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (student_id, date) DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [req.sellerId, rec.student_id, class_id, section_id, academic_year_id, date, rec.status || 'present', rec.remarks || null, rec.recorded_by || null]
          );
          inserted.push(result.rows[0]);
        }
        await client.query('COMMIT');
        res.status(201).json(toCamel(inserted));
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

  // Custom: Attendance for a class on a date
  app.get('/api/sms/attendance/class/:classId', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.classId)) return res.status(400).json({ message: 'Invalid class ID' });
      const { date, section_id } = req.query;
      const params = [req.params.classId, req.sellerId];
      let query = 'SELECT * FROM sms_attendance WHERE class_id = $1 AND seller_id = $2';
      if (section_id && isValidUuid(section_id)) {
        params.push(section_id);
        query += ` AND section_id = $${params.length}`;
      }
      if (date) {
        params.push(date);
        query += ` AND date = $${params.length}`;
      }
      query += ' ORDER BY date DESC';
      const result = await db.query(query, params);
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Exam Results bulk
  // ============================================
  app.post('/api/sms/exam-results/bulk', authenticateToken, requireSchool, async (req, res) => {
    const { records, exam_id } = req.body;
    try {
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ message: 'records array is required' });
      }
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        const inserted = [];
        for (const rec of records) {
          const result = await client.query(
            `INSERT INTO sms_exam_results (seller_id, exam_id, student_id, marks_obtained, max_marks, grade, remarks, recorded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (exam_id, student_id) DO UPDATE SET marks_obtained = EXCLUDED.marks_obtained, max_marks = EXCLUDED.max_marks, grade = EXCLUDED.grade, remarks = EXCLUDED.remarks, updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [req.sellerId, exam_id, rec.student_id, rec.marks_obtained, rec.max_marks, rec.grade, rec.remarks || null, rec.recorded_by || null]
          );
          inserted.push(result.rows[0]);
        }
        await client.query('COMMIT');
        await logAudit(req.sellerId, 'exam_results_bulk', 'exam_results', exam_id, req.user.id, req.user.role, `Bulk recorded ${inserted.length} exam results`);
        res.status(201).json(toCamel(inserted));
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

  // Custom: Exam results for a specific exam
  app.get('/api/sms/exam-results/exam/:examId', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.examId)) return res.status(400).json({ message: 'Invalid exam ID' });
      const result = await db.query(
        `SELECT r.*, s.student_id, s.first_name, s.last_name FROM sms_exam_results r
         JOIN sms_students s ON r.student_id = s.id
         WHERE r.exam_id = $1 AND r.seller_id = $2 ORDER BY s.last_name, s.first_name`,
        [req.params.examId, req.sellerId]
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Custom: Exam results for a specific student
  app.get('/api/sms/exam-results/student/:studentId', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.studentId)) return res.status(400).json({ message: 'Invalid student ID' });
      const result = await db.query(
        `SELECT r.*, e.name as exam_name, e.type FROM sms_exam_results r
         JOIN sms_exams e ON r.exam_id = e.id
         WHERE r.student_id = $1 AND r.seller_id = $2 ORDER BY e.start_date DESC, e.name`,
        [req.params.studentId, req.sellerId]
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Student's enrollments
  // ============================================
  app.get('/api/sms/students/:id/enrollments', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid student ID' });
      const result = await db.query(
        `SELECT e.*, c.name as class_name, c.code as class_code, s.name as section_name, ay.year as academic_year FROM sms_enrollments e
         LEFT JOIN sms_classes c ON e.class_id = c.id
         LEFT JOIN sms_sections s ON e.section_id = s.id
         LEFT JOIN sms_academic_years ay ON e.academic_year_id = ay.id
         WHERE e.student_id = $1 AND e.seller_id = $2 ORDER BY e.enrollment_date DESC`,
        [req.params.id, req.sellerId]
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Class students
  // ============================================
  app.get('/api/sms/classes/:id/students', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid class ID' });
      const { section_id } = req.query;
      let result;
      if (section_id && isValidUuid(section_id)) {
        result = await db.query(
          'SELECT * FROM sms_students WHERE class_id = $1 AND section_id = $2 AND seller_id = $3 ORDER BY last_name, first_name',
          [req.params.id, section_id, req.sellerId]
        );
      } else {
        result = await db.query(
          'SELECT * FROM sms_students WHERE class_id = $1 AND seller_id = $2 ORDER BY last_name, first_name',
          [req.params.id, req.sellerId]
        );
      }
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Class subjects
  // ============================================
  app.get('/api/sms/classes/:id/subjects', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid class ID' });
      const result = await db.query(
        'SELECT * FROM sms_subjects WHERE (class_id = $1 OR class_id IS NULL) AND seller_id = $2 ORDER BY is_mandatory DESC, name',
        [req.params.id, req.sellerId]
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Class teachers (teacher assignments)
  // ============================================
  app.get('/api/sms/classes/:id/teachers', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid class ID' });
      const result = await db.query(
        `SELECT t.*, ta.subject_id, s.name as subject_name, ta.created_at as assigned_at FROM sms_teacher_assignments ta
         JOIN sms_teaching_staff t ON ta.teacher_id = t.id
         LEFT JOIN sms_subjects s ON ta.subject_id = s.id
         WHERE ta.class_id = $1 AND ta.seller_id = $2 ORDER BY t.last_name, t.first_name`,
        [req.params.id, req.sellerId]
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Teacher's assignments
  // ============================================
  app.get('/api/sms/teaching-staff/:id/assignments', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid teacher ID' });
      const result = await db.query(
        `SELECT ta.*, c.name as class_name, s.name as section_name, sub.name as subject_name FROM sms_teacher_assignments ta
         LEFT JOIN sms_classes c ON ta.class_id = c.id
         LEFT JOIN sms_sections s ON ta.section_id = s.id
         LEFT JOIN sms_subjects sub ON ta.subject_id = sub.id
         WHERE ta.teacher_id = $1 AND ta.seller_id = $2 ORDER BY c.name, sub.name`,
        [req.params.id, req.sellerId]
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Student's submissions for an assignment
  // ============================================
  app.get('/api/sms/assignments/:id/submissions', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid assignment ID' });
      const result = await db.query(
        `SELECT sub.*, s.student_id, s.first_name, s.last_name FROM sms_submissions sub
         JOIN sms_students s ON sub.student_id = s.id
         WHERE sub.assignment_id = $1 AND sub.seller_id = $2 ORDER BY s.last_name, s.first_name`,
        [req.params.id, req.sellerId]
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Timetable for a class/section
  // ============================================
  app.get('/api/sms/timetable/class/:classId', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.classId)) return res.status(400).json({ message: 'Invalid class ID' });
      const { section_id } = req.query;
      let result;
      if (section_id && isValidUuid(section_id)) {
        result = await db.query(
          `SELECT t.*, s.name as subject_name, ts.first_name, ts.last_name FROM sms_timetable t
           LEFT JOIN sms_subjects s ON t.subject_id = s.id
           LEFT JOIN sms_teaching_staff ts ON t.teacher_id = ts.id
           WHERE t.class_id = $1 AND t.section_id = $2 AND t.seller_id = $3
           ORDER BY t.day_of_week, t.period_number`,
          [req.params.classId, section_id, req.sellerId]
        );
      } else {
        result = await db.query(
          `SELECT t.*, s.name as subject_name, ts.first_name, ts.last_name FROM sms_timetable t
           LEFT JOIN sms_subjects s ON t.subject_id = s.id
           LEFT JOIN sms_teaching_staff ts ON t.teacher_id = ts.id
           WHERE t.class_id = $1 AND t.seller_id = $2
           ORDER BY t.day_of_week, t.period_number`,
          [req.params.classId, req.sellerId]
        );
      }
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Fee summary for a student
  // ============================================
  app.get('/api/sms/students/:id/fees', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid student ID' });
      const { academic_year_id } = req.query;
      const params = [req.params.id, req.sellerId];
      let yearClause = '';
      if (academic_year_id && isValidUuid(academic_year_id)) {
        params.push(academic_year_id);
        yearClause = ` AND fp.academic_year_id = $${params.length}`;
      }
      const result = await db.query(
        `SELECT fs.name as fee_structure, fs.amount, COALESCE(SUM(fp.amount), 0) as paid,
                fs.amount - COALESCE(SUM(fp.amount), 0) as balance, fs.currency
         FROM sms_fee_structures fs
         LEFT JOIN sms_fee_payments fp ON fp.fee_structure_id = fs.id AND fp.student_id = $1 AND fp.seller_id = $2${yearClause}
         WHERE fs.seller_id = $2
         GROUP BY fs.id, fs.name, fs.amount, fs.currency ORDER BY fs.name`,
        params
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Current academic year
  // ============================================
  app.get('/api/sms/classes/:id/academic-year', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid class ID' });
      const result = await db.query(
        `SELECT ay.* FROM sms_classes c
         JOIN sms_academic_years ay ON c.academic_year_id = ay.id
         WHERE c.id = $1 AND c.seller_id = $2`,
        [req.params.id, req.sellerId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
      res.json(toCamel(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Student's attendance summary
  // ============================================
  app.get('/api/sms/students/:id/attendance', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid student ID' });
      const { start_date, end_date } = req.query;
      const params = [req.params.id, req.sellerId];
      let dateClause = '';
      if (start_date) { params.push(start_date); dateClause += ` AND a.date >= $${params.length}`; }
      if (end_date) { params.push(end_date); dateClause += ` AND a.date <= $${params.length}`; }
      const result = await db.query(
        `SELECT a.id, a.date, a.status, a.remarks, c.name as class_name, s.name as section_name FROM sms_attendance a
         LEFT JOIN sms_classes c ON a.class_id = c.id
         LEFT JOIN sms_sections s ON a.section_id = s.id
         WHERE a.student_id = $1 AND a.seller_id = $2${dateClause}
         ORDER BY a.date DESC`,
        params
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Student's assignment submissions
  // ============================================
  app.get('/api/sms/students/:id/assignments', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid student ID' });
      const result = await db.query(
        `SELECT sub.*, a.title as assignment_title, a.description, a.due_date, a.max_marks FROM sms_submissions sub
         JOIN sms_assignments a ON sub.assignment_id = a.id
         WHERE sub.student_id = $1 AND sub.seller_id = $2 ORDER BY a.due_date DESC, a.created_at DESC`,
        [req.params.id, req.sellerId]
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Student's exam results (nested route)
  // ============================================
  app.get('/api/sms/students/:id/exam-results', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid student ID' });
      const result = await db.query(
        `SELECT r.*, e.name as exam_name, e.type FROM sms_exam_results r
         JOIN sms_exams e ON r.exam_id = e.id
         WHERE r.student_id = $1 AND r.seller_id = $2 ORDER BY e.start_date DESC, e.name`,
        [req.params.id, req.sellerId]
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Student's fee payments (nested route)
  // ============================================
  app.get('/api/sms/students/:id/fee-payments', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid student ID' });
      const { academic_year_id } = req.query;
      const params = [req.params.id, req.sellerId];
      let yearClause = '';
      if (academic_year_id && isValidUuid(academic_year_id)) {
        params.push(academic_year_id);
        yearClause = ` AND p.academic_year_id = $${params.length}`;
      }
      const result = await db.query(
        `SELECT p.*, fs.name as fee_structure_name FROM sms_fee_payments p
         LEFT JOIN sms_fee_structures fs ON p.fee_structure_id = fs.id
         WHERE p.student_id = $1 AND p.seller_id = $2${yearClause}
         ORDER BY p.payment_date DESC`,
        params
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Student's fee concessions (nested route)
  // ============================================
  app.get('/api/sms/students/:id/fee-concessions', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid student ID' });
      const result = await db.query(
        `SELECT * FROM sms_concessions WHERE student_id = $1 AND seller_id = $2 ORDER BY created_at DESC`,
        [req.params.id, req.sellerId]
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Fee structure items (nested route)
  // ============================================
  app.get('/api/sms/fee-structures/:id/items', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid fee structure ID' });
      const result = await db.query(
        `SELECT * FROM sms_fee_structure_items WHERE fee_structure_id = $1 AND seller_id = $2 ORDER BY created_at ASC`,
        [req.params.id, req.sellerId]
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Approve fee concession (PATCH)
  // ============================================
  app.patch('/api/sms/fee-concessions/:id/approve', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
      const { approvedBy } = req.body;
      const result = await db.query(
        `UPDATE sms_concessions SET approved_by = $1 WHERE id = $2 AND seller_id = $3 RETURNING *`,
        [approvedBy || req.user.id, req.params.id, req.sellerId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
      res.json(toCamel(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Message inbox
  // ============================================
  app.get('/api/sms/messages/inbox', authenticateToken, requireSchool, async (req, res) => {
    try {
      const { unreadOnly } = req.query;
      let query = 'SELECT * FROM sms_messages WHERE seller_id = $1';
      const params = [req.sellerId];
      if (unreadOnly === 'true') {
        query += ' AND is_read = FALSE';
      }
      query += ' ORDER BY sent_at DESC';
      const result = await db.query(query, params);
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Mark message as read (PATCH)
  // ============================================
  app.patch('/api/sms/messages/:id/read', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
      const result = await db.query(
        `UPDATE sms_messages SET is_read = TRUE WHERE id = $1 AND seller_id = $2 RETURNING *`,
        [req.params.id, req.sellerId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
      res.json(toCamel(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Timetable for a teacher (by user_id)
  // ============================================
  app.get('/api/sms/teachers/:teacherId/timetable', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.teacherId)) return res.status(400).json({ message: 'Invalid teacher ID' });
      const { dayOfWeek } = req.query;
      const params = [req.params.teacherId, req.sellerId];
      let dayClause = '';
      if (dayOfWeek !== undefined && dayOfWeek !== null && dayOfWeek !== '') {
        const dow = parseInt(dayOfWeek, 10);
        if (!isNaN(dow)) {
          params.push(dow);
          dayClause = ` AND t.day_of_week = $${params.length}`;
        }
      }
      const result = await db.query(
        `SELECT t.*, s.name as subject_name, c.name as class_name, sec.name as section_name FROM sms_timetable t
         LEFT JOIN sms_subjects s ON t.subject_id = s.id
         LEFT JOIN sms_classes c ON t.class_id = c.id
         LEFT JOIN sms_sections sec ON t.section_id = sec.id
         WHERE t.teacher_id IN (SELECT id FROM sms_teaching_staff WHERE user_id = $1 AND seller_id = $2)${dayClause}
         ORDER BY t.day_of_week, t.period_number`,
        params
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Timetable for a class (nested route, mirrors /timetable/class/:classId)
  // ============================================
  app.get('/api/sms/classes/:classId/timetable', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.classId)) return res.status(400).json({ message: 'Invalid class ID' });
      const { section_id } = req.query;
      let result;
      if (section_id && isValidUuid(section_id)) {
        result = await db.query(
          `SELECT t.*, s.name as subject_name, ts.first_name, ts.last_name FROM sms_timetable t
           LEFT JOIN sms_subjects s ON t.subject_id = s.id
           LEFT JOIN sms_teaching_staff ts ON t.teacher_id = ts.id
           WHERE t.class_id = $1 AND t.section_id = $2 AND t.seller_id = $3
           ORDER BY t.day_of_week, t.period_number`,
          [req.params.classId, section_id, req.sellerId]
        );
      } else {
        result = await db.query(
          `SELECT t.*, s.name as subject_name, ts.first_name, ts.last_name FROM sms_timetable t
           LEFT JOIN sms_subjects s ON t.subject_id = s.id
           LEFT JOIN sms_teaching_staff ts ON t.teacher_id = ts.id
           WHERE t.class_id = $1 AND t.seller_id = $2
           ORDER BY t.day_of_week, t.period_number`,
          [req.params.classId, req.sellerId]
        );
      }
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Student's submissions for an assignment
  // ============================================
  app.get('/api/sms/assignments/:id/submissions', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid assignment ID' });
      const result = await db.query(
        `SELECT sub.*, s.student_id, s.first_name, s.last_name FROM sms_submissions sub
         JOIN sms_students s ON sub.student_id = s.id
         WHERE sub.assignment_id = $1 AND sub.seller_id = $2 ORDER BY s.last_name, s.first_name`,
        [req.params.id, req.sellerId]
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Sections for a class (nested route)
  // ============================================
  app.get('/api/sms/classes/:id/sections', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid class ID' });
      const result = await db.query(
        `SELECT s.* FROM sms_sections s
         WHERE s.class_id = $1 AND s.seller_id = $2 AND s.is_active = TRUE
         ORDER BY s.name`,
        [req.params.id, req.sellerId]
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Students for a guardian (nested route)
  // ============================================
  app.get('/api/sms/guardians/:id/students', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid guardian ID' });
      const result = await db.query(
        `SELECT s.* FROM sms_students s
         WHERE s.guardian_id = $1 AND s.seller_id = $2 AND s.is_active = TRUE
         ORDER BY s.last_name, s.first_name`,
        [req.params.id, req.sellerId]
      );
      res.json(toCamel(result.rows));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  // ============================================
  // Custom: Publish announcement (PATCH)
  // ============================================
  app.patch('/api/sms/announcements/:id/publish', authenticateToken, requireSchool, async (req, res) => {
    try {
      if (!isValidUuid(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
      const result = await db.query(
        `UPDATE sms_announcements SET is_active = TRUE WHERE id = $1 AND seller_id = $2 RETURNING *`,
        [req.params.id, req.sellerId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
      res.json(toCamel(result.rows[0]));
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  console.log('✅ SMS routes mounted');
}
