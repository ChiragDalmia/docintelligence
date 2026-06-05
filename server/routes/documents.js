const router = require('express').Router();
const { upload } = require('../middleware/upload');
const { asyncWrap } = require('../middleware/errorHandler');
const {
  uploadDocument,
  listDocuments,
  getDocument,
  deleteDocument,
  extractDocument
} = require('../controllers/documentController');

function multerMiddleware(req, res, next) {
  upload.single('file')(req, res, function (err) {
    if (err) {
      if (!err.status) err.status = 400;
      return next(err);
    }
    next();
  });
}

router.post('/upload', multerMiddleware, asyncWrap(uploadDocument));
router.get('/', listDocuments);
router.get('/:id', asyncWrap(getDocument));
router.delete('/:id', asyncWrap(deleteDocument));
router.post('/:id/extract', asyncWrap(extractDocument));

module.exports = router;
