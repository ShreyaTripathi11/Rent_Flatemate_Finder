const mongoose = require('mongoose');

const interestSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    compatibilityScore: { type: Number, default: null }, // 0-100
    compatibilityExplanation: { type: String, default: '' },
    scoreSource: { type: String, enum: ['llm', 'rule-based', null], default: null },
  },
  { timestamps: true }
);

// A tenant can only express interest in a given listing once
interestSchema.index({ tenant: 1, listing: 1 }, { unique: true });

module.exports = mongoose.model('Interest', interestSchema);
