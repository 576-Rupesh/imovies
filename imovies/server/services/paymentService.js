const crypto = require('crypto');
const AppError = require('../utils/AppError');

const luhn = (num) => {
  let sum = 0;
  let double = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
};

/**
 * Demo payment gateway (no real money moves).
 *  - 4242 4242 4242 4242 -> succeeds
 *  - any valid card ending in 0002 -> declined by the "bank"
 * Swap this file for Razorpay / Stripe in a real deployment.
 */
exports.charge = ({ cardNumber, name, expiry, cvv }, amount) => {
  const digits = String(cardNumber || '').replace(/\s+/g, '');
  if (!/^\d{13,19}$/.test(digits) || !luhn(digits)) throw new AppError('Card number is not valid', 400);
  if (!name || String(name).trim().length < 2) throw new AppError('Name on card is required', 400);
  if (!/^\d{3,4}$/.test(String(cvv || ''))) throw new AppError('CVV must be 3 or 4 digits', 400);

  const m = /^(\d{2})\/(\d{2})$/.exec(String(expiry || ''));
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) throw new AppError('Expiry must be in MM/YY format', 400);
  const expiresAt = new Date(2000 + Number(m[2]), Number(m[1]), 1); // first day of the month after expiry
  if (expiresAt <= new Date()) throw new AppError('This card has expired', 400);

  const transactionId = `TXN${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const last4 = digits.slice(-4);
  if (last4 === '0002') {
    return { success: false, transactionId, last4, message: 'Payment declined by your bank. Try another card.' };
  }
  return { success: true, transactionId, last4, amount };
};
