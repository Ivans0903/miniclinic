const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const createPrescription = async (req, res) => {
    let connection;
    try {
        const { medical_record_id, items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return sendError(res, "Item resep obat tidak boleh kosong", {}, 422);
        }

        const [recordRows] = await db.query(
            "SELECT patient_id FROM medical_records WHERE id = ?", 
            [medical_record_id]
        );

        if (recordRows.length === 0) {
            return sendError(res, "Rekam medis tidak ditemukan", {}, 404);
        }

        const patientId = recordRows[0].patient_id;

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [prescResult] = await connection.query(
            `INSERT INTO prescriptions (medical_record_id, patient_id, status) VALUES (?, ?, 'Menunggu')`,
            [medical_record_id, patientId]
        );
        
        const newPrescId = prescResult.insertId;

        for (const itm of items) {
            // Check stock availability
            const [medRows] = await connection.query("SELECT stok FROM medicines WHERE id = ?", [itm.medicine_id]);
            if (medRows.length === 0 || medRows[0].stok < itm.jumlah) {
                await connection.rollback();
                return sendError(res, `Stok obat tidak mencukupi untuk ID: ${itm.medicine_id}`, {}, 400);
            }

            await connection.query(
                `INSERT INTO prescription_items (prescription_id, medicine_id, jumlah, aturan_pakai) VALUES (?, ?, ?, ?)`,
                [newPrescId, itm.medicine_id, itm.jumlah, itm.aturan_pakai]
            );

            // Deduct stock
            await connection.query(
                `UPDATE medicines SET stok = stok - ? WHERE id = ?`,
                [itm.jumlah, itm.medicine_id]
            );
        }

        await connection.commit();

        const [newPrescRows] = await db.query("SELECT * FROM prescriptions WHERE id = ?", [newPrescId]);

        return sendSuccess(res, "Resep obat berhasil diterbitkan", newPrescRows[0], 201);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        return sendError(res, "Gagal memproses resep", error.message, 500);
    } finally {
        if (connection) connection.release();
    }
};

const getPrescriptionById = async (req, res) => {
    try {
        const prescriptionId = req.params.id;

        const [prescRows] = await db.query(
            `SELECT pr.id, pr.status, pr.created_at, p.nama_pasien, p.no_rekam_medis, u.nama_lengkap AS dokter_penulis
             FROM prescriptions pr
             JOIN patients p ON pr.patient_id = p.id
             JOIN medical_records mr ON pr.medical_record_id = mr.id
             JOIN users u ON mr.doctor_id = u.id
             WHERE pr.id = ?`,
            [prescriptionId]
        );

        if (prescRows.length === 0) {
            return sendError(res, "Resep obat tidak ditemukan", {}, 404);
        }

        const presc = prescRows[0];

        const [items] = await db.query(
            `SELECT pi.id, pi.jumlah, pi.aturan_pakai, m.nama_obat, m.satuan
             FROM prescription_items pi
             JOIN medicines m ON pi.medicine_id = m.id
             WHERE pi.prescription_id = ?`,
            [prescriptionId]
        );

        presc.items = items;

        return sendSuccess(res, "Detail resep berhasil diambil", presc, 200);

    } catch (error) {
        console.error(error);
        return sendError(res, "Gagal mengambil data resep", error.message, 500);
    }
};

module.exports = {
    createPrescription,
    getPrescriptionById
};
