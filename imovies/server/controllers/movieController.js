const Movie = require('../models/Movie');
const Show = require('../models/Show');
const Seat = require('../models/Seat');
const Theatre = require('../models/Theatre');
const Booking = require('../models/Booking');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { str, escapeRegex, toArray, parsePage, dayRange, isObjectId, requireFields } = require('../utils/validators');

// GET /api/movies?q=&genre=&language=&city=&theatre=&date=YYYY-MM-DD&status=&page=&limit=
exports.listMovies = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, 8, 50);
  const filter = {};

  const status = str(req.query.status) || 'now_showing';
  if (status !== 'all') filter.status = status;

  const q = str(req.query.q);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: rx }, { director: rx }, { cast: rx }];
  }
  if (str(req.query.genre)) filter.genres = new RegExp(`^${escapeRegex(str(req.query.genre))}$`, 'i');
  if (str(req.query.language)) filter.language = new RegExp(`^${escapeRegex(str(req.query.language))}$`, 'i');

  // theatre / city / date all work through the shows that match them
  const city = str(req.query.city);
  const theatre = str(req.query.theatre);
  const date = str(req.query.date);
  if (city || theatre || date) {
    const showFilter = { isActive: true, startTime: { $gte: new Date() } };
    if (theatre) {
      if (!isObjectId(theatre)) throw new AppError('Invalid theatre id', 400);
      showFilter.theatre = theatre;
    }
    if (city) {
      const ids = await Theatre.find({ city: new RegExp(`^${escapeRegex(city)}$`, 'i') }).distinct('_id');
      showFilter.theatre = theatre ? { $in: ids.filter((i) => String(i) === theatre) } : { $in: ids };
    }
    if (date) {
      const [start, end] = dayRange(date);
      showFilter.startTime = { $gte: new Date(Math.max(start.getTime(), Date.now())), $lt: end };
    }
    filter._id = { $in: await Show.distinct('movie', showFilter) };
  }

  const [movies, total] = await Promise.all([
    Movie.find(filter).sort({ releaseDate: -1, title: 1 }).skip(skip).limit(limit),
    Movie.countDocuments(filter),
  ]);
  res.json({ success: true, movies, page, pages: Math.ceil(total / limit) || 1, total });
});

exports.getMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) throw new AppError('Movie not found', 404);
  res.json({ success: true, movie });
});

// values for the filter dropdowns
exports.getFilters = asyncHandler(async (req, res) => {
  const [genres, languages, cities] = await Promise.all([
    Movie.distinct('genres', { status: 'now_showing' }),
    Movie.distinct('language', { status: 'now_showing' }),
    Theatre.distinct('city'),
  ]);
  res.json({ success: true, genres: genres.sort(), languages: languages.sort(), cities: cities.sort() });
});

const fromBody = (body, file) => {
  const data = {};
  ['title', 'description', 'language', 'rating', 'director', 'trailerUrl', 'status'].forEach((k) => {
    if (body[k] !== undefined) data[k] = body[k];
  });
  if (body.duration !== undefined) data.duration = Number(body.duration);
  if (body.score !== undefined && body.score !== '') data.score = Number(body.score);
  if (body.releaseDate) data.releaseDate = body.releaseDate;
  if (body.genres !== undefined) data.genres = toArray(body.genres);
  if (body.cast !== undefined) data.cast = toArray(body.cast);
  if (file) data.poster = `/uploads/${file.filename}`;
  else if (body.poster !== undefined) data.poster = body.poster;
  return data;
};

exports.createMovie = asyncHandler(async (req, res) => {
  requireFields(req.body, ['title', 'description', 'language', 'duration', 'releaseDate']);
  const movie = await Movie.create(fromBody(req.body, req.file));
  res.status(201).json({ success: true, movie });
});

exports.updateMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) throw new AppError('Movie not found', 404);
  movie.set(fromBody(req.body, req.file));
  await movie.save();
  res.json({ success: true, movie });
});

// Movies with bookings are archived (history stays intact); others are removed with their shows.
exports.deleteMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie) throw new AppError('Movie not found', 404);

  if (await Booking.exists({ movie: movie._id })) {
    movie.status = 'archived';
    await movie.save();
    await Show.updateMany({ movie: movie._id, startTime: { $gte: new Date() } }, { isActive: false });
    return res.json({ success: true, message: 'Movie has bookings, so it was archived instead of deleted' });
  }
  const showIds = await Show.find({ movie: movie._id }).distinct('_id');
  await Seat.deleteMany({ show: { $in: showIds } });
  await Show.deleteMany({ movie: movie._id });
  await movie.deleteOne();
  res.json({ success: true, message: 'Movie deleted' });
});
