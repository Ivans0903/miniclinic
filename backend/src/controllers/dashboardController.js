const db = require('../config/database');
const { sendSuccess, sendError } = require('../utils/responseHandler');

const getDashboardSummary = async (req, res) => {
  try {
    // Generate ISO string to get just the YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // 1. Eksekusi query indikator utama dengan conditional aggregation ringan menggunakan CURRENT_DATE() MySQL
    const summaryQuery = `
      SELECT
        (SELECT COUNT(*) FROM patients) AS total_pasien,
        (SELECT COUNT(DISTINCT patient_id) FROM registrations WHERE tanggal_kunjungan = CURRENT_DATE()) AS total_pasien_hari_ini,
        (SELECT COUNT(*) FROM queues WHERE tanggal_antrean = CURRENT_DATE()) AS total_antrean_hari_ini,
        (SELECT COUNT(*) FROM registrations WHERE tanggal_kunjungan = CURRENT_DATE() AND status = 'Menunggu') AS total_pasien_menunggu,
        (SELECT COUNT(*) FROM registrations WHERE tanggal_kunjungan = CURRENT_DATE() AND status = 'Selesai') AS total_pasien_selesai
    `;

    const [summaryRows] = await db.query(summaryQuery);
    const metrics = summaryRows[0];

    // 2. Data pendukung: 5 antrean teratas hari ini untuk pemantauan cepat
    const recentQueuesQuery = `
      SELECT q.nomor_antrean, q.status, p.nama_pasien, pl.nama_poli, u.nama_lengkap AS nama_dokter
      FROM queues q
      JOIN registrations r ON q.registration_id = r.id
      JOIN patients p ON r.patient_id = p.id
      JOIN polis pl ON r.poli_id = pl.id
      JOIN users u ON r.doctor_id = u.id
      WHERE q.tanggal_antrean = CURRENT_DATE()
      ORDER BY q.id DESC LIMIT 5
    `;
    const [recentQueues] = await db.query(recentQueuesQuery);

    return sendSuccess(res, 'Ringkasan dashboard berhasil diambil', {
      summary: {
        total_pasien: Number(metrics.total_pasien || 0),
        total_pasien_hari_ini: Number(metrics.total_pasien_hari_ini || 0),
        total_antrean_hari_ini: Number(metrics.total_antrean_hari_ini || 0),
        total_pasien_menunggu: Number(metrics.total_pasien_menunggu || 0),
        total_pasien_selesai: Number(metrics.total_pasien_selesai || 0),
      },
      recent_queues: recentQueues
    }, 200);
  } catch (error) {
    console.error(error);
    return sendError(res, 'Gagal memuat data dashboard', error.message, 500);
  }
};

module.exports = {
  getDashboardSummary
};
