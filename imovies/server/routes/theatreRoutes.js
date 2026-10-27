const router = require('express').Router();
const c = require('../controllers/theatreController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', c.listTheatres);
router.get('/:id', c.getTheatre);
router.post('/', protect, authorize('admin'), c.createTheatre);
router.put('/:id', protect, authorize('admin'), c.updateTheatre);
router.delete('/:id', protect, authorize('admin'), c.deleteTheatre);

module.exports = router;
