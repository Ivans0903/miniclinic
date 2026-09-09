const isValidStatusTransition = (currentStatus, newStatus) => {
    const validTransitions = {
        "Menunggu": ["Check In"],
        "Check In": ["Pemeriksaan", "Menunggu"],
        "Pemeriksaan": ["Selesai"],
        "Selesai": []
    };

    if (!validTransitions[currentStatus]) return false;
    return validTransitions[currentStatus].includes(newStatus);
};

const validateRegistrationPayload = (body) => {
    const errors = {};

    if (!body.patient_id) {
        errors.patient_id = "Pasien wajib dipilih";
    }
    
    if (!body.doctor_id) {
        errors.doctor_id = "Dokter pemeriksa wajib dipilih";
    }
        
    if (!body.poli_id) {
        errors.poli_id = "Poli tujuan wajib dipilih";
    }

    if (!body.tanggal_kunjungan || isNaN(Date.parse(body.tanggal_kunjungan))) {
        errors.tanggal_kunjungan = "Tanggal kunjungan tidak valid";
    } else {
        // Normalize input date to prevent timezone edge cases
        const inputDate = new Date(body.tanggal_kunjungan);
        inputDate.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Hanya memperbolehkan pendaftaran untuk hari ini dan ke depan
        if (inputDate < today) {
            errors.tanggal_kunjungan = "Tanggal kunjungan tidak boleh di masa lalu";
        }
    }

    const allowedPayments = ["BPJS", "Umum", "Asuransi Swasta"];
    if (!body.jenis_pembayaran || !allowedPayments.includes(body.jenis_pembayaran)) {
        errors.jenis_pembayaran = "Jenis pembayaran harus BPJS, Umum, atau Asuransi Swasta";
    }

    if (!body.keluhan_awal || body.keluhan_awal.trim() === '') {
        errors.keluhan_awal = "Keluhan awal wajib diisi";
    }

    if (Object.keys(errors).length > 0) {
        return { isValid: false, errors: errors };
    }

    return { isValid: true, errors: {} };
};

module.exports = {
    isValidStatusTransition,
    validateRegistrationPayload
};
