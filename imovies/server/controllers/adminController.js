const User = require('../models/User');
const Movie = require('../models/Movie');
const Show = require('../models/Show');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const { parsePage } = require('../utils/validators');

exports.stats = asyncHandler(async (req, res) => {
  const [users, movies, upcomingShows, bookings, revenue] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Movie.countDocuments({ status: { $ne: 'archived' } }),
    Show.countDocuments({ isActive: true, startTime: { $gte: new Date() } }),
    Booking.countDocuments({ status: 'confirmed' }),
    Payment.aggregate([{ $match: { status: 'success' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);
  res.json({ success: true, stats: { users, movies, upcomingShows, bookings, revenue: revenue[0]?.total || 0 } });
});

exports.allBookings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, 10, 50);
  const [bookings, total] = await Promise.all([
    Booking.find().sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('user', 'name email').populate('movie', 'title').populate('theatre', 'name city'),
    Booking.countDocuments(),
  ]);
  res.json({ success: true, bookings, page, pages: Math.ceil(total / limit) || 1, total });
});
