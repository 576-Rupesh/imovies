const router = require('express').Router();
const c = require('../controllers/showController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { bookingLimiter } = require('../middleware/rateLimiter');

router.get('/', c.listShows);
router.get('/:id', optionalAuth, c.getShow);
router.post('/', protect, authorize('admin'), c.createShow);
router.delete('/:id', protect, authorize('admin'), c.deleteShow);
router.post('/:id/lock', protect, bookingLimiter, c.lockSeats);
router.post('/:id/release', protect, c.releaseSeats);

module.exports = router;
