const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const authenticateToken = require('../middleware/authMiddleware');
const validateInput = require('../middleware/validation');

router.use(authenticateToken);

router.get('/', candidateController.getCandidates);
router.post('/', validateInput.candidate, candidateController.createCandidate);
router.get('/:id', validateInput.objectId('id'), candidateController.getCandidateById);

module.exports = router;