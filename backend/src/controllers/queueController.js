const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { generateNomorAntrean } = require('../utils/queueUtils');

const getQueues = async (req, res) => {
    try {
        // Handle current date default YYYY-MM-DD
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const filterDate = req.query.tanggal || todayStr;
        const filterPoli = req.query.poli_id;

        let query = `
            SELECT 
                q.id AS queue_id, q.nomor_antrean, q.status AS status_antrean, q.waktu_panggilan,
                r.id AS registration_id, r.no_registrasi, r.jenis_pembayaran,
                p.nama_pasien, p.no_rekam_medis,
                pl.nama_poli,
                u.nama_lengkap AS nama_dokter
            FROM queues q
            JOIN registrations r ON q.registration_id = r.id
            JOIN patients p ON r.patient_id = p.id
            JOIN polis pl ON r.poli_id = pl.id
            JOIN users u ON r.doctor_id = u.id
            WHERE q.tanggal_antrean = ?
        `;
        
        const params = [filterDate];

        if (filterPoli) {
            query += " AND r.poli_id = ?";
            params.push(filterPoli);
        }

        query += " ORDER BY q.id ASC";

        const [queuesList] = await db.query(query, params);

        const currentlyCalling = queuesList.find(q => q.status_antrean === "Dipanggil") || null;
        const waitingList = queuesList.filter(q => q.status_antrean === "Menunggu");

        return sendSuccess(res, "Daftar antrean berhasil diambil", {
            queues: queuesList,
            currently_calling: currentlyCalling,
            waiting_list: waitingList
        }, 200);

    } catch (error) {
        console.error(error);
        return sendError(res, "Gagal mengambil daftar antrean", error.message, 500);
    }
};

const createQueue = async (req, res) => {
    let connection;
    try {
        const registrationId = req.body.registration_id;

        const [regRows] = await db.query(
            `SELECT r.*, p.kode_huruf 
             FROM registrations r 
             JOIN polis p ON r.poli_id = p.id 
             WHERE r.id = ?`, 
            [registrationId]
        );

        if (regRows.length === 0) {
            return sendError(res, "Data pendaftaran tidak ditemukan", {}, 404);
        }

        const registration = regRows[0];

        const [existingQueue] = await db.query("SELECT id FROM queues WHERE registration_id = ?", [registrationId]);
        if (existingQueue.length > 0) {
            return sendError(res, "Antrean untuk pendaftaran ini sudah ter-generate", {}, 422);
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        const nomorAntrean = await generateNomorAntrean(connection, registration.kode_huruf, registration.tanggal_kunjungan);

        const [insertResult] = await connection.query(
            `INSERT INTO queues (registration_id, nomor_antrean, tanggal_antrean, status)
             VALUES (?, ?, ?, 'Menunggu')`,
            [registrationId, nomorAntrean, registration.tanggal_kunjungan]
        );

        await connection.commit();

        const [newQueue] = await db.query("SELECT * FROM queues WHERE id = ?", [insertResult.insertId]);

        return sendSuccess(res, "Nomor antrean berhasil digenerate", newQueue[0], 201);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        return sendError(res, "Gagal membuat nomor antrean", error.message, 500);
    } finally {
        if (connection) connection.release();
    }
};

const callQueue = async (req, res) => {
    let connection;
    try {
        const queueId = req.params.id;

        const [queueRows] = await db.query("SELECT * FROM queues WHERE id = ?", [queueId]);
        if (queueRows.length === 0) {
            return sendError(res, "Antrean tidak ditemukan", {}, 404);
        }

        const queue = queueRows[0];
        if (queue.status !== "Menunggu" && queue.status !== "Dilewati") {
            return sendError(res, "Hanya antrean berstatus Menunggu atau Dilewati yang bisa dipanggil", {}, 400);
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Cari poli_id dari antrean ini untuk memastikan update status Dipanggil hanya direset pada poli yang sama
        const [regRows] = await connection.query("SELECT poli_id FROM registrations WHERE id = ?", [queue.registration_id]);
        if(regRows.length > 0) {
            const poliId = regRows[0].poli_id;
            // Set antrean lain di poli yang sama yang sedang "Dipanggil" menjadi "Dilewati"
            await connection.query(
                `UPDATE queues q
                 JOIN registrations r ON q.registration_id = r.id
                 SET q.status = 'Dilewati' 
                 WHERE q.status = 'Dipanggil' AND q.id != ? AND q.tanggal_antrean = ? AND r.poli_id = ?`,
                [queueId, queue.tanggal_antrean, poliId]
            );
        }

        // Update status antrean yang dipanggil
        await connection.query(
            `UPDATE queues SET status = 'Dipanggil', waktu_panggilan = NOW() WHERE id = ?`,
            [queueId]
        );

        // Sinkronisasi status pendaftaran ke "Check In"
        await connection.query(
            `UPDATE registrations SET status = 'Check In' WHERE id = ?`,
            [queue.registration_id]
        );

        await connection.commit();

        const [updatedQueueRows] = await db.query(
            "SELECT nomor_antrean, status, waktu_panggilan FROM queues WHERE id = ?", 
            [queueId]
        );

        return sendSuccess(res, `Antrean ${updatedQueueRows[0].nomor_antrean} sedang dipanggil`, updatedQueueRows[0], 200);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        return sendError(res, "Gagal memanggil antrean", error.message, 500);
    } finally {
        if (connection) connection.release();
    }
};

const updateQueueStatus = async (req, res) => {
    try {
        const queueId = req.params.id;
        const newStatus = req.body.status;

        const allowedStatus = ["Menunggu", "Dipanggil", "Selesai", "Dilewati"];
        if (!allowedStatus.includes(newStatus)) {
            return sendError(res, "Status antrean tidak valid", {}, 422);
        }

        await db.query(`UPDATE queues SET status = ? WHERE id = ?`, [newStatus, queueId]);

        return sendSuccess(res, `Status antrean berhasil diperbarui menjadi ${newStatus}`, {}, 200);

    } catch (error) {
        console.error(error);
        return sendError(res, "Gagal mengubah status antrean", error.message, 500);
    }
};

module.exports = {
    getQueues,
    createQueue,
    callQueue,
    updateQueueStatus
};
