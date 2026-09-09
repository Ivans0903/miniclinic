import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const PatientManagement = () => {
    const { user } = useAuth();
    const userRole = user?.role || 'Administrator';
    const canEditPatient = ['Administrator', 'Petugas Pendaftaran'].includes(userRole);
    const canAddPatient = ['Administrator', 'Petugas Pendaftaran'].includes(userRole);
    const canDeletePatient = ['Administrator', 'Petugas Pendaftaran'].includes(userRole);

    // 1. STATE
    const [patients, setPatients] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, limit: 10 });
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('ADD'); // "ADD", "EDIT", "DETAIL"
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [formData, setFormData] = useState({
        nik: '',
        nama_pasien: '',
        jenis_kelamin: 'Laki-laki',
        tanggal_lahir: '',
        nomor_telepon: '',
        alamat: '',
        kode_wilayah: '32'
    });
    const [errors, setErrors] = useState({});
    
    // States for Medical History
    const [patientHistory, setPatientHistory] = useState([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    
    const searchTimeoutRef = useRef(null);

    // 2. LIFECYCLE & FETCH_PATIENT_DATA
    const fetchPatientData = async (page = pagination.current_page, search = searchQuery) => {
        try {
            const response = await api.get(`/patients?page=${page}&limit=10&search=${search}`);
            if (response.data.success) {
                setPatients(response.data.data.patients);
                setPagination(response.data.data.pagination);
            }
        } catch (error) {
            console.error("Gagal mengambil data pasien", error);
        }
    };

    useEffect(() => {
        fetchPatientData(pagination.current_page, searchQuery);
        // eslint-disable-next-line
    }, [pagination.current_page, searchQuery]);

    // 3. HANDLE_SEARCH with Debounce
    const handleSearch = (event) => {
        const value = event.target.value;
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        
        searchTimeoutRef.current = setTimeout(() => {
            setSearchQuery(value);
            setPagination(prev => ({ ...prev, current_page: 1 }));
        }, 500);
    };

    // Helper functions for Modal
    const resetForm = () => {
        setFormData({
            nik: '', nama_pasien: '', jenis_kelamin: 'Laki-laki', 
            tanggal_lahir: '', nomor_telepon: '', alamat: '', kode_wilayah: '32'
        });
        setErrors({});
    };

    const openAddModal = () => {
        resetForm();
        setModalMode('ADD');
        setIsModalOpen(true);
    };

    const openEditModal = (patient) => {
        setErrors({});
        setFormData({
            nik: patient.nik,
            nama_pasien: patient.nama_pasien,
            jenis_kelamin: patient.jenis_kelamin,
            tanggal_lahir: patient.tanggal_lahir.split('T')[0], // Extract YYYY-MM-DD
            nomor_telepon: patient.nomor_telepon,
            alamat: patient.alamat
        });
        setSelectedPatient(patient);
        setModalMode('EDIT');
        setIsModalOpen(true);
    };

    const openDetailModal = (patient) => {
        setFormData({
            nik: patient.nik,
            nama_pasien: patient.nama_pasien,
            jenis_kelamin: patient.jenis_kelamin,
            tanggal_lahir: patient.tanggal_lahir,
            nomor_telepon: patient.nomor_telepon,
            alamat: patient.alamat,
            no_rekam_medis: patient.no_rekam_medis
        });
        setSelectedPatient(patient);
        setModalMode('DETAIL');
        setIsModalOpen(true);
    };

    // 4. HANDLE_SUBMIT_SAVE
    const handleSubmitSave = async (e) => {
        e.preventDefault();
        setErrors({});
        
        try {
            let res;
            if (modalMode === 'ADD') {
                res = await api.post('/patients', formData);
            } else if (modalMode === 'EDIT') {
                res = await api.put(`/patients/${selectedPatient.id}`, formData);
            }

            if (res.data.success) {
                setIsModalOpen(false);
                fetchPatientData();
            }
        } catch (error) {
            if (error.response && error.response.data.errors) {
                setErrors(error.response.data.errors);
            } else {
                alert(error.response?.data?.message || "Terjadi kesalahan sistem");
            }
        }
    };

    // 5. HANDLE_DELETE
    const handleDelete = async (patientId) => {
        if (window.confirm("Apakah Anda yakin ingin menghapus data pasien ini?")) {
            try {
                const res = await api.delete(`/patients/${patientId}`);
                if (res.data.success) {
                    fetchPatientData();
                }
            } catch (error) {
                alert(error.response?.data?.message || "Gagal menghapus pasien. Mungkin karena masih ada riwayat.");
            }
        }
    };

    const fetchPatientHistory = async (patientId) => {
        setLoadingHistory(true);
        try {
            const res = await api.get(`/medical-records/patient/${patientId}`);
            if (res.data.success) {
                setPatientHistory(res.data.data.history || []);
                setShowHistoryModal(true);
            }
        } catch (error) {
            console.error("Riwayat pasien kosong atau gagal dimuat", error);
            setPatientHistory([]);
            setShowHistoryModal(true); // Tetap tampilkan meski kosong
        } finally {
            setLoadingHistory(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleString('id-ID', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // 6. RENDER
    return (
        <div className="p-6 max-w-7xl mx-auto font-sans">
            <h1 className="text-2xl font-bold mb-2 text-gray-800">Manajemen Master Data Pasien</h1>
            <p className="text-xs text-gray-500 mb-6">Database rekam medis dan data demografi pasien terintegrasi</p>
            
            {!canEditPatient && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                    <span className="text-xl">👨‍⚕️</span>
                    <div>
                        <div className="text-xs font-bold text-emerald-800">Akses Peran Dokter</div>
                        <div className="text-xs text-emerald-700">Anda dapat melihat seluruh detail data pasien di sini. Pengisian Rekam Medis (SOAP), Diagnosa/Penyakit, dan Resep Obat dilakukan pada menu <strong>Pendaftaran & Antrean Poli</strong>.</div>
                    </div>
                </div>
            )}

            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
                <input 
                    type="text" 
                    placeholder="Cari No RM / NIK (16 digit) / Nama Pasien..." 
                    onChange={handleSearch}
                    className="border border-gray-300 p-2.5 rounded-xl w-full sm:w-1/2 focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm"
                />
                {canAddPatient && (
                    <button 
                        onClick={openAddModal}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm transition duration-200 text-sm flex items-center justify-center gap-2"
                    >
                        <span>➕</span> Tambah Pasien Baru
                    </button>
                )}
            </div>

            {/* TABLE_RESPONSIVE */}
            <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">No. RM (Unik)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">NIK (16 Digit)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama Pasien</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Gender</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tanggal Lahir</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">No. Telepon</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                        {patients.map(patient => (
                            <tr key={patient.id} className="hover:bg-blue-50/60 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-mono font-bold rounded-full bg-emerald-100 text-emerald-800">
                                        {patient.no_rekam_medis}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-mono font-semibold text-slate-800 tracking-wider">
                                    {patient.nik}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800">{patient.nama_pasien}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{patient.jenis_kelamin}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{formatDate(patient.tanggal_lahir)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-mono">{patient.nomor_telepon}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-medium flex justify-center gap-2">
                                    <button 
                                        onClick={() => openDetailModal(patient)} 
                                        className="text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1.5 rounded-lg font-semibold transition"
                                    >
                                        👁️ Detail
                                    </button>
                                    <button 
                                        onClick={() => { setSelectedPatient(patient); fetchPatientHistory(patient.id); }}
                                        className="text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1"
                                    >
                                        <span>📜</span> Riwayat
                                    </button>
                                    {canEditPatient && (
                                        <button 
                                            onClick={() => openEditModal(patient)} 
                                            className="text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg font-semibold transition"
                                        >
                                            ✏️ Edit Pasien
                                        </button>
                                    )}
                                    {canDeletePatient && (
                                        <button 
                                            onClick={() => handleDelete(patient.id)} 
                                            className="text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg font-semibold transition"
                                        >
                                            🗑️ Delete
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {patients.length === 0 && (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                    Tidak ada data pasien yang ditemukan
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION_CONTROLS */}
            <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-lg shadow border border-gray-200">
                <button 
                    disabled={pagination.current_page <= 1}
                    onClick={() => setPagination(prev => ({...prev, current_page: prev.current_page - 1}))}
                    className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                    &laquo; Prev
                </button>
                <span className="text-sm text-gray-600">
                    Halaman <span className="font-bold text-gray-800">{pagination.current_page}</span> dari <span className="font-bold text-gray-800">{pagination.total_pages || 1}</span>
                </span>
                <button 
                    disabled={pagination.current_page >= pagination.total_pages}
                    onClick={() => setPagination(prev => ({...prev, current_page: prev.current_page + 1}))}
                    className="px-4 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                    Next &raquo;
                </button>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-gray-900 bg-opacity-60 backdrop-blur-sm p-4 transition-opacity">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl transform transition-all">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h2 className="text-xl font-bold text-gray-800">
                                {modalMode === 'ADD' && "Tambah Data Pasien"}
                                {modalMode === 'EDIT' && "Ubah Data Pasien"}
                                {modalMode === 'DETAIL' && "Detail Data Pasien"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 focus:outline-none text-2xl font-semibold">
                                &times;
                            </button>
                        </div>
                        <div className="px-6 py-6">
                            <form onSubmit={handleSubmitSave}>
                                {modalMode === 'DETAIL' && formData.no_rekam_medis && (
                                    <div className="mb-5">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">No Rekam Medis</label>
                                        <input type="text" value={formData.no_rekam_medis} readOnly className="w-full border border-gray-300 p-2.5 rounded-lg bg-gray-100 text-gray-700 font-mono" />
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">NIK</label>
                                        <input 
                                            type="text" 
                                            value={formData.nik} 
                                            onChange={e => setFormData({...formData, nik: e.target.value.replace(/\D/g, '').slice(0, 16)})}
                                            readOnly={modalMode === 'DETAIL'}
                                            className={`w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition ${modalMode === 'DETAIL' ? 'bg-gray-100 text-gray-600' : ''}`}
                                            required
                                            minLength="16"
                                            maxLength="16"
                                            pattern="\d{16}"
                                            title="NIK harus tepat 16 digit angka"
                                        />
                                        {errors.nik && <p className="text-red-500 text-xs mt-1.5">{errors.nik}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Pasien</label>
                                        <input 
                                            type="text" 
                                            value={formData.nama_pasien} 
                                            onChange={e => setFormData({...formData, nama_pasien: e.target.value})}
                                            readOnly={modalMode === 'DETAIL'}
                                            className={`w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition ${modalMode === 'DETAIL' ? 'bg-gray-100 text-gray-600' : ''}`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Jenis Kelamin</label>
                                        <select 
                                            value={formData.jenis_kelamin}
                                            onChange={e => setFormData({...formData, jenis_kelamin: e.target.value})}
                                            disabled={modalMode === 'DETAIL'}
                                            className={`w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition ${modalMode === 'DETAIL' ? 'bg-gray-100 text-gray-600' : 'bg-white'}`}
                                        >
                                            <option value="Laki-laki">Laki-laki</option>
                                            <option value="Perempuan">Perempuan</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Lahir</label>
                                        <input 
                                            type={modalMode === 'DETAIL' ? 'text' : 'date'} 
                                            value={modalMode === 'DETAIL' ? formatDate(formData.tanggal_lahir) : formData.tanggal_lahir} 
                                            onChange={e => setFormData({...formData, tanggal_lahir: e.target.value})}
                                            readOnly={modalMode === 'DETAIL'}
                                            className={`w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition ${modalMode === 'DETAIL' ? 'bg-gray-100 text-gray-600' : ''}`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">No Telepon</label>
                                        <input 
                                            type="text" 
                                            value={formData.nomor_telepon} 
                                            onChange={e => setFormData({...formData, nomor_telepon: e.target.value.replace(/\D/g, '').slice(0, 13)})}
                                            readOnly={modalMode === 'DETAIL'}
                                            className={`w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition ${modalMode === 'DETAIL' ? 'bg-gray-100 text-gray-600' : ''}`}
                                            required
                                            minLength="10"
                                            maxLength="13"
                                            pattern="^08\d{8,11}$"
                                            title="Nomor telepon harus diawali '08' dengan panjang 10-13 digit"
                                        />
                                        {errors.nomor_telepon && <p className="text-red-500 text-xs mt-1.5">{errors.nomor_telepon}</p>}
                                    </div>
                                    {modalMode === 'ADD' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Kode Wilayah</label>
                                            <input 
                                                type="text" 
                                                value={formData.kode_wilayah} 
                                                onChange={e => setFormData({...formData, kode_wilayah: e.target.value})}
                                                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition"
                                                placeholder="Cth: 32"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-5">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Alamat</label>
                                    <textarea 
                                        value={formData.alamat} 
                                        onChange={e => setFormData({...formData, alamat: e.target.value})}
                                        readOnly={modalMode === 'DETAIL'}
                                        className={`w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition ${modalMode === 'DETAIL' ? 'bg-gray-100 text-gray-600' : ''}`}
                                        rows="3"
                                        required
                                    ></textarea>
                                </div>

                                <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                                    >
                                        Tutup
                                    </button>
                                    {modalMode !== 'DETAIL' && (
                                        <button 
                                            type="submit"
                                            className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm transition"
                                        >
                                            Simpan Pasien
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL_HISTORY */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900 bg-opacity-60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4 bg-white shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-gray-800">
                                    Riwayat Rekam Medis: <span className="text-blue-600">{selectedPatient?.nama_pasien}</span>
                                </h3>
                                <p className="text-xs text-gray-500 font-mono mt-1">No RM: {selectedPatient?.no_rekam_medis} | NIK: {selectedPatient?.nik}</p>
                            </div>
                            <button onClick={() => setShowHistoryModal(false)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold text-sm transition">
                                ✕
                            </button>
                        </div>
                        
                        <div className="space-y-4 overflow-y-auto pr-2 flex-1">
                            {loadingHistory ? (
                                <div className="text-center py-10">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                    <p className="text-sm font-medium text-gray-500">Memuat Riwayat Medis...</p>
                                </div>
                            ) : patientHistory.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <div className="text-3xl mb-2">📁</div>
                                    <p className="text-sm text-gray-500 font-medium">Belum ada riwayat pemeriksaan medis sebelumnya.</p>
                                </div>
                            ) : (
                                patientHistory.map((rec) => (
                                    <div key={rec.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-3 shadow-sm hover:shadow-md transition">
                                        <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                                            <div>
                                                <span className="text-sm font-bold text-gray-800">{formatDateTime(rec.created_at)}</span>
                                                <span className="ml-2 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">({rec.nama_dokter} - {rec.nama_poli})</span>
                                            </div>
                                            <span className="text-[10px] font-mono font-bold bg-white px-2.5 py-1 rounded-full border border-gray-300 text-gray-700 shadow-sm">
                                                #{rec.no_registrasi}
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                                            <div className="bg-white p-3 rounded-xl border border-gray-100"><strong className="text-blue-800 block mb-1 text-xs uppercase tracking-wider">S (Keluhan):</strong> {rec.subjective}</div>
                                            <div className="bg-white p-3 rounded-xl border border-gray-100"><strong className="text-blue-800 block mb-1 text-xs uppercase tracking-wider">O (Tanda Vital):</strong> TD: {rec.tekanan_darah}, Suhu: {rec.suhu_tubuh}°C, BB: {rec.berat_badan}kg</div>
                                            <div className="bg-white p-3 rounded-xl border border-gray-100"><strong className="text-emerald-800 block mb-1 text-xs uppercase tracking-wider">A (Diagnosa):</strong> {rec.assessment}</div>
                                            <div className="bg-white p-3 rounded-xl border border-gray-100"><strong className="text-purple-800 block mb-1 text-xs uppercase tracking-wider">P (Plan):</strong> {rec.plan}</div>
                                        </div>

                                        {/* Tindakan */}
                                        {rec.actions && rec.actions.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2">⚕️ Tindakan Medis:</div>
                                                <ul className="space-y-1.5">
                                                    {rec.actions.map(act => (
                                                        <li key={act.id} className="text-xs bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
                                                            <span className="font-semibold text-gray-800">{act.nama_tindakan}</span>
                                                            {act.catatan && <span className="text-gray-500 italic">"{act.catatan}"</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Resep Obat */}
                                        {rec.prescription && rec.prescription.items && rec.prescription.items.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-2">💊 Resep Obat:</div>
                                                <ul className="space-y-1.5">
                                                    {rec.prescription.items.map(item => (
                                                        <li key={item.id} className="text-xs bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
                                                            <div>
                                                                <span className="font-semibold text-gray-800">{item.nama_obat}</span> 
                                                                <span className="text-gray-500 ml-1">({item.jumlah} {item.satuan})</span>
                                                            </div>
                                                            <span className="font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">{item.aturan_pakai}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientManagement;
