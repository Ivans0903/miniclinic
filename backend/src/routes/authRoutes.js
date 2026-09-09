const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateLoginInput, authenticateJWT } = require('../middlewares/authMiddleware');

// Route untuk Login
// Menggunakan validateLoginInput sebagai middleware sebelum masuk ke controller
router.post('/login', validateLoginInput, authController.login);

// Route untuk Logout
// Memerlukan token JWT (authenticateJWT) agar bisa diakses
router.post('/logout', authenticateJWT, authController.logout);

// Route untuk mendapatkan info profil user aktif
router.get('/me', authenticateJWT, authController.getMe);

module.exports = router;
