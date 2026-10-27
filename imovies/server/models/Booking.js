const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: true },
    screen: { type: String, required: true },
    showTime: { type: Date, required: true },
    seats: [{ label: String, category: String, price: Number, _id: false }],
    subtotal: { type: Number, required: true },
    convenienceFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, showTime: -1 });
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ show: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
