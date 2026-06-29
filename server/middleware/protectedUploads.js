/**
 * Authenticated static serving for user-uploaded files.
 */

const express = require('express');
const path = require('path');
const { authenticateToken } = require('./auth');

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

function createProtectedUploads(subdir) {
  const router = express.Router();
  router.use(authenticateToken);
  router.use(express.static(path.join(UPLOADS_ROOT, subdir)));
  return router;
}

module.exports = {
  studyLibrary: createProtectedUploads('study-library'),
  quizImages: createProtectedUploads('quiz-images'),
  paymentProofs: createProtectedUploads('payment-proofs'),
};
