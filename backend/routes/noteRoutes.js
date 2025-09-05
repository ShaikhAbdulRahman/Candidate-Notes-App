const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const authenticateToken = require('../middleware/authMiddleware');
const validateInput = require('../middleware/validation');

router.use(authenticateToken); 

router.get('/:candidateId/notes', 
  validateInput.objectId('candidateId'),  
  noteController.getNotesForCandidate
);

router.post('/:candidateId/notes', 
  validateInput.objectId('candidateId'),
  validateInput.note,
  (req, res) => {
    const io = req.app.get('io');
    noteController.createNote(req, res, io);
  }
);

module.exports = router;