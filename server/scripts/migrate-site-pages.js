/**
 * Migration: site_pages table for privacy policy, PII disclaimer, and other legal content.
 */

const { pool } = require('../config/database');

const DEFAULT_PAGES = [
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    metaDescription: 'How Kid Chatbox collects, stores, and protects your data.',
    body: `## Privacy Policy

**Last updated:** ${new Date().toISOString().slice(0, 10)}

Kid Chatbox is committed to protecting the privacy of children, parents, and educators who use our platform.

### Information We Collect

- **Account information:** name, email, age/grade, and parent contact details when provided during registration.
- **Learning activity:** quiz attempts, study progress, chat history with our AI tutor, and usage analytics to improve learning outcomes.
- **Technical data:** device type, browser, and session information needed to keep the service secure and reliable.

### How We Use Your Data

- Deliver personalized learning experiences (quizzes, study plans, AI tutoring).
- Secure your account and prevent unauthorized access.
- Improve platform features and content quality.
- Communicate important service updates to parents and guardians when applicable.

### Data Security

We store all personal and learning data **securely** using industry-standard protections:

- Encrypted connections (HTTPS/TLS) for all data in transit.
- Access controls and role-based permissions for admin and staff.
- Regular security reviews and least-privilege access to production systems.

We do **not** sell personal information to third parties.

### Children's Privacy

Kid Chatbox is designed for learners aged 6–14. We collect only the minimum information needed for safe, effective learning. Parent or guardian contact may be requested for account verification and important notifications.

### Data Retention

We retain account and learning data while your account is active. You may request account deletion by contacting support; we will remove or anonymize personal data within a reasonable timeframe, subject to legal obligations.

### Your Rights

Depending on your location, you may have the right to access, correct, or delete personal data. Contact us to exercise these rights.

### Contact

For privacy questions, reach out through the in-app feedback form or your account administrator.`,
  },
  {
    slug: 'pii-disclaimer',
    title: 'PII Data Disclaimer',
    metaDescription: 'Disclaimer about personally identifiable information (PII) stored on Kid Chatbox.',
    body: `## PII Data Disclaimer

**Important notice about personally identifiable information (PII)**

By using Kid Chatbox, you acknowledge the following regarding data we store securely on our platform.

### What Is PII?

Personally Identifiable Information (PII) includes data that can identify an individual, such as:

- Full name and email address
- Age, grade, or school-related details
- Parent or guardian contact information
- Profile photos or avatars you upload
- Learning records linked to your account

### Secure Storage Commitment

> **We save your data securely.** All PII is stored in protected databases with encrypted transport, authenticated access, and administrative audit controls.

Only authorized personnel with appropriate permissions can access administrative systems. Student-facing features expose only the data needed for learning.

### Your Responsibilities

- Provide accurate information during registration.
- Keep login credentials confidential.
- Parents and guardians should supervise account creation for children under applicable age limits.
- Do not share sensitive personal details in AI chat beyond what is necessary for learning.

### Third-Party Services

Some features (such as AI tutoring or analytics) may process data through vetted service providers under strict data-handling agreements. We do not authorize partners to use PII for unrelated marketing.

### Disclaimer

This notice is provided for transparency and does not replace our full Privacy Policy. Kid Chatbox makes reasonable efforts to protect PII but cannot guarantee absolute security against all threats. Use of the platform constitutes acceptance of this disclaimer and our privacy practices.

For questions about PII handling, please refer to our Privacy Policy or contact support.`,
  },
];

async function migrateSitePages() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS site_pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        meta_description TEXT,
        is_published BOOLEAN DEFAULT true,
        updated_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_site_pages_slug ON site_pages(slug)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_site_pages_is_published ON site_pages(is_published)
    `);

    await client.query(`
      INSERT INTO permissions (name, description, resource, action)
      VALUES ('manage_site_content', 'Edit privacy policy, disclaimers, and site pages', 'site_pages', 'manage')
      ON CONFLICT (name) DO NOTHING
    `);

    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name = 'admin' AND p.name = 'manage_site_content'
      ON CONFLICT DO NOTHING
    `);

    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name = 'content_manager' AND p.name = 'manage_site_content'
      ON CONFLICT DO NOTHING
    `);

    for (const page of DEFAULT_PAGES) {
      await client.query(
        `INSERT INTO site_pages (slug, title, body, meta_description, is_published)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (slug) DO NOTHING`,
        [page.slug, page.title, page.body, page.metaDescription]
      );
    }

    await client.query('COMMIT');
    console.log('✅ site_pages table and default legal content ready');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ migrate-site-pages failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateSitePages()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateSitePages };
