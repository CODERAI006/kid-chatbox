/**
 * Payment / UPI settings helpers (admin-configurable).
 */

const { pool } = require('../config/database');

function mapRow(row) {
  if (!row) {
    return {
      enabled: false,
      upiId: '',
      phoneNumber: '',
      payeeName: '',
      qrImagePath: null,
      instructions: '',
    };
  }
  return {
    enabled: row.enabled === true,
    upiId: row.upi_id || '',
    phoneNumber: row.phone_number || '',
    payeeName: row.payee_name || '',
    qrImagePath: row.qr_image_path || null,
    instructions: row.instructions || '',
  };
}

async function getPaymentSettings() {
  const r = await pool.query('SELECT * FROM payment_settings WHERE id = 1');
  return mapRow(r.rows[0]);
}

async function updatePaymentSettings(patch) {
  const fields = [];
  const vals = [];
  let i = 1;

  if (typeof patch.enabled === 'boolean') {
    fields.push(`enabled = $${i++}`);
    vals.push(patch.enabled);
  }
  if (patch.upiId !== undefined) {
    fields.push(`upi_id = $${i++}`);
    vals.push(String(patch.upiId || '').trim() || null);
  }
  if (patch.phoneNumber !== undefined) {
    fields.push(`phone_number = $${i++}`);
    vals.push(String(patch.phoneNumber || '').trim() || null);
  }
  if (patch.payeeName !== undefined) {
    fields.push(`payee_name = $${i++}`);
    vals.push(String(patch.payeeName || '').trim() || null);
  }
  if (patch.qrImagePath !== undefined) {
    fields.push(`qr_image_path = $${i++}`);
    vals.push(patch.qrImagePath || null);
  }
  if (patch.instructions !== undefined) {
    fields.push(`instructions = $${i++}`);
    vals.push(String(patch.instructions || '').trim() || null);
  }

  if (!fields.length) return getPaymentSettings();

  fields.push('updated_at = CURRENT_TIMESTAMP');
  await pool.query(`UPDATE payment_settings SET ${fields.join(', ')} WHERE id = 1`, vals);
  return getPaymentSettings();
}

/** Public-safe subset for upgrade UI */
async function getPublicPaymentConfig() {
  const s = await getPaymentSettings();
  if (!s.enabled) {
    return { enabled: false, upiId: '', phoneNumber: '', payeeName: '', qrImageUrl: null, instructions: '' };
  }
  return {
    enabled: true,
    upiId: s.upiId,
    phoneNumber: s.phoneNumber,
    payeeName: s.payeeName,
    qrImageUrl: s.qrImagePath ? `/uploads/payment-public/${s.qrImagePath}` : null,
    instructions: s.instructions,
  };
}

module.exports = {
  getPaymentSettings,
  updatePaymentSettings,
  getPublicPaymentConfig,
};
