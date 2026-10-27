const mongoose = require('mongoose');
const AppError = require('./AppError');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.isEmail = (v) => typeof v === 'string' && EMAIL.test(v.trim());
exports.isObjectId = (v) => typeof v === 'string' && mongoose.isValidObjectId(v);

// Query-string values can be objects (?a[$ne]=x). Only accept plain strings.
exports.str = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

exports.requireFields = (body, fields) => {
  const missing = fields.filter(
    (f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === ''
  );
  if (missing.length) throw new AppError(`Missing required field(s): ${missing.join(', ')}`, 400);
};

exports.escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.toArray = (v) => {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
};

exports.parsePage = (query, defLimit = 10, maxLimit = 50) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

// 'YYYY-MM-DD' -> [start, end) of that day in server local time
exports.dayRange = (dateStr) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) throw new AppError('Date must be in YYYY-MM-DD format', 400);
  const start = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(start.getTime())) throw new AppError('Invalid date', 400);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return [start, end];
};
