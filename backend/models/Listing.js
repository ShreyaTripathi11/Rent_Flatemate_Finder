const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    location: { type: String, required: true, trim: true },
    rent: { type: Number, required: true },
    availableFrom: { type: Date, required: true },
    roomType: {
      type: String,
      enum: ['single', 'shared', 'studio', '1bhk', '2bhk', 'other'],
      default: 'single',
    },
    furnishingStatus: {
      type: String,
      enum: ['furnished', 'semi-furnished', 'unfurnished'],
      default: 'unfurnished',
    },
    description: { type: String, default: '' },
    photos: [{ type: String }], // photo URLs
    isFilled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Listing', listingSchema);
