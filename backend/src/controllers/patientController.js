const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { generateNoRM } = require('../utils/rmGenerator');

const getPatients = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const offset = (page - 1) * limit;

        let queryFilter = "";
        let params = [];

        if (search) {
            queryFilter = "WHERE nik LIKE ? OR nama_pasien LIKE ? OR no_rekam_medis LIKE ?";
            const searchTerm = `%${search}%`;
            params = [searchTerm, searchTerm, searchTerm];
        }

        const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM patients ${queryFilter}`, params);
        
        // Menggunakan array unpacking untuk order dan limit di mysql2
        const [patientsList] = await db.query(
            `SELECT * FROM patients ${queryFilter} ORDER BY id DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const totalPages = Math.ceil(total / limit);

        const paginationMeta = {
            total_items: total,
            total_pages: totalPages,
            current_page: page,
            limit: limit
        };

        return sendSuccess(res, "Data pasien berhasil diambil", {
            patients: patientsList,
            pagination: paginationMeta
        }, 200);

    } catch (error) {
        console.error('getPatients error:', error);
        return sendError(res, "Gagal mengambil data pasien", error.message, 500);
    }
};

const getPatientById = async (req, res) => {
    try {
        const patientId = req.params.id;
        const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [patientId]);

        if (rows.length === 0) {
            return sendError(res, "Pasien tidak ditemukan", {}, 404);
        }

        return sendSuccess(res, "Detail pasien berhasil diambil", rows[0], 200);
    } catch (error) {
        console.error('getPatientById error:', error);
        return sendError(res, "Gagal mengambil data pasien", error.message, 500);
    }
};

const createPatient = async (req, res) => {
    const connection = await db.getConnection();
    try {
        // kode_wilayah diberikan default 1 jika tidak disediakan
        const { nik, nama_pasien, jenis_kelamin, tanggal_lahir, nomor_telepon, alamat, kode_wilayah = 1 } = req.body;

        // Validasi format NIK 16 digit angka
        if (!/^[0-9]{16}$/.test(nik)) {
            return sendError(res, "Validation Error", { nik: "NIK harus 16 digit angka" }, 422);
        }

        // Validasi format Nomor Telepon (Dimulai dengan 08, 10-13 digit)
        if (!/^08[0-9]{8,11}$/.test(nomor_telepon)) {
            return sendError(res, "Validation Error", { nomor_telepon: "Nomor telepon harus diawali '08' dengan panjang 10-13 digit" }, 422);
        }

        // Validasi duplikasi NIK
        const [existingNik] = await connection.query("SELECT id FROM patients WHERE nik = ?", [nik]);
        if (existingNik.length > 0) {
            return sendError(res, "Validation Error", { nik: "NIK sudah terdaftar dalam sistem" }, 422);
        }

        await connection.beginTransaction();

        // Dapatkan Next Primary Key ID untuk generate No RM
        const [nextIdRow] = await connection.query(
            "SELECT AUTO_INCREMENT AS next_id FROM information_schema.tables WHERE table_name = 'patients' AND table_schema = DATABASE()"
        );
        
        let targetId = nextIdRow[0].next_id;
        if (!targetId) {
            const [[{ maxId }]] = await connection.query("SELECT MAX(id) as maxId FROM patients");
            targetId = (maxId || 0) + 1;
        }

        // Auto-generate No RM (6 Digit: 2 digit asal, 3 digit ID, 1 digit gender)
        const generatedNoRm = generateNoRM(kode_wilayah, targetId, jenis_kelamin);

        const [result] = await connection.query(
            `INSERT INTO patients (no_rekam_medis, nik, nama_pasien, jenis_kelamin, tanggal_lahir, nomor_telepon, alamat)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [generatedNoRm, nik, nama_pasien, jenis_kelamin, tanggal_lahir, nomor_telepon, alamat]
        );

        await connection.commit();

        // Ambil data pasien yang baru diinsert
        const [newPatient] = await db.query("SELECT * FROM patients WHERE id = ?", [result.insertId]);

        return sendSuccess(res, "Pasien berhasil didaftarkan", newPatient[0], 201);

    } catch (error) {
        await connection.rollback();
        console.error('createPatient error:', error);
        return sendError(res, "Gagal menyimpan pasien", error.message, 500);
    } finally {
        connection.release();
    }
};

const updatePatient = async (req, res) => {
    try {
        const patientId = req.params.id;
        const { nik, nama_pasien, jenis_kelamin, tanggal_lahir, nomor_telepon, alamat } = req.body;

        // Validasi format NIK 16 digit angka
        if (!/^[0-9]{16}$/.test(nik)) {
            return sendError(res, "Validation Error", { nik: "NIK harus 16 digit angka" }, 422);
        }

        // Validasi format Nomor Telepon
        if (!/^08[0-9]{8,11}$/.test(nomor_telepon)) {
            return sendError(res, "Validation Error", { nomor_telepon: "Nomor telepon harus diawali '08' dengan panjang 10-13 digit" }, 422);
        }

        const [patientRows] = await db.query("SELECT * FROM patients WHERE id = ?", [patientId]);
        if (patientRows.length === 0) {
            return sendError(res, "Pasien tidak ditemukan", {}, 404);
        }
        const patient = patientRows[0];

        // Cek jika NIK diubah dan bentrok dengan pasien lain
        if (nik !== patient.nik) {
            const [duplicate] = await db.query("SELECT id FROM patients WHERE nik = ? AND id != ?", [nik, patientId]);
            if (duplicate.length > 0) {
                return sendError(res, "Validation Error", { nik: "NIK sudah digunakan pasien lain" }, 422);
            }
        }

        await db.query(
            `UPDATE patients SET 
                nik = ?, nama_pasien = ?, jenis_kelamin = ?, tanggal_lahir = ?, 
                nomor_telepon = ?, alamat = ? 
             WHERE id = ?`,
            [nik, nama_pasien, jenis_kelamin, tanggal_lahir, nomor_telepon, alamat, patientId]
        );

        const [updatedData] = await db.query("SELECT * FROM patients WHERE id = ?", [patientId]);
        return sendSuccess(res, "Data pasien berhasil diperbarui", updatedData[0], 200);

    } catch (error) {
        console.error('updatePatient error:', error);
        return sendError(res, "Gagal memperbarui data pasien", error.message, 500);
    }
};

const deletePatient = async (req, res) => {
    try {
        const patientId = req.params.id;
        const [patientRows] = await db.query("SELECT id FROM patients WHERE id = ?", [patientId]);

        if (patientRows.length === 0) {
            return sendError(res, "Pasien tidak ditemukan", {}, 404);
        }

        // Validasi relasi: jangan hapus jika sudah punya riwayat registrasi
        // Dibungkus dengan try-catch agar tidak error jika tabel registrations belum ada di tahap ini
        try {
            const [hasHistory] = await db.query("SELECT id FROM registrations WHERE patient_id = ? LIMIT 1", [patientId]);
            if (hasHistory.length > 0) {
                return sendError(res, "Pasien tidak dapat dihapus karena memiliki rekam transaksi kunjungan", {}, 400);
            }
        } catch (tableErr) {
            if (tableErr.code !== 'ER_NO_SUCH_TABLE') {
                throw tableErr;
            }
        }

        await db.query("DELETE FROM patients WHERE id = ?", [patientId]);
        return sendSuccess(res, "Data pasien berhasil dihapus", {}, 200);

    } catch (error) {
        console.error('deletePatient error:', error);
        return sendError(res, "Gagal menghapus data pasien", error.message, 500);
    }
};

module.exports = {
    getPatients,
    getPatientById,
    createPatient,
    updatePatient,
    deletePatient
};
