const express    = require('express');
const router     = express.Router();
const { verifyToken } = require('../auth');

router.use(verifyToken);

router.use(require('./config'));
router.use(require('./exemptions'));
router.use(require('./moderation'));
router.use(require('./audit'));
router.use(require('./guild'));
router.use(require('./panic'));

module.exports = router;