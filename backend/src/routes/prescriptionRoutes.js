const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');

router.get(
    '/:id', 
    authenticateJWT, 
    prescriptionController.getPrescriptionById
);

router.post(
    '/', 
    authenticateJWT, 
    authorizeRoles(["Dokter"]), 
    prescriptionController.createPrescription
);

module.exports = router;
