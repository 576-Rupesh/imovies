const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 150 },
    description: { type: String, required: [true, 'Description is required'], maxlength: 2000 },
    genres: { type: [String], default: [] },
    language: { type: String, required: [true, 'Language is required'], trim: true },
    duration: { type: Number, required: [true, 'Duration (minutes) is required'], min: 30, max: 400 },
    rating: { type: String, default: 'U/A' }, // certificate: U, U/A, A
    score: { type: Number, min: 0, max: 10, default: 0 }, // audience score out of 10
    releaseDate: { type: Date, required: [true, 'Release date is required'] },
    poster: { type: String, default: '' },
    trailerUrl: { type: String, default: '' },
    director: { type: String, trim: true, default: '' },
    cast: { type: [String], default: [] },
    status: { type: String, enum: ['now_showing', 'upcoming', 'archived'], default: 'now_showing' },
  },
  { timestamps: true }
);

// Indexes for search, filtering and listing
movieSchema.index({ title: 1 });
movieSchema.index({ status: 1, releaseDate: -1 });
movieSchema.index({ genres: 1 });
movieSchema.index({ language: 1 });

module.exports = mongoose.model('Movie', movieSchema);
