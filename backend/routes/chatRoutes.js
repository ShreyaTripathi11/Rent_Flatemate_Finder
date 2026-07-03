const express = require('express');
const Interest = require('../models/Interest');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/chat/:interestId/messages - fetch message history for a chat
// Chat is only available once the interest has been accepted.
router.get('/:interestId/messages', protect, async (req, res) => {
  const interest = await Interest.findById(req.params.interestId);
  if (!interest) return res.status(404).json({ message: 'Conversation not found' });

  const isParticipant = interest.tenant.toString() === req.user.id || interest.owner.toString() === req.user.id;
  if (!isParticipant) return res.status(403).json({ message: 'Not a participant of this conversation' });

  if (interest.status !== 'accepted') {
    return res.status(403).json({ message: 'Chat is only available once interest has been accepted' });
  }

  const messages = await Message.find({ interest: interest._id }).sort({ createdAt: 1 }).populate('sender', 'name role');
  res.json(messages);
});

module.exports = router;
