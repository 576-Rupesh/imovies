const router = require('express').Router();
const c = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');
const { bookingLimiter } = require('../middleware/rateLimiter');

router.use(protect);
router.post('/', bookingLimiter, c.createBooking);
router.get('/my', c.myBookings);
router.get('/:id', c.getBooking);
router.put('/:id/cancel', c.cancelBooking);

module.exports = router;
