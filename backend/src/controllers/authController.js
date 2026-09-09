const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const login = async (req, res) => {
    // Note: Validasi input (VALIDATE_LOGIN_INPUT) idealnya ditangani oleh middleware terpisah 
    // sebelum masuk ke controller ini (authMiddleware.js), namun kita tetap mengambil datanya.
    const input_username = req.body.username;
    const input_password = req.body.password;

    try {
        // 1. Cari user berdasarkan username beserta relasi nama role-nya
        const [rows] = await db.query(
            `SELECT users.*, roles.name AS role_name 
             FROM users 
             JOIN roles ON users.role_id = roles.id 
             WHERE users.username = ? AND users.is_active = TRUE`,
            [input_username]
        );

        if (rows.length === 0) {
            return sendError(res, "Kredensial tidak valid", { auth: "Username atau password salah" }, 401);
        }

        const user = rows[0];

        // 2. Verifikasi password hash bcrypt
        const is_match = await bcrypt.compare(input_password, user.password);
        if (!is_match) {
            return sendError(res, "Kredensial tidak valid", { auth: "Username atau password salah" }, 401);
        }

        // 3. Susun token payload JWT
        const token_payload = {
            id: user.id,
            username: user.username,
            role: user.role_name,
            nama_lengkap: user.nama_lengkap
        };

        const jwt_secret = process.env.JWT_SECRET;
        const jwt_expiry = process.env.JWT_EXPIRES_IN || "1d";

        const token = jwt.sign(token_payload, jwt_secret, { expiresIn: jwt_expiry });

        // 4. Return respon sesuai standar format dokumen
        const response_data = {
            token: token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role_name,
                nama_lengkap: user.nama_lengkap
            }
        };

        return sendSuccess(res, "Login berhasil", response_data, 200);
    } catch (error) {
        console.error('Login Error:', error);
        return sendError(res, "Terjadi kesalahan pada server", error.message, 500);
    }
};

const logout = async (req, res) => {
    try {
        // Pada arsitektur Stateless JWT, server memastikan status berhasil
        // Klien bertugas menghapus token dari local storage / state
        return sendSuccess(res, "Logout berhasil", {}, 200);
    } catch (error) {
        console.error('Logout Error:', error);
        return sendError(res, "Terjadi kesalahan pada server", error.message, 500);
    }
};

module.exports = {
    login,
    logout
};
