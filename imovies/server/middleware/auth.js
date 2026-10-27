const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const getToken = (req) => {
  const h = req.headers.authorization;
  return h && h.startsWith('Bearer ') ? h.split(' ')[1] : null;
};

exports.protect = asyncHandler(async (req, res, next) => {
  const token = getToken(req);
  if (!token) throw new AppError('Please log in to continue', 401);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  if (!user) throw new AppError('This account no longer exists', 401);
  req.user = user;
  next();
});

// Attaches req.user when a valid token is present, but never blocks the request.
exports.optionalAuth = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    }
  } catch (e) {
    /* ignore invalid token on public routes */
  }
  next();
};

exports.authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(new AppError('You do not have permission to do that', 403));
