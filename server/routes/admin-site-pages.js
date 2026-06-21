/**
 * Admin API: manage site pages (privacy policy, PII disclaimer, etc.)
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);
router.use(checkPermission('manage_site_content'));

const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function mapRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    body: row.body,
    metaDescription: row.meta_description,
    isPublished: row.is_published,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, slug, title, body, meta_description, is_published, updated_by, created_at, updated_at
       FROM site_pages
       ORDER BY title ASC`
    );
    res.json({ success: true, pages: result.rows.map(mapRow) });
  } catch (error) {
    next(error);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const result = await pool.query(
      `SELECT id, slug, title, body, meta_description, is_published, updated_by, created_at, updated_at
       FROM site_pages WHERE slug = $1`,
      [slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }
    res.json({ success: true, page: mapRow(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.put('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { title, body, metaDescription, isPublished } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    if (typeof body !== 'string') {
      return res.status(400).json({ success: false, message: 'Body must be a string' });
    }

    const result = await pool.query(
      `UPDATE site_pages
       SET title = $1, body = $2, meta_description = $3, is_published = $4,
           updated_by = $5, updated_at = CURRENT_TIMESTAMP
       WHERE slug = $6
       RETURNING id, slug, title, body, meta_description, is_published, updated_by, created_at, updated_at`,
      [
        title.trim(),
        body,
        metaDescription?.trim() || null,
        isPublished !== false,
        req.user.id,
        slug,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }

    res.json({ success: true, page: mapRow(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { slug, title, body, metaDescription, isPublished } = req.body;

    if (!slug || !VALID_SLUG.test(slug)) {
      return res.status(400).json({
        success: false,
        message: 'Slug is required (lowercase letters, numbers, hyphens only)',
      });
    }
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    if (typeof body !== 'string') {
      return res.status(400).json({ success: false, message: 'Body must be a string' });
    }

    const result = await pool.query(
      `INSERT INTO site_pages (slug, title, body, meta_description, is_published, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, slug, title, body, meta_description, is_published, updated_by, created_at, updated_at`,
      [
        slug,
        title.trim(),
        body,
        metaDescription?.trim() || null,
        isPublished !== false,
        req.user.id,
      ]
    );

    res.status(201).json({ success: true, page: mapRow(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'A page with this slug already exists' });
    }
    next(error);
  }
});

module.exports = router;
