const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');

router.get('/options', authenticateJWT, registrationController.getRegistrationOptions);
router.get('/', authenticateJWT, registrationController.getRegistrations);

router.post(
    '/', 
    authenticateJWT, 
    authorizeRoles(["Administrator", "Petugas Pendaftaran"]), 
    registrationController.createRegistration
);

router.put(
    '/:id', 
    authenticateJWT, 
    authorizeRoles(["Administrator", "Petugas Pendaftaran", "Dokter"]), 
    registrationController.updateRegistration
);

module.exports = router;
