const router = require('express').Router();
const { asyncWrap } = require('../middleware/errorHandler');
const { chat } = require('../controllers/chatController');

router.post('/', asyncWrap(chat));

module.exports = router;
