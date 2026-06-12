/**
 * User profile routes
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { deriveAgeFields } = require('../utils/birthDate');
const { normalizePhone, mapPhoneFields } = require('../utils/phone');

const router = express.Router();

function mapUserResponse(userRow) {
  const { age, ageGroup, birthDate } = deriveAgeFields(userRow);
  const { phone, phoneCountry } = mapPhoneFields(userRow);

  return {
    id: userRow.id,
    email: userRow.email,
    name: userRow.name,
    age,
    grade: userRow.grade,
    preferredLanguage: userRow.preferred_language,
    phone,
    phoneCountry,
    birthDate,
    buddyId: userRow.buddy_id,
    createdAt: userRow.created_at,
    ageGroup,
  };
}

/**
 * Get user profile
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, email, name, age, age_group, grade, preferred_language, phone, phone_country, birth_date, buddy_id, created_at
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

    res.json({
      success: true,
      user: mapUserResponse(result.rows[0]),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update user profile (phone and language only — name/DOB are admin-managed)
 */
router.put('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { phone, phoneCountry, preferredLanguage } = req.body;

    let phoneValue = null;
    let phoneCountryValue = null;

    if (phone !== undefined || phoneCountry !== undefined) {
      const current = await pool.query(
        'SELECT phone, phone_country FROM users WHERE id = $1',
        [userId]
      );
      const normalized = normalizePhone(
        phone !== undefined ? phone : current.rows[0]?.phone,
        phoneCountry !== undefined ? phoneCountry : current.rows[0]?.phone_country
      );
      if (normalized.error) {
        return res.status(400).json({
          success: false,
          message: normalized.error,
        });
      }
      phoneValue = normalized.phone;
      phoneCountryValue = normalized.phoneCountry;
    } else {
      const current = await pool.query(
        'SELECT phone, phone_country FROM users WHERE id = $1',
        [userId]
      );
      phoneValue = current.rows[0]?.phone ?? null;
      phoneCountryValue = current.rows[0]?.phone_country ?? null;
    }

    const result = await pool.query(
      `UPDATE users
       SET phone = $1,
           phone_country = $2,
           preferred_language = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, name, age, age_group, grade, preferred_language, phone, phone_country, birth_date, buddy_id, created_at`,
      [phoneValue, phoneCountryValue, preferredLanguage || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user: mapUserResponse(result.rows[0]),
      message: 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
