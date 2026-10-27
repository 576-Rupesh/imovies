const Seat = require('../models/Seat');
const AppError = require('../utils/AppError');
const { emitSeatUpdate } = require('../utils/socket');

const MAX_SEATS = 8;
const lockMinutes = () => Number(process.env.SEAT_LOCK_MINUTES) || 5;
const CLEAR_LOCK = { $set: { status: 'available' }, $unset: { lockedBy: '', lockedUntil: '' } };

/**
 * Makes `labels` the user's complete hold on a show: seats the user held before
 * but no longer wants are released, the new ones are locked atomically.
 * Pass an empty array to release everything the user holds.
 */
exports.lockSeats = async (show, userId, labels) => {
  if (labels.length > MAX_SEATS) throw new AppError(`You can select up to ${MAX_SEATS} seats`, 400);
  if (new Date(show.startTime) <= new Date()) throw new AppError('This show has already started', 400);

  const now = new Date();

  // 1. release holds the user no longer wants
  const dropped = await Seat.find({
    show: show._id, status: 'locked', lockedBy: userId, label: { $nin: labels },
  }).select('label');
  if (dropped.length) {
    await Seat.updateMany({ _id: { $in: dropped.map((s) => s._id) }, lockedBy: userId }, CLEAR_LOCK);
    emitSeatUpdate(show._id, dropped.map((s) => ({ label: s.label, status: 'available' })));
  }
  if (!labels.length) return null;

  const exists = await Seat.countDocuments({ show: show._id, label: { $in: labels } });
  if (exists !== labels.length) throw new AppError('One or more seats do not exist for this show', 400);

  // 2. lock: only seats that are free, expired-held, or already held by this user
  const lockedUntil = new Date(now.getTime() + lockMinutes() * 60 * 1000);
  const result = await Seat.updateMany(
    {
      show: show._id,
      label: { $in: labels },
      $or: [
        { status: 'available' },
        { status: 'locked', lockedUntil: { $lt: now } },
        { status: 'locked', lockedBy: userId },
      ],
    },
    { $set: { status: 'locked', lockedBy: userId, lockedUntil } }
  );

  if (result.matchedCount !== labels.length) {
    // someone else got there first: undo this attempt and tell the user which seats are gone
    const mine = await Seat.find({ show: show._id, label: { $in: labels }, lockedBy: userId, status: 'locked' });
    const mineLabels = new Set(mine.map((s) => s.label));
    const taken = labels.filter((l) => !mineLabels.has(l));
    if (mine.length) {
      await Seat.updateMany({ _id: { $in: mine.map((s) => s._id) }, lockedBy: userId }, CLEAR_LOCK);
      emitSeatUpdate(show._id, mine.map((s) => ({ label: s.label, status: 'available' })));
    }
    throw new AppError(`Seat${taken.length > 1 ? 's' : ''} ${taken.join(', ')} just got taken. Please pick again.`, 409);
  }

  emitSeatUpdate(show._id, labels.map((label) => ({ label, status: 'locked' })));
  return lockedUntil;
};

// Frees every hold whose timer has run out (called on an interval from server.js).
exports.releaseExpiredLocks = async () => {
  const now = new Date();
  const expired = await Seat.find({ status: 'locked', lockedUntil: { $lt: now } }).select('show label');
  if (!expired.length) return;
  await Seat.updateMany(
    { _id: { $in: expired.map((s) => s._id) }, status: 'locked', lockedUntil: { $lt: now } },
    CLEAR_LOCK
  );
  const byShow = {};
  expired.forEach((s) => {
    (byShow[s.show] = byShow[s.show] || []).push({ label: s.label, status: 'available' });
  });
  Object.entries(byShow).forEach(([showId, seats]) => emitSeatUpdate(showId, seats));
};

exports.CLEAR_LOCK = CLEAR_LOCK;
exports.MAX_SEATS = MAX_SEATS;
