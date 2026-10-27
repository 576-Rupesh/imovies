const router = require('express').Router();
const c = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));
router.get('/stats', c.stats);
router.get('/bookings', c.allBookings);

module.exports = router;
