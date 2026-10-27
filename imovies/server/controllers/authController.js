const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { requireFields, isEmail } = require('../utils/validators');

const sign = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role });

exports.register = asyncHandler(async (req, res) => {
  requireFields(req.body, ['name', 'email', 'password']);
  const { name, email, password, phone } = req.body;
  if (!isEmail(email)) throw new AppError('Please enter a valid email', 400);
  if (typeof password !== 'string' || password.length < 6) throw new AppError('Password must be at least 6 characters', 400);

  if (await User.exists({ email: email.toLowerCase().trim() })) {
    throw new AppError('An account with this email already exists', 409);
  }
  // role is never taken from the request body: public sign-ups are always "user"
  const user = await User.create({ name, email, password, phone });
  res.status(201).json({ success: true, token: sign(user._id), user: publicUser(user) });
});

exports.login = asyncHandler(async (req, res) => {
  requireFields(req.body, ['email', 'password']);
  const { email, password } = req.body;
  if (typeof email !== 'string' || typeof password !== 'string') throw new AppError('Invalid credentials', 400);

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw new AppError('Invalid email or password', 401);
  res.json({ success: true, token: sign(user._id), user: publicUser(user) });
});

exports.getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});
