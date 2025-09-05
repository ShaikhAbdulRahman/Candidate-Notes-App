const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticateToken = require('../middleware/authMiddleware');
const validateInput = require('../middleware/validation');
router.use(authenticateToken);

router.get('/', notificationController.getNotifications);
router.patch('/:id/read', validateInput.objectId('id'), notificationController.markAsRead);

module.exports = router;