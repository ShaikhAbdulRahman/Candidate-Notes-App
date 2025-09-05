const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/authMiddleware');
const validateInput = require('../middleware/validation');

router.post('/register', validateInput.userRegistration, authController.register);
router.post('/login', authController.login);
router.get('/users', authenticateToken, authController.getUsers);

module.exports = router;