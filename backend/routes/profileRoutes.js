const express = require('express');
const TenantProfile = require('../models/TenantProfile');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// PUT /api/profile - tenant creates or updates their profile (upsert)
router.put('/', protect, authorize('tenant'), async (req, res) => {
  try {
    const { preferredLocation, budgetMin, budgetMax, moveInDate, notes } = req.body;
    if (!preferredLocation || budgetMin == null || budgetMax == null || !moveInDate) {
      return res.status(400).json({ message: 'preferredLocation, budgetMin, budgetMax and moveInDate are required' });
    }
    if (Number(budgetMin) > Number(budgetMax)) {
      return res.status(400).json({ message: 'budgetMin cannot be greater than budgetMax' });
    }

    const profile = await TenantProfile.findOneAndUpdate(
      { tenant: req.user.id },
      { tenant: req.user.id, preferredLocation, budgetMin, budgetMax, moveInDate, notes },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: 'Failed to save profile', error: err.message });
  }
});

// GET /api/profile - tenant fetches their own profile
router.get('/', protect, authorize('tenant'), async (req, res) => {
  const profile = await TenantProfile.findOne({ tenant: req.user.id });
  res.json(profile || null);
});

module.exports = router;
