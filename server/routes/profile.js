/**
 * User profile routes
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

function normalizePhone(value) {
  if (value == null || value === '') return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return { error: 'Mobile number must be 10–15 digits' };
  }
  return { value: digits };
}

/**
 * Get user profile
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, email, name, age, grade, preferred_language, phone, birth_date, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        age: user.age,
        grade: user.grade,
        preferredLanguage: user.preferred_language,
        phone: user.phone,
        birthDate: user.birth_date,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update user profile (mobile and language — identity fields are admin-managed)
 */
router.put('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { phone, preferredLanguage } = req.body;

    let phoneValue = null;
    if (phone !== undefined) {
      const normalized = normalizePhone(phone);
      if (normalized?.error) {
        return res.status(400).json({
          success: false,
          message: normalized.error,
        });
      }
      phoneValue = normalized?.value ?? null;
    } else {
      const current = await pool.query('SELECT phone FROM users WHERE id = $1', [userId]);
      phoneValue = current.rows[0]?.phone ?? null;
    }

    const result = await pool.query(
      `UPDATE users
       SET phone = $1,
           preferred_language = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, email, name, age, grade, preferred_language, phone, birth_date, created_at`,
      [phoneValue, preferredLanguage || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        age: user.age,
        grade: user.grade,
        preferredLanguage: user.preferred_language,
        phone: user.phone,
        birthDate: user.birth_date,
        createdAt: user.created_at,
      },
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
