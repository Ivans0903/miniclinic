# Mini Clinic App

Aplikasi Mini Clinic adalah sistem informasi manajemen klinik berbasis web yang memungkinkan petugas pendaftaran, dokter, dan administrator untuk mengelola pasien, rekam medis, antrean, dan layanan medis secara terintegrasi.

> **DISCLAIMER:** Semua data pasien, rekam medis, dan informasi yang terdapat di dalam database dan aplikasi ini (pada proses *seeding*) adalah **fiktif** dan hanya digunakan untuk keperluan pengujian dan demonstrasi. Jika terdapat kesamaan nama, tempat, nomor telepon, NIK, atau informasi lainnya dengan data asli, hal tersebut murni kebetulan belaka dan kami memohon maaf yang sebesar-besarnya.

---

## 🛠️ Persyaratan Sistem

Pastikan Anda telah menginstal *tools* berikut sebelum menjalankan aplikasi:
- [Node.js](https://nodejs.org/) (disarankan versi 18 atau lebih baru)
- MySQL Database (bisa menggunakan [Laragon](https://laragon.org/) / XAMPP)
- Git (Opsional)

---

## 📂 Struktur Project

Project ini dibagi menjadi dua bagian utama: `frontend` (menggunakan React + Vite) dan `backend` (menggunakan Node.js + Express).

```text
miniclinic/
├── backend/                  # Server-side (Node.js & Express)
│   ├── src/
│   │   ├── config/           # Konfigurasi Database & lain-lain
│   │   ├── controllers/      # Logika Bisnis & Request Handler
│   │   ├── middlewares/      # Middleware (Auth, Role, Validation)
│   │   ├── routes/           # Routing API
│   │   ├── scripts/          # Script utilitas (termasuk Seeders)
│   │   ├── seeds/            # Data seed untuk database
│   │   └── utils/            # Helper/Utility Functions
│   ├── .env.example          # Contoh environment variables backend
│   ├── package.json          # Dependency backend
│   └── app.js                # Entry point server backend
├── frontend/                 # Client-side (React + Vite)
│   ├── src/
│   │   ├── assets/           # Gambar, icons, dll
│   │   ├── components/       # Komponen UI Reusable
│   │   ├── pages/            # Halaman Web (Login, Dashboard, dll)
│   │   ├── services/         # Koneksi API (Axios)
│   │   ├── App.jsx           # Root component
│   │   └── main.jsx          # Entry point aplikasi react
│   ├── .env.example          # Contoh environment variables frontend
│   ├── package.json          # Dependency frontend
│   └── vite.config.js        # Konfigurasi Vite
└── docs/                     # Dokumentasi dan File Database SQL
    └── database/
        └── clinic_db.sql     # Skema database
```

---

## ⚙️ Konfigurasi Environment Variables (.env)

> **PENTING:** Konfigurasi database, `JWT Secret`, URL, dan informasi sensitif lainnya **TIDAK BOLEH** di-*hardcode* ke dalam *source code* aplikasi. Gunakan file `.env` untuk mengatur konfigurasi tersebut.

### 1. Konfigurasi Backend
Duplikat atau *rename* file `backend/.env.example` menjadi `backend/.env`, lalu sesuaikan nilainya:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASS=          # Isi dengan password database Anda jika ada
DB_NAME=clinic_db
DB_PORT=3306
JWT_SECRET=supersecret_miniclinic_jwt_2026 # Ganti dengan secret key yang kuat di production
JWT_EXPIRES_IN=1d
```

### 2. Konfigurasi Frontend
Duplikat atau *rename* file `frontend/.env.example` menjadi `frontend/.env`, lalu sesuaikan nilainya:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🗄️ Migrasi Database & Seeding

Aplikasi ini membutuhkan database MySQL untuk berjalan.

1. Buka aplikasi manajemen MySQL Anda (misalnya HeidiSQL, phpMyAdmin, atau MySQL CLI).
2. Buat database baru bernama `clinic_db` (atau sesuai nama di file `.env`).
3. Import file `docs/database/clinic_db.sql` ke dalam database `clinic_db` yang baru dibuat. File ini berisi struktur tabel (skema) yang dibutuhkan.
4. Untuk mengisi *dummy data* awal (Akun pengguna, Pasien, Tindakan Medis, dan Obat), buka terminal dan jalankan *seeder script* berikut di dalam folder `backend`:
   ```bash
   cd backend
   npm run seed
   ```
   Atau secara manual dengan:
   ```bash
   node src/scripts/seed.js
   ```

---

## 🚀 Cara Instalasi & Menjalankan Aplikasi

Aplikasi ini membutuhkan dua terminal terpisah untuk menjalankan frontend dan backend secara bersamaan.

### 1. Menjalankan Backend (Server API)
Buka terminal baru:
```bash
# Pindah ke direktori backend
cd backend

# Install dependencies
npm install

# Jalankan server (Mode Development)
npm run dev
# Server akan berjalan pada http://localhost:5000
```

### 2. Menjalankan Frontend (Client Web)
Buka terminal baru lainnya:
```bash
# Pindah ke direktori frontend
cd frontend

# Install dependencies
npm install

# Jalankan aplikasi (Mode Development)
npm run dev
# Frontend akan berjalan pada http://localhost:5173
```

Aplikasi web sekarang dapat diakses melalui browser Anda di **[http://localhost:5173](http://localhost:5173)**.

---

## 🔐 Akun Login Default

Jika Anda telah menjalankan script migrasi dan *seeder* (`node src/scripts/seed.js`), aplikasi akan menyediakan 3 peran pengguna (*role*) dengan akun bawaan sebagai berikut:

| Peran (Role) | Username | Password | Deskripsi Akses |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin1234` | Kontrol penuh sistem, manajemen *user*, *role*, data pasien, serta akses semua menu. |
| **Dokter** | `dokter` | `dokter1234` | Akses manajemen antrean, input rekam medis (SOAP), penambahan obat, dan tindakan medis. Tidak bisa edit/hapus data pasien. |
| **Petugas** | `petugas` | `petugas1234` | Akses manajemen pendaftaran pasien, tambah antrean, ubah data pasien, dan edit pasien. Tidak dapat mengisi detail medis (SOAP). |

> *Catatan: Segera ubah password *default* ini jika aplikasi digunakan pada *environment production*.*
