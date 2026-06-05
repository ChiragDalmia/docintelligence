const router = require('express').Router();
const { asyncWrap } = require('../middleware/errorHandler');
const { search } = require('../controllers/searchController');

router.post('/', asyncWrap(search));

module.exports = router;
