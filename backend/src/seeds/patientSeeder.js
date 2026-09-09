// backend/src/seeds/patientSeeder.js
const provinces = ['31', '32', '33', '35']; // DKI, Jabar, Jateng, Jatim

const firstNamesMale = ['Budi', 'Agus', 'Eko', 'Rizky', 'Dedi', 'Bambang', 'Hendra', 'Fajar', 'Aditya', 'Irfan', 'Dimas', 'Guntur'];
const firstNamesFemale = ['Siti', 'Dewi', 'Rina', 'Sri', 'Putri', 'Nurul', 'Indah', 'Fitri', 'Ayu', 'Lestari', 'Mega', 'Tari'];
const lastNames = ['Santoso', 'Pratama', 'Hidayat', 'Saputra', 'Wijaya', 'Kusuma', 'Nugroho', 'Setiawan', 'Wibowo', 'Siregar'];

function generate100Patients() {
  const dummyList = [];

  for (let id = 1; id <= 100; id++) {
    const isMale = id % 2 !== 0;
    const gender = isMale ? 'Laki-laki' : 'Perempuan';
    
    // 1. Kode wilayah (2 digit)
    const wilayah = provinces[(id - 1) % provinces.length];
    
    // 2. Primary key zero-padded (3 digit)
    const pkStr = String(id).padStart(3, '0');
    
    // 3. Digit gender (1 digit: Male 0-4, Female 5-9)
    const genderDigit = isMale ? ((id * 3) % 5) : (5 + ((id * 3) % 5));
    
    // Kode Rahasia Rekam Medis (6 karakter)
    const no_rekam_medis = `${wilayah}${pkStr}${genderDigit}`;

    // NIK 16 digit realistis (Wilayah + TglLahir + Urut)
    const birthYear = 1970 + (id % 35);
    const birthMonth = String((id % 12) + 1).padStart(2, '0');
    let birthDay = (id % 28) + 1;
    let nikDay = isMale ? birthDay : birthDay + 40; // Standar NIK: perempuan hari + 40
    const nik = `${wilayah}0101${String(nikDay).padStart(2, '0')}${birthMonth}${String(birthYear).slice(-2)}${String(id).padStart(4, '0')}`;

    const firstName = isMale ? firstNamesMale[id % firstNamesMale.length] : firstNamesFemale[id % firstNamesFemale.length];
    const lastName = lastNames[(id + 2) % lastNames.length];
    const nama_pasien = `${firstName} ${lastName}`;
    const tanggal_lahir = `${birthYear}-${birthMonth}-${String(birthDay).padStart(2, '0')}`;
    const nomor_telepon = `0812${String(10000000 + (id * 98765)).slice(0, 8)}`;
    const alamat = `Jl. Pelayanan Sehat No. ${id}, RT 0${(id % 9) + 1}/RW 0${(id % 5) + 1}, Wilayah ${wilayah}`;

    dummyList.push({
      id,
      no_rekam_medis,
      nik,
      nama_pasien,
      jenis_kelamin: gender,
      tanggal_lahir,
      nomor_telepon,
      alamat
    });
  }

  return dummyList;
}

// Menghasilkan Query INSERT SQL murni untuk di-import
const patients = generate100Patients();
console.log("INSERT INTO patients (id, no_rekam_medis, nik, nama_pasien, jenis_kelamin, tanggal_lahir, nomor_telepon, alamat) VALUES");
const sqlValues = patients.map(p => 
  `(${p.id}, '${p.no_rekam_medis}', '${p.nik}', '${p.nama_pasien}', '${p.jenis_kelamin}', '${p.tanggal_lahir}', '${p.nomor_telepon}', '${p.alamat}')`
).join(',\n') + ';';

console.log(sqlValues);
