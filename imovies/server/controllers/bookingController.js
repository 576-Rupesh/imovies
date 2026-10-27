const crypto = require('crypto');
const Booking = require('../models/Booking');
const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { emitSeatUpdate } = require('../utils/socket');
const { charge } = require('../services/paymentService');
const { CLEAR_LOCK, MAX_SEATS } = require('../services/seatService');
const { str, parsePage, isObjectId, toArray } = require('../utils/validators');

const FEE_PER_TICKET = 20;
const CANCEL_CUTOFF_MS = 2 * 60 * 60 * 1000; // no cancellations within 2 hours of the show

const newCode = () => `IM${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const populate = (q) => q.populate('movie', 'title poster language duration rating').populate('theatre', 'name city address').populate('payment', 'status transactionId cardLast4 method');

// POST /api/bookings  { showId, seats: ["A1"], payment: { cardNumber, name, expiry, cvv } }
exports.createBooking = asyncHandler(async (req, res) => {
  const { showId, payment } = req.body;
  const labels = [...new Set(toArray(req.body.seats))];
  if (!isObjectId(String(showId))) throw new AppError('Invalid show', 400);
  if (!labels.length || labels.length > MAX_SEATS) throw new AppError(`Choose between 1 and ${MAX_SEATS} seats`, 400);
  if (!payment || typeof payment !== 'object') throw new AppError('Payment details are required', 400);

  const show = await Show.findById(showId);
  if (!show || !show.isActive) throw new AppError('Show not found', 404);
  if (show.startTime <= new Date()) throw new AppError('This show has already started', 400);

  // the user must still hold every seat
  const seatDocs = await Seat.find({ show: show._id, label: { $in: labels } });
  const now = new Date();
  const held = seatDocs.length === labels.length && seatDocs.every(
    (s) => s.status === 'locked' && String(s.lockedBy) === String(req.user._id) && s.lockedUntil > now
  );
  if (!held) throw new AppError('Your seat hold has expired. Please pick your seats again.', 409);

  const subtotal = seatDocs.reduce((sum, s) => sum + s.price, 0);
  const convenienceFee = FEE_PER_TICKET * labels.length;
  const totalAmount = subtotal + convenienceFee;

  const result = charge(payment, totalAmount); // throws 400 on malformed card details
  const paymentDoc = await Payment.create({
    user: req.user._id, show: show._id, amount: totalAmount, method: 'card',
    cardLast4: result.last4, transactionId: result.transactionId,
    status: result.success ? 'success' : 'failed',
    failureReason: result.success ? undefined : result.message,
  });
  if (!result.success) {
    return res.status(402).json({ success: false, message: result.message });
  }

  // turn the holds into bookings, but only if they are still ours
  const done = await Seat.updateMany(
    { show: show._id, label: { $in: labels }, status: 'locked', lockedBy: req.user._id, lockedUntil: { $gt: new Date() } },
    { $set: { status: 'booked' }, $unset: { lockedBy: '', lockedUntil: '' } }
  );
  if (done.matchedCount !== labels.length) {
    // hold lapsed while paying: refund, and put back anything we did flip
    paymentDoc.status = 'refunded';
    await paymentDoc.save();
    await Seat.updateMany({ show: show._id, label: { $in: labels }, status: 'booked', booking: { $exists: false } }, CLEAR_LOCK);
    throw new AppError('Your seats were released before payment finished. You have not been charged.', 409);
  }

  const booking = await Booking.create({
    bookingCode: newCode(), user: req.user._id, show: show._id, movie: show.movie, theatre: show.theatre,
    screen: show.screen, showTime: show.startTime,
    seats: seatDocs.map((s) => ({ label: s.label, category: s.category, price: s.price })),
    subtotal, convenienceFee, totalAmount, payment: paymentDoc._id,
  });
  paymentDoc.booking = booking._id;
  await paymentDoc.save();
  await Seat.updateMany({ show: show._id, label: { $in: labels } }, { $set: { booking: booking._id } });

  await Notification.create({
    user: req.user._id, type: 'booking', title: 'Booking confirmed',
    message: `Seats ${labels.join(', ')} are yours. Booking code ${booking.bookingCode}.`,
  });
  emitSeatUpdate(show._id, labels.map((label) => ({ label, status: 'booked' })));

  res.status(201).json({ success: true, booking: { id: booking._id, bookingCode: booking.bookingCode } });
});

// GET /api/bookings/my?type=upcoming|past|all&page=&limit=
exports.myBookings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, 6, 30);
  const type = str(req.query.type) || 'all';
  const filter = { user: req.user._id };
  if (type === 'upcoming') Object.assign(filter, { status: 'confirmed', showTime: { $gte: new Date() } });
  else if (type === 'past') filter.$or = [{ status: 'cancelled' }, { showTime: { $lt: new Date() } }];

  const sort = type === 'upcoming' ? { showTime: 1 } : { showTime: -1 };
  const [bookings, total] = await Promise.all([
    populate(Booking.find(filter).sort(sort).skip(skip).limit(limit)),
    Booking.countDocuments(filter),
  ]);
  res.json({ success: true, bookings, page, pages: Math.ceil(total / limit) || 1, total });
});

exports.getBooking = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) throw new AppError('Invalid booking id', 400);
  const booking = await populate(Booking.findById(req.params.id));
  if (!booking) throw new AppError('Booking not found', 404);
  if (String(booking.user) !== String(req.user._id) && req.user.role !== 'admin') {
    throw new AppError('You do not have permission to view this booking', 403);
  }
  res.json({ success: true, booking });
});

exports.cancelBooking = asyncHandler(async (req, res) => {
  if (!isObjectId(req.params.id)) throw new AppError('Invalid booking id', 400);
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new AppError('Booking not found', 404);
  if (String(booking.user) !== String(req.user._id)) throw new AppError('You can only cancel your own bookings', 403);
  if (booking.status === 'cancelled') throw new AppError('This booking is already cancelled', 400);
  if (booking.showTime.getTime() - Date.now() < CANCEL_CUTOFF_MS) {
    throw new AppError('Bookings can only be cancelled up to 2 hours before the show', 400);
  }

  const labels = booking.seats.map((s) => s.label);
  await Seat.updateMany(
    { show: booking.show, label: { $in: labels }, booking: booking._id },
    { $set: { status: 'available' }, $unset: { booking: '', lockedBy: '', lockedUntil: '' } }
  );
  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  await booking.save();
  await Payment.findByIdAndUpdate(booking.payment, { status: 'refunded' });

  await Notification.create({
    user: req.user._id, type: 'cancellation', title: 'Booking cancelled',
    message: `Booking ${booking.bookingCode} was cancelled. ₹${booking.totalAmount} will be refunded to your card.`,
  });
  emitSeatUpdate(booking.show, labels.map((label) => ({ label, status: 'available' })));
  res.json({ success: true, message: 'Booking cancelled and refund started' });
});
