const generateNomorAntrean = async (connection, poliKodeHuruf, tanggal) => {
    // Hitung total antrean pada poli dan tanggal tersebut
    const [rows] = await connection.query(
        `SELECT COUNT(*) as count 
         FROM queues q 
         JOIN registrations r ON q.registration_id = r.id 
         JOIN polis p ON r.poli_id = p.id 
         WHERE p.kode_huruf = ? AND q.tanggal_antrean = ?`,
        [poliKodeHuruf, tanggal]
    );
    
    // Tambah 1 dan jadikan 3 digit (zero-padded)
    const currentCount = rows[0].count;
    const nextNumber = currentCount + 1;
    const paddedNumber = String(nextNumber).padStart(3, "0");
    
    // Gabungkan misal "A" + "001" -> "A001"
    return `${poliKodeHuruf}${paddedNumber}`;
};

module.exports = {
    generateNomorAntrean
};
