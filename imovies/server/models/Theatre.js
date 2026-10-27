const mongoose = require('mongoose');

const screenSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rows: { type: Number, required: true, min: 1, max: 20 },
    cols: { type: Number, required: true, min: 1, max: 30 },
  },
  { _id: false }
);

const theatreSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Theatre name is required'], trim: true },
    city: { type: String, required: [true, 'City is required'], trim: true },
    address: { type: String, trim: true, default: '' },
    screens: {
      type: [screenSchema],
      validate: [(v) => v.length > 0, 'A theatre needs at least one screen'],
    },
  },
  { timestamps: true }
);

theatreSchema.index({ city: 1, name: 1 });

module.exports = mongoose.model('Theatre', theatreSchema);
