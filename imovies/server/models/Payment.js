const mongoose = require('mongoose');

// Only the last 4 digits of a card are ever stored.
const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show' },
    amount: { type: Number, required: true },
    method: { type: String, default: 'card' },
    cardLast4: { type: String },
    status: { type: String, enum: ['success', 'failed', 'refunded'], required: true },
    transactionId: { type: String, required: true },
    failureReason: { type: String },
  },
  { timestamps: true }
);

paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
