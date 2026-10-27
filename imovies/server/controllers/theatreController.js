const Theatre = require('../models/Theatre');
const Show = require('../models/Show');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { str, escapeRegex, requireFields } = require('../utils/validators');

const cleanScreens = (screens) => {
  if (!Array.isArray(screens) || !screens.length) throw new AppError('Add at least one screen', 400);
  const names = new Set();
  return screens.map((s) => {
    const name = String(s.name || '').trim();
    const rows = Number(s.rows);
    const cols = Number(s.cols);
    if (!name) throw new AppError('Every screen needs a name', 400);
    if (names.has(name.toLowerCase())) throw new AppError(`Screen name "${name}" is used twice`, 400);
    names.add(name.toLowerCase());
    if (!Number.isInteger(rows) || rows < 1 || rows > 20) throw new AppError('Rows must be between 1 and 20', 400);
    if (!Number.isInteger(cols) || cols < 1 || cols > 30) throw new AppError('Seats per row must be between 1 and 30', 400);
    return { name, rows, cols };
  });
};

exports.listTheatres = asyncHandler(async (req, res) => {
  const filter = {};
  if (str(req.query.city)) filter.city = new RegExp(`^${escapeRegex(str(req.query.city))}$`, 'i');
  const theatres = await Theatre.find(filter).sort({ city: 1, name: 1 });
  res.json({ success: true, theatres });
});

exports.getTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) throw new AppError('Theatre not found', 404);
  res.json({ success: true, theatre });
});

exports.createTheatre = asyncHandler(async (req, res) => {
  requireFields(req.body, ['name', 'city']);
  const { name, city, address, screens } = req.body;
  const theatre = await Theatre.create({ name, city, address, screens: cleanScreens(screens) });
  res.status(201).json({ success: true, theatre });
});

exports.updateTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) throw new AppError('Theatre not found', 404);
  const { name, city, address, screens } = req.body;
  if (name !== undefined) theatre.name = name;
  if (city !== undefined) theatre.city = city;
  if (address !== undefined) theatre.address = address;
  if (screens !== undefined) theatre.screens = cleanScreens(screens);
  await theatre.save();
  res.json({ success: true, theatre });
});

exports.deleteTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) throw new AppError('Theatre not found', 404);
  if (await Show.exists({ theatre: theatre._id })) {
    throw new AppError('This theatre has shows. Delete its shows first.', 400);
  }
  await theatre.deleteOne();
  res.json({ success: true, message: 'Theatre deleted' });
});
