/**
 * Men-generate Nomor Rekam Medis (RM) Pasien
 * 
 * @param {number|string} kodeWilayah - Kode wilayah klinik (misal: 1 atau 12)
 * @param {number|string} primaryKeyId - ID unik (Primary Key) dari pasien di database
 * @param {string} jenisKelamin - "Laki-laki" atau "Perempuan"
 * @returns {string} Nomor Rekam Medis yang diformat
 */
const generateNoRM = (kodeWilayah, primaryKeyId, jenisKelamin) => {
    // PAD_LEFT(STRING(kode_wilayah), 2, '0')
    const digitWilayah = String(kodeWilayah).padStart(2, '0');
    
    // PAD_LEFT(STRING(primary_key_id), 3, '0')
    const digitId = String(primaryKeyId).padStart(3, '0');
    
    let digitGender;
    
    // Menyesuaikan logika gender dari pseudocode
    if (jenisKelamin && jenisKelamin.toLowerCase() === 'laki-laki') {
        // RANDOM_INT(0, 4) -> angka random antara 0 sampai 4
        digitGender = Math.floor(Math.random() * 5);
    } else {
        // RANDOM_INT(5, 9) -> angka random antara 5 sampai 9
        digitGender = Math.floor(Math.random() * 5) + 5;
    }

    // CONCAT(digit_wilayah, digit_id, STRING(digit_gender))
    return `${digitWilayah}${digitId}${digitGender}`;
};

module.exports = {
    generateNoRM
};
