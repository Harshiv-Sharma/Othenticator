const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  is2FAEnabled: {
    type: Boolean,
    default: false
  },
  totpSecret: {
    type: String,
    default: ''
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordChangedAt: Date,
  // For bonus: backupCodes: [String]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
