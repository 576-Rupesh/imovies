const router = require('express').Router();
const c = require('../controllers/movieController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/filters', c.getFilters);
router.get('/', c.listMovies);
router.get('/:id', c.getMovie);
router.post('/', protect, authorize('admin'), upload.single('poster'), c.createMovie);
router.put('/:id', protect, authorize('admin'), upload.single('poster'), c.updateMovie);
router.delete('/:id', protect, authorize('admin'), c.deleteMovie);

module.exports = router;
