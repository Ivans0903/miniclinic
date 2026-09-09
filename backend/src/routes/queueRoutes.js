const express = require('express');
const router = express.Router();
const queueController = require('../controllers/queueController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');

router.get('/', authenticateJWT, queueController.getQueues);

router.post(
    '/', 
    authenticateJWT, 
    authorizeRoles(["Administrator", "Petugas Pendaftaran"]), 
    queueController.createQueue
);

router.put(
    '/:id/call', 
    authenticateJWT, 
    authorizeRoles(["Administrator", "Petugas Pendaftaran", "Dokter"]), 
    queueController.callQueue
);

router.put(
    '/:id/status', 
    authenticateJWT, 
    authorizeRoles(["Administrator", "Petugas Pendaftaran", "Dokter"]), 
    queueController.updateQueueStatus
);

module.exports = router;
