const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

// Generate a TOTP secret for a user
function generateTOTPSecret(email) {
  return speakeasy.generateSecret({
    name: `AuthenticatorApp (${email})`,
    length: 20,
  });
}

// Generate QR code for otpauth URI
async function generateQRCode(otpauthUrl) {
  try {
    return await qrcode.toDataURL(otpauthUrl);
  } catch (err) {
    throw new Error('QR code generation failed');
  }
}

// Verify a TOTP code
function verifyTOTP(token, secret) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2,
  });
}

module.exports = {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTP,
};
