/**
 * User profile routes
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const {
  deriveAgeFields,
  parseBirthDate,
  calculateAgeFromBirthDate,
  isAllowedUserAge,
  AGE_OUT_OF_RANGE_MESSAGE,
} = require('../utils/birthDate');
const { ageFromNumber } = require('../utils/resolveQuizAgeGroup');
const { normalizeGrade, isValidGrade } = require('../utils/grades');
const { normalizePhone, mapPhoneFields } = require('../utils/phone');
const { isProfileComplete } = require('../utils/profileComplete');
const { ensureStudentOnboarding } = require('../utils/registerNewUser');

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

    const userRow = result.rows[0];
    res.json({
      success: true,
      user: mapUserResponse(userRow),
      profileComplete: isProfileComplete(userRow),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update user profile.
 * Phone and language are always editable. Birth date and grade can be set once when missing
 * (e.g. after Google sign-in without email registration).
 */
router.put('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { phone, phoneCountry, preferredLanguage, birthDate, grade } = req.body;

    const currentUserResult = await pool.query(
      `SELECT id, birth_date, grade, preferred_language, phone, phone_country
       FROM users WHERE id = $1`,
      [userId]
    );

    if (currentUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const currentUser = currentUserResult.rows[0];
    const wasProfileComplete = isProfileComplete(currentUser);
    let birthDateValue = currentUser.birth_date;
    let ageValue = null;
    let ageGroupValue = null;
    let gradeValue = currentUser.grade;

    if (birthDate !== undefined && !currentUser.birth_date) {
      const birthDateResult = parseBirthDate(birthDate);
      if (birthDateResult.error) {
        return res.status(400).json({
          success: false,
          message: birthDateResult.error,
        });
      }

      const derivedAge = calculateAgeFromBirthDate(birthDateResult.value);
      if (derivedAge == null) {
        return res.status(400).json({
          success: false,
          message: 'Could not determine age from date of birth',
        });
      }
      if (!isAllowedUserAge(derivedAge)) {
        return res.status(400).json({
          success: false,
          message: AGE_OUT_OF_RANGE_MESSAGE,
        });
      }

      birthDateValue = birthDateResult.value;
      ageValue = derivedAge;
      ageGroupValue = ageFromNumber(derivedAge);
    } else if (currentUser.birth_date) {
      const { age, ageGroup } = deriveAgeFields(currentUser);
      ageValue = age;
      ageGroupValue = ageGroup;
    }

    if (grade !== undefined && !currentUser.grade) {
      const normalizedGrade = normalizeGrade(grade);
      if (!normalizedGrade) {
        return res.status(400).json({
          success: false,
          message: 'Grade or class is required',
        });
      }
      if (!isValidGrade(normalizedGrade)) {
        return res.status(400).json({
          success: false,
          message: 'Please select a valid grade or class',
        });
      }
      gradeValue = normalizedGrade;
    }

    let phoneValue = null;
    let phoneCountryValue = null;

    if (phone !== undefined || phoneCountry !== undefined) {
      const normalized = normalizePhone(
        phone !== undefined ? phone : currentUser.phone,
        phoneCountry !== undefined ? phoneCountry : currentUser.phone_country
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
      phoneValue = currentUser.phone ?? null;
      phoneCountryValue = currentUser.phone_country ?? null;
    }

    const languageValue =
      preferredLanguage !== undefined
        ? preferredLanguage || null
        : currentUser.preferred_language;

    const result = await pool.query(
      `UPDATE users
       SET phone = $1,
           phone_country = $2,
           preferred_language = $3,
           birth_date = COALESCE($4, birth_date),
           age = COALESCE($5, age),
           age_group = COALESCE($6, age_group),
           grade = COALESCE($7, grade),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING id, email, name, age, age_group, grade, preferred_language, phone, phone_country, birth_date, buddy_id, created_at`,
      [
        phoneValue,
        phoneCountryValue,
        languageValue,
        birthDateValue,
        ageValue,
        ageGroupValue,
        gradeValue,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const updatedRow = result.rows[0];
    const profileComplete = isProfileComplete(updatedRow);

    if (profileComplete) {
      try {
        await ensureStudentOnboarding(pool, userId, userId);
      } catch (onboardingError) {
        console.error(
          `Student onboarding failed for user ${userId} after profile update:`,
          onboardingError.message || onboardingError
        );
      }
    }

    res.json({
      success: true,
      user: mapUserResponse(updatedRow),
      profileComplete,
      message: wasProfileComplete
        ? 'Profile updated successfully'
        : profileComplete
          ? 'Profile completed. Welcome to Guru ID!'
          : 'Profile updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
