/**
 * App learning feedback routes
 */

const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const VALID_SOURCES = new Set(['sidebar', 'quiz_results', 'global']);
const MAX_MESSAGE_LEN = 2000;
const MAX_WISHES = 10;

router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      rating,
      featureWishes = [],
      message,
      source = 'global',
      quizSubject,
      quizScore,
      quizTotal,
    } = req.body;

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    if (!Array.isArray(featureWishes)) {
      return res.status(400).json({
        success: false,
        message: 'featureWishes must be an array',
      });
    }

    if (featureWishes.length > MAX_WISHES) {
      return res.status(400).json({
        success: false,
        message: `Select at most ${MAX_WISHES} features`,
      });
    }

    const cleanedWishes = featureWishes
      .filter((w) => typeof w === 'string' && w.trim().length > 0)
      .map((w) => w.trim().slice(0, 64));

    const trimmedMessage =
      typeof message === 'string' && message.trim().length > 0
        ? message.trim().slice(0, MAX_MESSAGE_LEN)
        : null;

    const feedbackSource = VALID_SOURCES.has(source) ? source : 'global';

    const result = await pool.query(
      `INSERT INTO app_feedback (
        user_id, rating, feature_wishes, message, source,
        quiz_subject, quiz_score, quiz_total
      ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8)
      RETURNING id`,
      [
        userId,
        numericRating,
        JSON.stringify(cleanedWishes),
        trimmedMessage,
        feedbackSource,
        typeof quizSubject === 'string' ? quizSubject.slice(0, 128) : null,
        Number.isFinite(Number(quizScore)) ? Number(quizScore) : null,
        Number.isFinite(Number(quizTotal)) ? Number(quizTotal) : null,
      ],
    );

    res.status(201).json({
      success: true,
      message: 'Thanks! Your feedback helps us build better learning tools.',
      id: result.rows[0].id,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
