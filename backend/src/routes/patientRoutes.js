const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');

router.get('/', authenticateJWT, patientController.getPatients);
router.get('/:id', authenticateJWT, patientController.getPatientById);

router.post(
    '/', 
    authenticateJWT, 
    authorizeRoles(["Administrator", "Petugas Pendaftaran"]), 
    patientController.createPatient
);

router.put(
    '/:id', 
    authenticateJWT, 
    authorizeRoles(["Administrator", "Petugas Pendaftaran"]), 
    patientController.updatePatient
);

router.delete(
    '/:id', 
    authenticateJWT, 
    authorizeRoles(["Administrator"]), 
    patientController.deletePatient
);

module.exports = router;
