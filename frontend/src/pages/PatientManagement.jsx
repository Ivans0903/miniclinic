import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const PatientManagement = () => {
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

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'long', year: 'numeric'
        });
    };

    // 6. RENDER
    return (
        <div className="p-6 max-w-7xl mx-auto font-sans">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Manajemen Master Data Pasien</h1>
            
            {/* TOOLBAR */}
            <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
                <input 
                    type="text" 
                    placeholder="Cari No RM / NIK / Nama..." 
                    onChange={handleSearch}
                    className="border border-gray-300 p-2 rounded-md w-full sm:w-1/3 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
                <button 
                    onClick={openAddModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md shadow-sm transition duration-200"
                >
                    + Tambah Pasien
                </button>
            </div>

            {/* TABLE_RESPONSIVE */}
            <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">No. RM</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">NIK</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama Pasien</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Gender</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tanggal Lahir</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">No. Telepon</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {patients.map(patient => (
                            <tr key={patient.id} className="hover:bg-blue-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-emerald-100 text-emerald-800">
                                        {patient.no_rekam_medis}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{patient.nik}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">{patient.nama_pasien}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{patient.jenis_kelamin}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(patient.tanggal_lahir)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{patient.nomor_telepon}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium flex justify-center gap-2">
                                    <button onClick={() => openDetailModal(patient)} className="text-teal-600 hover:text-teal-900 bg-teal-50 px-3 py-1 rounded">View</button>
                                    <button onClick={() => openEditModal(patient)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded">Edit</button>
                                    <button onClick={() => handleDelete(patient.id)} className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded">Delete</button>
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
                                            onChange={e => setFormData({...formData, nik: e.target.value})}
                                            readOnly={modalMode === 'DETAIL'}
                                            className={`w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition ${modalMode === 'DETAIL' ? 'bg-gray-100 text-gray-600' : ''}`}
                                            required
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
                                            onChange={e => setFormData({...formData, nomor_telepon: e.target.value})}
                                            readOnly={modalMode === 'DETAIL'}
                                            className={`w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none transition ${modalMode === 'DETAIL' ? 'bg-gray-100 text-gray-600' : ''}`}
                                            required
                                        />
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
        </div>
    );
};

export default PatientManagement;
