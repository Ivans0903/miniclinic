const db = require('../config/database');
const bcrypt = require('bcrypt');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const getUsers = async (req, res) => {
    try {
        const search = req.query.search || '';
        let query = `
            SELECT users.id, users.username, users.nama_lengkap, users.role_id, users.is_active, users.created_at, roles.name AS role_name 
            FROM users 
            JOIN roles ON users.role_id = roles.id
        `;
        let params = [];

        if (search) {
            query += ` WHERE users.username LIKE ? OR users.nama_lengkap LIKE ? OR roles.name LIKE ?`;
            const term = `%${search}%`;
            params = [term, term, term];
        }

        query += ` ORDER BY users.id DESC`;

        const [users] = await db.query(query, params);

        return sendSuccess(res, "Data pengguna berhasil diambil", users, 200);
    } catch (error) {
        console.error('getUsers error:', error);
        return sendError(res, "Gagal mengambil data pengguna", error.message, 500);
    }
};

const getRoles = async (req, res) => {
    try {
        const [roles] = await db.query("SELECT id, name FROM roles ORDER BY id ASC");
        return sendSuccess(res, "Daftar role berhasil diambil", roles, 200);
    } catch (error) {
        console.error('getRoles error:', error);
        return sendError(res, "Gagal mengambil daftar role", error.message, 500);
    }
};

const createUser = async (req, res) => {
    try {
        const { username, password, nama_lengkap, role_id } = req.body;

        const errors = {};
        if (!username || !username.trim()) errors.username = "Username wajib diisi";
        if (!password || !password.trim()) errors.password = "Password wajib diisi";
        if (!nama_lengkap || !nama_lengkap.trim()) errors.nama_lengkap = "Nama lengkap wajib diisi";
        if (!role_id) errors.role_id = "Role wajib dipilih";

        if (Object.keys(errors).length > 0) {
            return sendError(res, "Validation Error", errors, 422);
        }

        // Cek duplikasi username
        const [existing] = await db.query("SELECT id FROM users WHERE username = ?", [username.trim()]);
        if (existing.length > 0) {
            return sendError(res, "Validation Error", { username: "Username sudah digunakan oleh akun lain" }, 422);
        }

        // Cek keberadaan role_id
        const [roleCheck] = await db.query("SELECT id FROM roles WHERE id = ?", [role_id]);
        if (roleCheck.length === 0) {
            return sendError(res, "Validation Error", { role_id: "Role yang dipilih tidak valid" }, 422);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password.trim(), 10);

        const [result] = await db.query(
            `INSERT INTO users (username, password, nama_lengkap, role_id, is_active)
             VALUES (?, ?, ?, ?, TRUE)`,
            [username.trim(), hashedPassword, nama_lengkap.trim(), role_id]
        );

        const [newUser] = await db.query(
            `SELECT users.id, users.username, users.nama_lengkap, users.role_id, users.is_active, users.created_at, roles.name AS role_name 
             FROM users JOIN roles ON users.role_id = roles.id WHERE users.id = ?`,
            [result.insertId]
        );

        return sendSuccess(res, "Pengguna berhasil ditambahkan", newUser[0], 201);
    } catch (error) {
        console.error('createUser error:', error);
        return sendError(res, "Gagal menambahkan pengguna", error.message, 500);
    }
};

const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { username, password, nama_lengkap, role_id, is_active } = req.body;

        const errors = {};
        if (!username || !username.trim()) errors.username = "Username wajib diisi";
        if (!nama_lengkap || !nama_lengkap.trim()) errors.nama_lengkap = "Nama lengkap wajib diisi";
        if (!role_id) errors.role_id = "Role wajib dipilih";

        if (Object.keys(errors).length > 0) {
            return sendError(res, "Validation Error", errors, 422);
        }

        // Cek keberadaan user
        const [existingUser] = await db.query("SELECT id FROM users WHERE id = ?", [userId]);
        if (existingUser.length === 0) {
            return sendError(res, "Pengguna tidak ditemukan", {}, 404);
        }

        // Cek duplikasi username dengan user lain
        const [existingUsername] = await db.query("SELECT id FROM users WHERE username = ? AND id != ?", [username.trim(), userId]);
        if (existingUsername.length > 0) {
            return sendError(res, "Validation Error", { username: "Username sudah digunakan oleh akun lain" }, 422);
        }

        const activeStatus = is_active !== undefined ? Boolean(is_active) : true;

        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password.trim(), 10);
            await db.query(
                `UPDATE users 
                 SET username = ?, password = ?, nama_lengkap = ?, role_id = ?, is_active = ?
                 WHERE id = ?`,
                [username.trim(), hashedPassword, nama_lengkap.trim(), role_id, activeStatus, userId]
            );
        } else {
            await db.query(
                `UPDATE users 
                 SET username = ?, nama_lengkap = ?, role_id = ?, is_active = ?
                 WHERE id = ?`,
                [username.trim(), nama_lengkap.trim(), role_id, activeStatus, userId]
            );
        }

        const [updatedUser] = await db.query(
            `SELECT users.id, users.username, users.nama_lengkap, users.role_id, users.is_active, users.created_at, roles.name AS role_name 
             FROM users JOIN roles ON users.role_id = roles.id WHERE users.id = ?`,
            [userId]
        );

        return sendSuccess(res, "Data pengguna berhasil diperbarui", updatedUser[0], 200);
    } catch (error) {
        console.error('updateUser error:', error);
        return sendError(res, "Gagal memperbarui data pengguna", error.message, 500);
    }
};

const deleteUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        if (req.user && req.user.id === userId) {
            return sendError(res, "Aksi ditolak", { general: "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif" }, 400);
        }

        const [existingUser] = await db.query("SELECT id FROM users WHERE id = ?", [userId]);
        if (existingUser.length === 0) {
            return sendError(res, "Pengguna tidak ditemukan", {}, 404);
        }

        try {
            await db.query("DELETE FROM users WHERE id = ?", [userId]);
        } catch (dbErr) {
            // Jika ada FK constraint, nonaktifkan akun
            await db.query("UPDATE users SET is_active = FALSE WHERE id = ?", [userId]);
        }

        return sendSuccess(res, "Pengguna berhasil dihapus dari sistem", { id: userId }, 200);
    } catch (error) {
        console.error('deleteUser error:', error);
        return sendError(res, "Gagal menghapus pengguna", error.message, 500);
    }
};

module.exports = {
    getUsers,
    getRoles,
    createUser,
    updateUser,
    deleteUser
};
