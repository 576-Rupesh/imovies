const mongoose = require('mongoose');

// One document per seat per show. Status changes are done with conditional
// updateMany calls so two people can never hold or book the same seat.
const seatSchema = new mongoose.Schema({
  show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
  label: { type: String, required: true }, // e.g. "C7"
  row: { type: String, required: true },
  rowIndex: { type: Number, required: true },
  number: { type: Number, required: true },
  category: { type: String, enum: ['standard', 'premium'], default: 'standard' },
  price: { type: Number, required: true },
  status: { type: String, enum: ['available', 'locked', 'booked'], default: 'available' },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lockedUntil: { type: Date },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
});

seatSchema.index({ show: 1, label: 1 }, { unique: true });
seatSchema.index({ show: 1, status: 1 });
seatSchema.index({ status: 1, lockedUntil: 1 });

module.exports = mongoose.model('Seat', seatSchema);
