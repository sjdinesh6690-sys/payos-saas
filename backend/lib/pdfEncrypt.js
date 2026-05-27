/**
 * pdfEncrypt.js — Password-protect PDF buffers using qpdf
 *
 * Uses the qpdf system binary (available on Render's Ubuntu environment).
 * Password = employee's DOB in DDMMYYYY format (e.g., 15031990).
 * Falls back gracefully to unencrypted PDF if qpdf is unavailable.
 */

const { execSync } = require('child_process');
const fs  = require('fs');
const os  = require('os');
const path = require('path');
const crypto = require('crypto');

const OWNER_PASSWORD = process.env.PDF_OWNER_PASSWORD || 'PayLeefAdmin@2024';

/**
 * Format a date_of_birth value (any parseable date) as DDMMYYYY.
 * Returns null if DOB is not available.
 */
function formatDobAsPassword(dob) {
  if (!dob) return null;
  try {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    return `${dd}${mm}${yyyy}`;
  } catch {
    return null;
  }
}

/**
 * Encrypt a PDF buffer with a user password using qpdf (AES-256).
 * @param {Buffer} pdfBuffer  — unencrypted PDF
 * @param {string} password   — user password (e.g., '15031990')
 * @returns {Buffer}           — encrypted PDF (or original if qpdf unavailable)
 */
function encryptPDF(pdfBuffer, password) {
  if (!password) return pdfBuffer;

  // Create unique temp file paths to avoid race conditions
  const uid    = crypto.randomBytes(8).toString('hex');
  const tmpIn  = path.join(os.tmpdir(), `pl_in_${uid}.pdf`);
  const tmpOut = path.join(os.tmpdir(), `pl_out_${uid}.pdf`);

  try {
    fs.writeFileSync(tmpIn, pdfBuffer);

    // AES-256 encryption, restrict modify/copy, allow printing
    execSync(
      `qpdf --encrypt "${password}" "${OWNER_PASSWORD}" 256 ` +
      `--print=full --modify=none --extract=n -- ` +
      `"${tmpIn}" "${tmpOut}"`,
      { timeout: 15_000 }
    );

    const encrypted = fs.readFileSync(tmpOut);
    return encrypted;
  } catch (err) {
    console.warn('[pdfEncrypt] qpdf failed, returning unencrypted PDF:', err.message?.slice(0, 120));
    return pdfBuffer; // graceful fallback
  } finally {
    try { fs.unlinkSync(tmpIn);  } catch {}
    try { fs.unlinkSync(tmpOut); } catch {}
  }
}

module.exports = { encryptPDF, formatDobAsPassword };
