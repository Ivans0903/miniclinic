const { sendError } = require('../utils/responseHandler');
const jwt = require('jsonwebtoken');

const validateLoginInput = (req, res, next) => {
    const errors = {};
    const { username, password } = req.body || {};

    if (!username || typeof username !== 'string' || username.trim() === '') {
        errors.username = "Username wajib diisi";
    }
    
    if (!password || typeof password !== 'string' || password.trim() === '') {
        errors.password = "Password wajib diisi";
    }

    if (Object.keys(errors).length > 0) {
        return sendError(res, "Validation Error", errors, 400);
    }
    
    next();
};

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendError(res, "Akses ditolak. Token tidak ditemukan.", {}, 401);
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedUser = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedUser; // Berisi: id, username, role, nama_lengkap
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return sendError(res, "Sesi kedaluwarsa. Silakan login kembali.", {}, 401);
        }
        return sendError(res, "Token tidak valid.", {}, 401);
    }
};

const authorizeRoles = (allowedRolesList) => {
    return (req, res, next) => {
        if (!req.user) {
            return sendError(res, "Tidak terautentikasi.", {}, 401);
        }

        if (allowedRolesList.includes(req.user.role)) {
            next();
        } else {
            return sendError(res, "Akses terlarang: Role Anda tidak memiliki izin untuk resource ini.", {}, 403);
        }
    };
};

module.exports = {
    validateLoginInput,
    authenticateJWT,
    authorizeRoles
};
