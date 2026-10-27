const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const Booking = require('../models/Booking');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { buildSeats } = require('../utils/seatGenerator');
const seatService = require('../services/seatService');
const { str, escapeRegex, dayRange, isObjectId, requireFields, toArray } = require('../utils/validators');

// GET /api/shows?movie=&theatre=&city=&date=YYYY-MM-DD
exports.listShows = asyncHandler(async (req, res) => {
  const filter = { isActive: true, startTime: { $gte: new Date() } };

  const movie = str(req.query.movie);
  if (movie) {
    if (!isObjectId(movie)) throw new AppError('Invalid movie id', 400);
    filter.movie = movie;
  }

  const theatre = str(req.query.theatre);
  const city = str(req.query.city);
  if (theatre && !isObjectId(theatre)) throw new AppError('Invalid theatre id', 400);
  if (city) {
    const ids = (await Theatre.find({ city: new RegExp(`^${escapeRegex(city)}$`, 'i') }).distinct('_id')).map(String);
    filter.theatre = { $in: theatre ? ids.filter((i) => i === theatre) : ids };
  } else if (theatre) {
    filter.theatre = theatre;
  }

  const date = str(req.query.date);
  if (date) {
    const [start, end] = dayRange(date);
    filter.startTime = { $gte: new Date(Math.max(start.getTime(), Date.now())), $lt: end };
  }

  const shows = await Show.find(filter)
    .sort({ startTime: 1 })
    .limit(200)
    .populate('movie', 'title poster language genres')
    .populate('theatre', 'name city address')
    .lean();

  // free seat counts per show (expired holds count as free)
  const now = new Date();
  const counts = await Seat.aggregate([
    {
      $match: {
        show: { $in: shows.map((s) => s._id) },
        $or: [{ status: 'available' }, { status: 'locked', lockedUntil: { $lt: now } }],
      },
    },
    { $group: { _id: '$show', free: { $sum: 1 } } },
  ]);
  const freeMap = Object.fromEntries(counts.map((c) => [String(c._id), c.free]));
  shows.forEach((s) => {
    s.availableSeats = freeMap[String(s._id)] || 0;
    s.totalSeats = s.screenRows * s.screenCols;
  });

  res.json({ success: true, shows });
});

// GET /api/shows/:id  -> show details + seat map (optionally authenticated, to flag the caller's own holds)
exports.getShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id)
    .populate('movie', 'title poster duration language rating genres')
    .populate('theatre', 'name city address');
  if (!show) throw new AppError('Show not found', 404);

  const seats = await Seat.find({ show: show._id }).sort({ rowIndex: 1, number: 1 }).lean();
  const now = new Date();
  const uid = req.user ? String(req.user._id) : null;

  const out = seats.map((s) => {
    let status = s.status;
    let lockedByMe = false;
    if (status === 'locked') {
      if (s.lockedUntil < now) status = 'available';
      else if (uid && String(s.lockedBy) === uid) lockedByMe = true;
    }
    return {
      label: s.label, row: s.row, number: s.number, category: s.category, price: s.price,
      status, lockedByMe, lockedUntil: lockedByMe ? s.lockedUntil : undefined,
    };
  });
  res.json({ success: true, show, seats: out });
});

exports.createShow = asyncHandler(async (req, res) => {
  requireFields(req.body, ['movieId', 'theatreId', 'screen', 'startTime', 'price']);
  const { movieId, theatreId, screen, startTime } = req.body;
  const price = Number(req.body.price);
  if (!isObjectId(String(movieId)) || !isObjectId(String(theatreId))) throw new AppError('Invalid movie or theatre', 400);
  if (!(price > 0)) throw new AppError('Price must be greater than 0', 400);

  const [movie, theatre] = await Promise.all([Movie.findById(movieId), Theatre.findById(theatreId)]);
  if (!movie) throw new AppError('Movie not found', 404);
  if (!theatre) throw new AppError('Theatre not found', 404);
  const scr = theatre.screens.find((s) => s.name === screen);
  if (!scr) throw new AppError(`Screen "${screen}" does not exist in ${theatre.name}`, 400);

  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) throw new AppError('Invalid start time', 400);
  if (start <= new Date()) throw new AppError('Start time must be in the future', 400);
  const end = new Date(start.getTime() + (movie.duration + 15) * 60 * 1000); // 15 min clean-up buffer

  const clash = await Show.findOne({
    theatre: theatre._id, screen, isActive: true, startTime: { $lt: end }, endTime: { $gt: start },
  });
  if (clash) throw new AppError('Another show is already scheduled on this screen at that time', 409);

  const show = await Show.create({
    movie: movie._id, theatre: theatre._id, screen,
    screenRows: scr.rows, screenCols: scr.cols,
    startTime: start, endTime: end,
    price, premiumPrice: Math.round(price * 1.4),
  });
  await Seat.insertMany(buildSeats(show), { ordered: false });
  res.status(201).json({ success: true, show });
});

exports.deleteShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id);
  if (!show) throw new AppError('Show not found', 404);
  if (await Booking.exists({ show: show._id, status: 'confirmed' })) {
    throw new AppError('This show has confirmed bookings and cannot be deleted', 400);
  }
  await Seat.deleteMany({ show: show._id });
  await show.deleteOne();
  res.json({ success: true, message: 'Show deleted' });
});

// POST /api/shows/:id/lock  { seats: ["A1","A2"] }  (empty array releases all of the caller's holds)
exports.lockSeats = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id);
  if (!show || !show.isActive) throw new AppError('Show not found', 404);
  const labels = [...new Set(toArray(req.body.seats))];
  const lockedUntil = await seatService.lockSeats(show, req.user._id, labels);
  res.json({ success: true, lockedUntil });
});

exports.releaseSeats = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id);
  if (!show) throw new AppError('Show not found', 404);
  await seatService.lockSeats(show, req.user._id, []);
  res.json({ success: true });
});
