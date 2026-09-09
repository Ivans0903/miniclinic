require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function seedDatabase() {
  console.log('Memulai proses inisialisasi dan seeder database...');

  // 1. Buat koneksi ke server MySQL
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    port: process.env.DB_PORT || 3306
  });

  try {
    const dbName = process.env.DB_NAME || 'clinic_db';
    
    // Buat Database jika belum ada
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database '${dbName}' siap.`);
    
    // Gunakan database tersebut
    await connection.query(`USE \`${dbName}\``);

    // 2. Buat tabel roles
    await connection.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Tabel 'roles' siap.");

    // 3. Buat tabel users
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id INT NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nama_lengkap VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
      )
    `);
    console.log("Tabel 'users' siap.");

    // 3.1 Buat tabel patients
    await connection.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        no_rekam_medis VARCHAR(6) UNIQUE NOT NULL,
        nik VARCHAR(16) UNIQUE NOT NULL,
        nama_pasien VARCHAR(100) NOT NULL,
        jenis_kelamin VARCHAR(15) NOT NULL CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
        tanggal_lahir DATE NOT NULL,
        nomor_telepon VARCHAR(20) NOT NULL,
        alamat TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("Tabel 'patients' siap.");

    // Buat index
    try {
      await connection.query(`CREATE INDEX idx_patients_search ON patients(nik, nama_pasien, no_rekam_medis)`);
      console.log("Index 'idx_patients_search' siap.");
    } catch (err) {
      // Abaikan jika index sudah ada (Error: ER_DUP_KEYNAME)
      if (err.code !== 'ER_DUP_KEYNAME') throw err;
    }

    // 3.2 Buat tabel polis
    await connection.query(`
      CREATE TABLE IF NOT EXISTS polis (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_poli VARCHAR(50) UNIQUE NOT NULL,
        kode_huruf CHAR(1) UNIQUE NOT NULL,
        deskripsi TEXT,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    console.log("Tabel 'polis' siap.");

    // 3.3 Buat tabel registrations
    await connection.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        no_registrasi VARCHAR(20) UNIQUE NOT NULL,
        patient_id INT NOT NULL,
        doctor_id INT NOT NULL,
        poli_id INT NOT NULL,
        tanggal_kunjungan DATE NOT NULL,
        jenis_pembayaran VARCHAR(20) NOT NULL CHECK (jenis_pembayaran IN ('BPJS', 'Umum', 'Asuransi Swasta')),
        keluhan_awal TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Menunggu' CHECK (status IN ('Menunggu', 'Check In', 'Pemeriksaan', 'Selesai')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
        FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (poli_id) REFERENCES polis(id) ON DELETE RESTRICT,
        INDEX idx_registrations_date_status (tanggal_kunjungan, status),
        INDEX idx_registrations_patient (patient_id)
      )
    `);
    console.log("Tabel 'registrations' siap.");

    // 3.4 Buat tabel queues
    await connection.query(`
      CREATE TABLE IF NOT EXISTS queues (
        id INT AUTO_INCREMENT PRIMARY KEY,
        registration_id INT UNIQUE NOT NULL,
        nomor_antrean VARCHAR(10) NOT NULL,
        tanggal_antrean DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'Menunggu' CHECK (status IN ('Menunggu', 'Dipanggil', 'Selesai', 'Dilewati')),
        waktu_panggilan TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE RESTRICT,
        INDEX idx_registrations_date_status (tanggal_antrean, status)
      )
    `);
    console.log("Tabel 'queues' siap.");

    // 4. Seed Roles
    const [roles] = await connection.query(`SELECT COUNT(*) as count FROM roles`);
    if (roles[0].count === 0) {
      await connection.query(`
        INSERT INTO roles (name) VALUES 
        ('Administrator'), 
        ('Dokter'), 
        ('Petugas Pendaftaran')
      `);
      console.log("Data awal 'roles' berhasil ditambahkan.");
    } else {
      console.log("Data 'roles' sudah ada, melewati proses seed roles.");
    }

    // 5. Seed Users
    const [users] = await connection.query(`SELECT COUNT(*) as count FROM users`);
    if (users[0].count === 0) {
      // Ambil ID Roles
      const [roleRows] = await connection.query(`SELECT id, name FROM roles`);
      const getRoleId = (name) => roleRows.find(r => r.name === name).id;

      const adminRoleId = getRoleId('Administrator');
      const dokterRoleId = getRoleId('Dokter');
      const petugasRoleId = getRoleId('Petugas Pendaftaran');

      // Hash passwords
      const adminPass = await bcrypt.hash('admin123', 10);
      const dokterPass = await bcrypt.hash('dokter123', 10);
      const petugasPass = await bcrypt.hash('petugas123', 10);

      await connection.query(`
        INSERT INTO users (role_id, username, password, nama_lengkap) VALUES
        (?, ?, ?, ?),
        (?, ?, ?, ?),
        (?, ?, ?, ?)
      `, [
        adminRoleId, 'admin', adminPass, 'Super Administrator',
        dokterRoleId, 'dr_budi', dokterPass, 'dr. Budi Santoso',
        petugasRoleId, 'petugas1', petugasPass, 'Siti Aminah'
      ]);
      console.log("Data awal 'users' berhasil ditambahkan.");
    } else {
      console.log("Data 'users' sudah ada, melewati proses seed users.");
    }

    // 6. Seed Polis
    const [polisRows] = await connection.query(`SELECT COUNT(*) as count FROM polis`);
    if (polisRows[0].count === 0) {
      await connection.query(`
        INSERT INTO polis (nama_poli, deskripsi, kode_huruf) VALUES
        ('Poli Umum', 'Layanan kesehatan primer umum', 'A'),
        ('Poli Gigi', 'Layanan perawatan dan kesehatan gigi', 'B'),
        ('Poli Anak', 'Layanan spesialis anak', 'C'),
        ('Poli Penyakit Dalam', 'Layanan spesialis penyakit dalam', 'D')
      `);
      console.log("Data awal 'polis' berhasil ditambahkan.");
    } else {
      console.log("Data 'polis' sudah ada, melewati proses seed polis.");
    }

    console.log('Proses inisialisasi dan seeder database SELESAI.');

  } catch (error) {
    console.error('Terjadi kesalahan saat seeding:', error);
  } finally {
    await connection.end();
    process.exit();
  }
}

seedDatabase();
