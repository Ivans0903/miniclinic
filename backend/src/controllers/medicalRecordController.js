const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { validateSoapPayload } = require('../utils/soapUtils');

const createMedicalRecord = async (req, res) => {
    let connection;
    try {
        const validation = validateSoapPayload(req.body);
        if (!validation.isValid) {
            return sendError(res, "Validation Error", validation.errors, 422);
        }

        const { 
            registration_id, 
            subjective, tekanan_darah, suhu_tubuh, berat_badan, tinggi_badan, 
            assessment, plan, 
            actions, // Array: [{ medical_action_id, catatan }]
            prescriptions // Array: [{ medicine_id, jumlah, aturan_pakai }]
        } = req.body;

        // Verify registration
        const [regRows] = await db.query(
            "SELECT * FROM registrations WHERE id = ? AND status IN ('Check In', 'Pemeriksaan')", 
            [registration_id]
        );
        
        if (regRows.length === 0) {
            return sendError(res, "Registrasi tidak valid atau status bukan dalam pemeriksaan", {}, 400);
        }

        const registration = regRows[0];

        // Ensure no duplicate records for this registration
        const [existingRows] = await db.query(
            "SELECT id FROM medical_records WHERE registration_id = ?", 
            [registration_id]
        );
        if (existingRows.length > 0) {
            return sendError(res, "Pemeriksaan untuk registrasi ini sudah tercatat", {}, 422);
        }

        const doctor_id = req.user.id; // From JWT payload
        const patient_id = registration.patient_id;

        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Save Medical Record (SOAP)
        const [mrInsertResult] = await connection.query(
            `INSERT INTO medical_records 
            (registration_id, patient_id, doctor_id, subjective, tekanan_darah, suhu_tubuh, berat_badan, tinggi_badan, assessment, plan) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [registration_id, patient_id, doctor_id, subjective, tekanan_darah, suhu_tubuh, berat_badan, tinggi_badan, assessment, plan]
        );

        const newRecordId = mrInsertResult.insertId;

        // 2. Save Actions (if any)
        if (actions && Array.isArray(actions) && actions.length > 0) {
            for (const act of actions) {
                await connection.query(
                    `INSERT INTO record_actions (medical_record_id, medical_action_id, catatan) VALUES (?, ?, ?)`,
                    [newRecordId, act.medical_action_id, act.catatan || ""]
                );
            }
        }

        // 3. Save Prescriptions (if any)
        if (prescriptions && Array.isArray(prescriptions) && prescriptions.length > 0) {
            const [prescInsertResult] = await connection.query(
                `INSERT INTO prescriptions (medical_record_id, patient_id, status) VALUES (?, ?, 'Menunggu')`,
                [newRecordId, patient_id]
            );
            
            const newPrescriptionId = prescInsertResult.insertId;

            for (const item of prescriptions) {
                // Verify medicine stock
                const [medRows] = await connection.query("SELECT stok FROM medicines WHERE id = ?", [item.medicine_id]);
                if (medRows.length === 0 || medRows[0].stok < item.jumlah) {
                    await connection.rollback();
                    return sendError(res, `Stok obat tidak mencukupi untuk ID: ${item.medicine_id}`, {}, 400);
                }

                await connection.query(
                    `INSERT INTO prescription_items (prescription_id, medicine_id, jumlah, aturan_pakai) VALUES (?, ?, ?, ?)`,
                    [newPrescriptionId, item.medicine_id, item.jumlah, item.aturan_pakai]
                );

                // Deduct stock
                await connection.query(
                    `UPDATE medicines SET stok = stok - ? WHERE id = ?`,
                    [item.jumlah, item.medicine_id]
                );
            }
        }

        // 4. Update Registration & Queue status
        await connection.query(
            `UPDATE registrations SET status = 'Selesai' WHERE id = ?`,
            [registration_id]
        );
        await connection.query(
            `UPDATE queues SET status = 'Selesai' WHERE registration_id = ?`,
            [registration_id]
        );

        await connection.commit();

        const [newMrRows] = await db.query("SELECT * FROM medical_records WHERE id = ?", [newRecordId]);

        return sendSuccess(res, "Pemeriksaan medis berhasil disimpan", newMrRows[0], 201);

    } catch (error) {
        if (connection) await connection.rollback();
        console.error(error);
        return sendError(res, "Gagal menyimpan pemeriksaan medis", error.message, 500);
    } finally {
        if (connection) connection.release();
    }
};

const getRecordsByPatient = async (req, res) => {
    try {
        const patientId = req.params.patientId;

        const [patientRows] = await db.query(
            "SELECT id, nama_pasien, no_rekam_medis FROM patients WHERE id = ?", 
            [patientId]
        );
        
        if (patientRows.length === 0) {
            return sendError(res, "Pasien tidak ditemukan", {}, 404);
        }

        const patient = patientRows[0];

        const [records] = await db.query(
            `SELECT mr.*, u.nama_lengkap AS nama_dokter, r.no_registrasi, pl.nama_poli 
             FROM medical_records mr
             JOIN users u ON mr.doctor_id = u.id
             JOIN registrations r ON mr.registration_id = r.id
             JOIN polis pl ON r.poli_id = pl.id
             WHERE mr.patient_id = ?
             ORDER BY mr.created_at DESC`,
            [patientId]
        );

        // Populate actions and prescriptions for each record
        for (const rec of records) {
            const [actions] = await db.query(
                `SELECT ra.*, ma.nama_tindakan, ma.tarif 
                 FROM record_actions ra
                 JOIN medical_actions ma ON ra.medical_action_id = ma.id
                 WHERE ra.medical_record_id = ?`,
                [rec.id]
            );
            rec.actions = actions;

            const [prescriptionRows] = await db.query(
                "SELECT id, status FROM prescriptions WHERE medical_record_id = ?",
                [rec.id]
            );

            if (prescriptionRows.length > 0) {
                rec.prescription = prescriptionRows[0];
                const [items] = await db.query(
                    `SELECT pi.*, m.nama_obat, m.satuan 
                     FROM prescription_items pi
                     JOIN medicines m ON pi.medicine_id = m.id
                     WHERE pi.prescription_id = ?`,
                    [rec.prescription.id]
                );
                rec.prescription.items = items;
            } else {
                rec.prescription = null;
            }
        }

        return sendSuccess(res, "Riwayat pemeriksaan berhasil diambil", {
            patient: patient,
            history: records
        }, 200);

    } catch (error) {
        console.error(error);
        return sendError(res, "Gagal mengambil riwayat pemeriksaan", error.message, 500);
    }
};

module.exports = {
    createMedicalRecord,
    getRecordsByPatient
};
