const express = require('express');
const User = require('../models/User');
const Listing = require('../models/Listing');
const Interest = require('../models/Interest');
const Message = require('../models/Message');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin'));

// GET /api/admin/overview - platform activity summary
router.get('/overview', async (req, res) => {
  const [userCount, tenantCount, ownerCount, listingCount, filledCount, interestCount, acceptedCount, messageCount] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'tenant' }),
      User.countDocuments({ role: 'owner' }),
      Listing.countDocuments(),
      Listing.countDocuments({ isFilled: true }),
      Interest.countDocuments(),
      Interest.countDocuments({ status: 'accepted' }),
      Message.countDocuments(),
    ]);
  res.json({
    userCount,
    tenantCount,
    ownerCount,
    listingCount,
    filledCount,
    interestCount,
    acceptedCount,
    messageCount,
  });
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(users);
});

// PATCH /api/admin/users/:id/toggle-active - suspend/reactivate a user
router.patch('/users/:id/toggle-active', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  user.isActive = !user.isActive;
  await user.save();
  res.json(user);
});

// GET /api/admin/listings
router.get('/listings', async (req, res) => {
  const listings = await Listing.find().populate('owner', 'name email').sort({ createdAt: -1 });
  res.json(listings);
});

// DELETE /api/admin/listings/:id
router.delete('/listings/:id', async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return res.status(404).json({ message: 'Listing not found' });
  await listing.deleteOne();
  await Interest.deleteMany({ listing: listing._id });
  res.json({ message: 'Listing deleted' });
});

module.exports = router;
