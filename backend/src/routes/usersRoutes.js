const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/authMiddleware');

// Proteksi seluruh endpoint di router ini khusus Administrator
router.use(authenticateJWT);
router.use(authorizeRoles(['Administrator']));

router.get('/roles', usersController.getRoles);
router.get('/', usersController.getUsers);
router.post('/', usersController.createUser);
router.put('/:id', usersController.updateUser);
router.delete('/:id', usersController.deleteUser);

module.exports = router;
