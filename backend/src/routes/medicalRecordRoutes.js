const express = require('express');
const router = express.Router();
const medicalRecordController = require('../controllers/medicalRecordController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');

router.get(
    '/patient/:patientId', 
    authenticateJWT, 
    authorizeRoles(["Administrator", "Dokter", "Petugas Pendaftaran"]), 
    medicalRecordController.getRecordsByPatient
);

router.post(
    '/', 
    authenticateJWT, 
    authorizeRoles(["Administrator", "Dokter", "Petugas Pendaftaran"]), 
    medicalRecordController.createMedicalRecord
);

module.exports = router;
