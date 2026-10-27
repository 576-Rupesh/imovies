const rateLimit = require('express-rate-limit');

const make = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message },
  });

exports.apiLimiter = make(15 * 60 * 1000, 600, 'Too many requests. Please try again in a few minutes.');
exports.authLimiter = make(15 * 60 * 1000, 30, 'Too many login attempts. Please try again in 15 minutes.');
exports.bookingLimiter = make(10 * 60 * 1000, 40, 'Too many booking attempts. Please wait a few minutes.');
