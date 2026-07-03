const express = require('express');
const Listing = require('../models/Listing');
const TenantProfile = require('../models/TenantProfile');
const Interest = require('../models/Interest');
const { protect, authorize } = require('../middleware/auth');
const { computeCompatibility } = require('../utils/compatibility');

const router = express.Router();

// POST /api/listings - owner creates a listing
router.post('/', protect, authorize('owner'), async (req, res) => {
  try {
    const { location, rent, availableFrom, roomType, furnishingStatus, description, photos } = req.body;
    if (!location || !rent || !availableFrom) {
      return res.status(400).json({ message: 'location, rent and availableFrom are required' });
    }
    const listing = await Listing.create({
      owner: req.user.id,
      location,
      rent,
      availableFrom,
      roomType,
      furnishingStatus,
      description,
      photos: photos || [],
    });
    res.status(201).json(listing);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create listing', error: err.message });
  }
});

// GET /api/listings - browse/filter listings, ranked by compatibility score
// for the logged-in tenant (if they have a profile). Public listings are
// visible to everyone; scoring only applies for authenticated tenants.
router.get('/', async (req, res) => {
  try {
    const { location, minBudget, maxBudget } = req.query;
    const filter = { isFilled: false };
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (minBudget || maxBudget) {
      filter.rent = {};
      if (minBudget) filter.rent.$gte = Number(minBudget);
      if (maxBudget) filter.rent.$lte = Number(maxBudget);
    }

    const listings = await Listing.find(filter).populate('owner', 'name email').sort({ createdAt: -1 });

    // Try to attach compatibility scores if the requester is an authenticated tenant
    let tenantProfile = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        if (decoded.role === 'tenant') {
          tenantProfile = await TenantProfile.findOne({ tenant: decoded.id });
        }
      } catch (e) {
        // ignore invalid/missing token - just return unranked listings
      }
    }

    if (!tenantProfile) {
      return res.json(listings.map((l) => ({ ...l.toObject(), compatibilityScore: null })));
    }

    // Compute (and cache) compatibility scores for each listing against this
    // tenant's profile. Scores are stored on the Interest record once a
    // tenant actually expresses interest; for browsing we compute on the fly
    // but do not persist until interest is expressed, per the interest flow.
    const ranked = await Promise.all(
      listings.map(async (listing) => {
        const result = await computeCompatibility(listing, tenantProfile);
        return { ...listing.toObject(), compatibilityScore: result.score, compatibilityExplanation: result.explanation };
      })
    );

    ranked.sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0));
    res.json(ranked);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch listings', error: err.message });
  }
});

// GET /api/listings/mine - owner's own listings
router.get('/mine', protect, authorize('owner'), async (req, res) => {
  const listings = await Listing.find({ owner: req.user.id }).sort({ createdAt: -1 });
  res.json(listings);
});

// GET /api/listings/:id
router.get('/:id', async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate('owner', 'name email');
  if (!listing) return res.status(404).json({ message: 'Listing not found' });
  res.json(listing);
});

// PATCH /api/listings/:id - owner updates their own listing
router.patch('/:id', protect, authorize('owner'), async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return res.status(404).json({ message: 'Listing not found' });
  if (listing.owner.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not your listing' });
  }
  const allowedFields = ['location', 'rent', 'availableFrom', 'roomType', 'furnishingStatus', 'description', 'photos'];
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) listing[f] = req.body[f];
  });
  await listing.save();
  res.json(listing);
});

// PATCH /api/listings/:id/fill - owner marks listing as filled
router.patch('/:id/fill', protect, authorize('owner'), async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return res.status(404).json({ message: 'Listing not found' });
  if (listing.owner.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not your listing' });
  }
  listing.isFilled = true;
  await listing.save();
  res.json(listing);
});

// DELETE /api/listings/:id - owner deletes their own listing
router.delete('/:id', protect, authorize('owner'), async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return res.status(404).json({ message: 'Listing not found' });
  if (listing.owner.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not your listing' });
  }
  await listing.deleteOne();
  await Interest.deleteMany({ listing: listing._id });
  res.json({ message: 'Listing deleted' });
});

module.exports = router;
