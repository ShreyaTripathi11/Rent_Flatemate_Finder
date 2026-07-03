const express = require('express');
const Interest = require('../models/Interest');
const Listing = require('../models/Listing');
const TenantProfile = require('../models/TenantProfile');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { computeCompatibility } = require('../utils/compatibility');
const { sendEmail } = require('../utils/email');

const router = express.Router();

const HIGH_SCORE_THRESHOLD = 80;

// POST /api/interests - tenant expresses interest in a listing
router.post('/', protect, authorize('tenant'), async (req, res) => {
  try {
    const { listingId } = req.body;
    if (!listingId) return res.status(400).json({ message: 'listingId is required' });

    const listing = await Listing.findById(listingId).populate('owner');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    if (listing.isFilled) return res.status(400).json({ message: 'This listing is already filled' });

    const profile = await TenantProfile.findOne({ tenant: req.user.id });
    if (!profile) {
      return res.status(400).json({ message: 'Create your tenant profile before expressing interest' });
    }

    const existing = await Interest.findOne({ tenant: req.user.id, listing: listingId });
    if (existing) return res.status(409).json({ message: 'You already expressed interest in this listing' });

    // Compute and persist the compatibility score at the moment interest is
    // expressed (score/explanation stored in DB, not recomputed later).
    const { score, explanation, source } = await computeCompatibility(listing, profile);

    const interest = await Interest.create({
      tenant: req.user.id,
      listing: listingId,
      owner: listing.owner._id,
      compatibilityScore: score,
      compatibilityExplanation: explanation,
      scoreSource: source,
    });

    // Notify owner by email, and flag high-compatibility matches
    const tenant = await User.findById(req.user.id);
    const subject =
      score >= HIGH_SCORE_THRESHOLD
        ? `Strong match (${score}/100) for your listing in ${listing.location}`
        : `New interest in your listing in ${listing.location}`;
    const text = `${tenant.name} (${tenant.email}) expressed interest in your listing at ${listing.location} (₹${listing.rent}).\nCompatibility score: ${score}/100\n${explanation}\n\nLog in to accept or decline this request.`;

    await sendEmail({ to: listing.owner.email, subject, text });

    res.status(201).json(interest);
  } catch (err) {
    res.status(500).json({ message: 'Failed to express interest', error: err.message });
  }
});

// GET /api/interests/sent - tenant's own interest requests
router.get('/sent', protect, authorize('tenant'), async (req, res) => {
  const interests = await Interest.find({ tenant: req.user.id })
    .populate('listing')
    .populate('owner', 'name email')
    .sort({ createdAt: -1 });
  res.json(interests);
});

// GET /api/interests/received - owner's incoming interest requests
router.get('/received', protect, authorize('owner'), async (req, res) => {
  const interests = await Interest.find({ owner: req.user.id })
    .populate('listing')
    .populate('tenant', 'name email')
    .sort({ createdAt: -1 });
  res.json(interests);
});

// PATCH /api/interests/:id - owner accepts or declines
router.patch('/:id', protect, authorize('owner'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'status must be accepted or declined' });
    }

    const interest = await Interest.findById(req.params.id).populate('listing').populate('tenant');
    if (!interest) return res.status(404).json({ message: 'Interest not found' });
    if (interest.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not your listing' });
    }

    interest.status = status;
    await interest.save();

    const subject = `Your interest was ${status}`;
    const text = `Your interest in the listing at ${interest.listing.location} (₹${interest.listing.rent}) was ${status} by the owner.${
      status === 'accepted' ? '\n\nYou can now chat in real time with the owner.' : ''
    }`;
    await sendEmail({ to: interest.tenant.email, subject, text });

    res.json(interest);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update interest', error: err.message });
  }
});

// GET /api/interests/:id - fetch a single interest (used to enter a chat room)
router.get('/:id', protect, async (req, res) => {
  const interest = await Interest.findById(req.params.id).populate('listing').populate('tenant', 'name email').populate('owner', 'name email');
  if (!interest) return res.status(404).json({ message: 'Interest not found' });
  const isParticipant = interest.tenant._id.toString() === req.user.id || interest.owner._id.toString() === req.user.id;
  if (!isParticipant && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not a participant of this conversation' });
  }
  res.json(interest);
});

module.exports = router;
