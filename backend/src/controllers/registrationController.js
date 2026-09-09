const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { isValidStatusTransition, validateRegistrationPayload } = require('../utils/registrationUtils');

const getRegistrations = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        const filterDate = req.query.tanggal_kunjungan;
        const filterStatus = req.query.status;
        const filterPoli = req.query.poli_id;
        const search = req.query.search;

        const queryConditions = ["1=1"];
        const params = [];

        if (filterDate) {
            queryConditions.push("r.tanggal_kunjungan = ?");
            params.push(filterDate);
        }

        if (filterStatus) {
            queryConditions.push("r.status = ?");
            params.push(filterStatus);
        }

        if (filterPoli) {
            queryConditions.push("r.poli_id = ?");
            params.push(filterPoli);
        }

        if (search && search.trim() !== '') {
            queryConditions.push("(p.nama_pasien LIKE ? OR p.no_rekam_medis LIKE ? OR r.no_registrasi LIKE ?)");
            const searchVal = `%${search}%`;
            params.push(searchVal, searchVal, searchVal);
        }

        const whereClause = " WHERE " + queryConditions.join(" AND ");

        const countQuery = "SELECT COUNT(*) as total FROM registrations r JOIN patients p ON r.patient_id = p.id" + whereClause;
        const [countResult] = await db.query(countQuery, params);
        const totalItems = countResult[0].total;

        const dataQuery = `
            SELECT 
                r.id, r.no_registrasi, r.tanggal_kunjungan, r.jenis_pembayaran, 
                r.keluhan_awal, r.status, r.created_at,
                p.id AS patient_id, p.nama_pasien, p.no_rekam_medis, p.nik,
                u.id AS doctor_id, u.nama_lengkap AS nama_dokter,
                pl.id AS poli_id, pl.nama_poli
            FROM registrations r
            JOIN patients p ON r.patient_id = p.id
            JOIN users u ON r.doctor_id = u.id
            JOIN polis pl ON r.poli_id = pl.id
            ${whereClause} 
            ORDER BY r.created_at DESC 
            LIMIT ? OFFSET ?
        `;

        const [registrations] = await db.query(dataQuery, [...params, limit, offset]);

        const paginationMeta = {
            total_items: totalItems,
            total_pages: Math.ceil(totalItems / limit),
            current_page: page,
            limit: limit
        };

        return sendSuccess(res, "Daftar pendaftaran berhasil diambil", {
            registrations: registrations,
            pagination: paginationMeta
        }, 200);

    } catch (error) {
        console.error(error);
        return sendError(res, "Gagal mengambil daftar pendaftaran", error.message, 500);
    }
};

const createRegistration = async (req, res) => {
    let connection;
    try {
        const validation = validateRegistrationPayload(req.body);
        if (!validation.isValid) {
            return sendError(res, "Validation Error", validation.errors, 422);
        }

        const { patient_id, doctor_id, poli_id, tanggal_kunjungan, jenis_pembayaran, keluhan_awal } = req.body;

        // Verifikasi eksistensi pasien
        const [patientRows] = await db.query("SELECT id FROM patients WHERE id = ?", [patient_id]);
        if (patientRows.length === 0) {
            return sendError(res, "Validation Error", { patient_id: "Pasien tidak terdaftar" }, 404);
        }

        // Verifikasi dokter aktif dan ber-role Dokter
        const [doctorRows] = await db.query(
            "SELECT u.id FROM users u JOIN roles ro ON u.role_id = ro.id WHERE u.id = ? AND ro.name = 'Dokter' AND u.is_active = TRUE", 
            [doctor_id]
        );
        if (doctorRows.length === 0) {
            return sendError(res, "Validation Error", { doctor_id: "Dokter tidak valid atau bukan seorang Dokter yang aktif" }, 400);
        }

        // Verifikasi poli
        const [poliRows] = await db.query("SELECT id FROM polis WHERE id = ? AND is_active = TRUE", [poli_id]);
        if (poliRows.length === 0) {
            return sendError(res, "Validation Error", { poli_id: "Poli tidak ditemukan atau tidak aktif" }, 400);
        }

        // Cek apakah pasien sudah terdaftar di poli yang sama pada hari yang sama dan belum selesai
        const [duplicateRows] = await db.query(
            "SELECT id FROM registrations WHERE patient_id = ? AND poli_id = ? AND tanggal_kunjungan = ? AND status != 'Selesai'",
            [patient_id, poli_id, tanggal_kunjungan]
        );
        if (duplicateRows.length > 0) {
            return sendError(res, "Validation Error", {
                general: "Pasien sudah terdaftar pada poli dan tanggal kunjungan tersebut (kunjungan belum selesai)"
            }, 422);
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Format No Registrasi: REG-YYYYMMDD-XXXX
        const dateObj = new Date(tanggal_kunjungan);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}${mm}${dd}`;

        const [dailyCountRows] = await connection.query(
            "SELECT COUNT(*) as count FROM registrations WHERE tanggal_kunjungan = ?", 
            [tanggal_kunjungan]
        );
        const countInt = dailyCountRows[0].count + 1;
        const no_registrasi = `REG-${todayStr}-${String(countInt).padStart(4, '0')}`;

        const [insertResult] = await connection.query(
            `INSERT INTO registrations 
            (no_registrasi, patient_id, doctor_id, poli_id, tanggal_kunjungan, jenis_pembayaran, keluhan_awal, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Menunggu')`,
            [no_registrasi, patient_id, doctor_id, poli_id, tanggal_kunjungan, jenis_pembayaran, keluhan_awal]
        );

        const registrationId = insertResult.insertId;

        // Ambil kode_huruf dari poli
        const [poliData] = await connection.query("SELECT kode_huruf FROM polis WHERE id = ?", [poli_id]);
        const poliKodeHuruf = poliData[0].kode_huruf;

        // Generate nomor antrean
        const { generateNomorAntrean } = require('../utils/queueUtils');
        const nomorAntrean = await generateNomorAntrean(connection, poliKodeHuruf, tanggal_kunjungan);

        // Buat antrean
        await connection.query(
            `INSERT INTO queues (registration_id, nomor_antrean, tanggal_antrean, status)
             VALUES (?, ?, ?, 'Menunggu')`,
            [registrationId, nomorAntrean, tanggal_kunjungan]
        );

        await connection.commit();

        // Fetch newly created registration beserta antreannya
        const [newRegRows] = await db.query(`
            SELECT r.*, q.nomor_antrean, q.status as status_antrean 
            FROM registrations r 
            JOIN queues q ON r.id = q.registration_id 
            WHERE r.id = ?`, 
            [registrationId]
        );

        return sendSuccess(res, "Pendaftaran pasien dan antrean berhasil dibuat", newRegRows[0], 201);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        return sendError(res, "Gagal membuat pendaftaran", error.message, 500);
    } finally {
        if (connection) connection.release();
    }
};

const updateRegistration = async (req, res) => {
    try {
        const registrationId = req.params.id;
        const [regRows] = await db.query("SELECT * FROM registrations WHERE id = ?", [registrationId]);

        if (regRows.length === 0) {
            return sendError(res, "Data pendaftaran tidak ditemukan", {}, 404);
        }

        const registration = regRows[0];
        const newStatus = req.body.status;
        const newKeluhan = req.body.keluhan_awal;
        const newDoctorId = req.body.doctor_id;

        // Validasi perubahan status jika ada parameter status yang dikirim
        if (newStatus && newStatus !== registration.status) {
            if (!isValidStatusTransition(registration.status, newStatus)) {
                return sendError(res, "Perubahan status tidak valid", {
                    status: `Tidak dapat mengubah status dari '${registration.status}' ke '${newStatus}'`
                }, 422);
            }
        }

        // Pastikan tidak mengubah data penting jika pemeriksaan sudah berjalan atau selesai
        if (["Pemeriksaan", "Selesai"].includes(registration.status) && (newDoctorId || newKeluhan)) {
            return sendError(res, "Aksi Dilarang", {
                general: "Data pendaftaran tidak dapat diubah karena pemeriksaan sudah berlangsung atau selesai"
            }, 400);
        }

        const updatedStatus = newStatus || registration.status;
        const updatedKeluhan = newKeluhan || registration.keluhan_awal;
        const updatedDoctorId = newDoctorId || registration.doctor_id;

        await db.query(
            "UPDATE registrations SET status = ?, keluhan_awal = ?, doctor_id = ? WHERE id = ?",
            [updatedStatus, updatedKeluhan, updatedDoctorId, registrationId]
        );

        const [updatedRows] = await db.query("SELECT * FROM registrations WHERE id = ?", [registrationId]);

        return sendSuccess(res, "Pendaftaran berhasil diperbarui", updatedRows[0], 200);

    } catch (error) {
        console.error(error);
        return sendError(res, "Gagal memperbarui pendaftaran", error.message, 500);
    }
};

const getRegistrationOptions = async (req, res) => {
    try {
        const [doctors] = await db.query(
            "SELECT u.id, u.nama_lengkap, u.username FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'Dokter' AND u.is_active = TRUE"
        );
        const [polis] = await db.query("SELECT id, nama_poli, kode_huruf FROM polis WHERE is_active = TRUE");
        const [patients] = await db.query("SELECT id, nama_pasien, no_rekam_medis, nik FROM patients ORDER BY nama_pasien ASC");
        
        return sendSuccess(res, "Master data pendaftaran berhasil diambil", { doctors, polis, patients }, 200);
    } catch (error) {
        console.error(error);
        return sendError(res, "Gagal mengambil master data pendaftaran", error.message, 500);
    }
};

module.exports = {
    getRegistrations,
    createRegistration,
    updateRegistration,
    getRegistrationOptions
};
