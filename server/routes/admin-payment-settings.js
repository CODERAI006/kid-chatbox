/**
 * Admin — UPI / payment configuration
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const { getPaymentSettings, updatePaymentSettings } = require('../utils/paymentSettings');

const router = express.Router();
router.use(authenticateToken);
router.use(checkPermission('manage_users'));

const publicDir = path.join(__dirname, '../../uploads/payment-public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, publicDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    cb(null, `qr-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || '').toLowerCase();
    if (mime.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed for QR code'));
  },
});

/** GET /api/admin/payment-settings */
router.get('/', async (_req, res, next) => {
  try {
    const settings = await getPaymentSettings();
    res.json({
      success: true,
      settings: {
        ...settings,
        qrImageUrl: settings.qrImagePath ? `/uploads/payment-public/${settings.qrImagePath}` : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** PUT /api/admin/payment-settings */
router.put('/', async (req, res, next) => {
  try {
    const { enabled, upiId, phoneNumber, payeeName, instructions } = req.body || {};
    const settings = await updatePaymentSettings({
      enabled: typeof enabled === 'boolean' ? enabled : undefined,
      upiId,
      phoneNumber,
      payeeName,
      instructions,
    });
    res.json({
      success: true,
      settings: {
        ...settings,
        qrImageUrl: settings.qrImagePath ? `/uploads/payment-public/${settings.qrImagePath}` : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/admin/payment-settings/qr — upload QR image */
router.post('/qr', upload.single('qr'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'QR image file is required' });
    }
    const current = await getPaymentSettings();
    if (current.qrImagePath) {
      const oldPath = path.join(publicDir, current.qrImagePath);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    const settings = await updatePaymentSettings({ qrImagePath: req.file.filename });
    res.json({
      success: true,
      settings: {
        ...settings,
        qrImageUrl: `/uploads/payment-public/${req.file.filename}`,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
