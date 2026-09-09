const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateJWT } = require('../middlewares/authMiddleware');

// Route untuk mendapatkan data ringkasan dashboard (diakses oleh semua roler yang login)
router.get('/summary', authenticateJWT, dashboardController.getDashboardSummary);

module.exports = router;
