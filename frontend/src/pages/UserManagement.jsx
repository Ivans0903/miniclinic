import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const UserManagement = () => {
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('ADD'); // 'ADD' | 'EDIT'
    const [selectedUserId, setSelectedUserId] = useState(null);
    
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        nama_lengkap: '',
        role_id: '',
        is_active: true
    });
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    // Delete confirm modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [deleteError, setDeleteError] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/users?search=${encodeURIComponent(searchQuery)}`);
            if (res.data.success) {
                setUsers(res.data.data);
            }
        } catch (error) {
            console.error("Gagal mengambil data pengguna:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const res = await api.get('/users/roles');
            if (res.data.success) {
                setRoles(res.data.data);
                if (res.data.data.length > 0 && !formData.role_id) {
                    setFormData(prev => ({ ...prev, role_id: res.data.data[0].id }));
                }
            }
        } catch (error) {
            console.error("Gagal mengambil daftar role:", error);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            nama_lengkap: '',
            role_id: roles.length > 0 ? roles[0].id : '',
            is_active: true
        });
        setFormErrors({});
        setSelectedUserId(null);
    };

    const openAddModal = () => {
        resetForm();
        setModalMode('ADD');
        setIsModalOpen(true);
    };

    const openEditModal = (u) => {
        setFormErrors({});
        setSelectedUserId(u.id);
        setFormData({
            username: u.username,
            password: '', // Biarkan kosong jika tak diubah
            nama_lengkap: u.nama_lengkap,
            role_id: u.role_id,
            is_active: Boolean(u.is_active)
        });
        setModalMode('EDIT');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setFormErrors({});

        try {
            if (modalMode === 'ADD') {
                const res = await api.post('/users', formData);
                if (res.data.success) {
                    setIsModalOpen(false);
                    fetchUsers();
                }
            } else {
                const res = await api.put(`/users/${selectedUserId}`, formData);
                if (res.data.success) {
                    setIsModalOpen(false);
                    fetchUsers();
                }
            }
        } catch (error) {
            console.error("Submit user error:", error);
            if (error.response && error.response.data && error.response.data.errors) {
                setFormErrors(error.response.data.errors);
            } else if (error.response && error.response.data && error.response.data.message) {
                setFormErrors({ general: error.response.data.message });
            } else {
                setFormErrors({ general: "Terjadi kesalahan pada server" });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const openDeleteModal = (u) => {
        if (currentUser && currentUser.id === u.id) {
            alert("Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!");
            return;
        }
        setUserToDelete(u);
        setDeleteError('');
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        try {
            const res = await api.delete(`/users/${userToDelete.id}`);
            if (res.data.success) {
                setIsDeleteModalOpen(false);
                setUserToDelete(null);
                fetchUsers();
            }
        } catch (error) {
            console.error("Delete user error:", error);
            const msg = error.response?.data?.errors?.general || error.response?.data?.message || "Gagal menghapus pengguna";
            setDeleteError(msg);
        }
    };

    const getRoleBadgeStyle = (roleName) => {
        switch (roleName) {
            case 'Administrator':
                return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Dokter':
                return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Petugas Pendaftaran':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    // Calculate Summary Stats
    const totalAdmin = users.filter(u => u.role_name === 'Administrator').length;
    const totalDokter = users.filter(u => u.role_name === 'Dokter').length;
    const totalPetugas = users.filter(u => u.role_name === 'Petugas Pendaftaran').length;

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans">
            {/* Header Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Manajemen Pengguna & Hak Akses (Role)</h1>
                    <p className="text-xs text-slate-500 mt-1">Kelola akun login, perbarui peran pengguna (Administrator, Dokter, Petugas Pendaftaran), dan amankan kredensial sistem.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-2xl shadow-md transition-all text-sm"
                >
                    <span className="text-lg">👤➕</span> Tambah Pengguna Baru
                </button>
            </div>

            {/* Summary Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xl font-bold">
                        👥
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-slate-400">Total Pengguna</div>
                        <div className="text-xl font-black text-slate-800">{users.length}</div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl font-bold">
                        🛡️
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-slate-400">Administrator</div>
                        <div className="text-xl font-black text-purple-700">{totalAdmin}</div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold">
                        👨‍⚕️
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-slate-400">Dokter</div>
                        <div className="text-xl font-black text-emerald-700">{totalDokter}</div>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold">
                        📋
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-slate-400">Petugas Pendaftaran</div>
                        <div className="text-xl font-black text-blue-700">{totalPetugas}</div>
                    </div>
                </div>
            </div>

            {/* Search Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-6 flex items-center gap-3">
                <span className="text-slate-400 text-lg">🔍</span>
                <input
                    type="text"
                    placeholder="Cari berdasarkan username, nama lengkap, atau role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-sm font-medium text-slate-700 outline-none bg-transparent"
                />
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                                <th className="px-6 py-4">No</th>
                                <th className="px-6 py-4">Username Login</th>
                                <th className="px-6 py-4">Nama Lengkap</th>
                                <th className="px-6 py-4">Peran (Role)</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Aksi Manajemen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400 font-medium">
                                        Memuat data pengguna...
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400 font-medium">
                                        Tidak ada pengguna ditemukan.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u, idx) => {
                                    const isSelf = currentUser && currentUser.id === u.id;
                                    return (
                                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4 font-semibold text-slate-400">{idx + 1}</td>
                                            <td className="px-6 py-4 font-mono font-bold text-slate-800">
                                                {u.username}
                                                {isSelf && (
                                                    <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 font-sans border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                                                        Akun Anda
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-slate-700">{u.nama_lengkap}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${getRoleBadgeStyle(u.role_name)}`}>
                                                    {u.role_name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Aktif
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Nonaktif
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => openEditModal(u)}
                                                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs border border-indigo-200 transition-all"
                                                    >
                                                        ✏️ Ubah Role & Data
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteModal(u)}
                                                        disabled={isSelf}
                                                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all border ${
                                                            isSelf 
                                                                ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' 
                                                                : 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200'
                                                        }`}
                                                    >
                                                        🗑️ Hapus
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Tambah/Edit User */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-lg font-black text-slate-800">
                                {modalMode === 'ADD' ? 'Tambah Pengguna Baru' : 'Ubah Role & Data Pengguna'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                                ✖
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {formErrors.general && (
                                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                                    {formErrors.general}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Nama Lengkap <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nama_lengkap}
                                    onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                                    placeholder="Cth: Dr. Ahmad Subandi / Admin Utama"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                {formErrors.nama_lengkap && <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.nama_lengkap}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Username Login <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                                    placeholder="Cth: dokter1 / admin2"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                {formErrors.username && <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.username}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Password {modalMode === 'ADD' ? <span className="text-rose-500">*</span> : <span className="text-slate-400 font-normal lowercase">(kosongkan jika tidak diubah)</span>}
                                </label>
                                <input
                                    type="password"
                                    required={modalMode === 'ADD'}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder={modalMode === 'ADD' ? 'Masukkan password akun' : '•••••••• (Tetap sama)'}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                {formErrors.password && <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.password}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Peran / Role Pengguna <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={formData.role_id}
                                    onChange={(e) => setFormData({ ...formData, role_id: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                                >
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                                {formErrors.role_id && <p className="text-rose-500 text-xs mt-1 font-semibold">{formErrors.role_id}</p>}
                            </div>

                            {modalMode === 'EDIT' && (
                                <div className="flex items-center gap-3 pt-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor="is_active" className="text-xs font-bold text-slate-700">
                                        Status Akun Aktif (Bisa Digunakan Login)
                                    </label>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all"
                                >
                                    {submitting ? 'Menyimpan...' : 'Simpan Akun Pengguna'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Konfirmasi Hapus User */}
            {isDeleteModalOpen && userToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 p-6 text-center">
                        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 font-bold">
                            ⚠️
                        </div>
                        <h3 className="text-lg font-black text-slate-800 mb-1">Konfirmasi Hapus Akun</h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Apakah Anda yakin ingin menghapus akun <span className="font-bold text-slate-800">{userToDelete.nama_lengkap}</span> (<span className="font-mono text-blue-600">{userToDelete.username}</span>)?
                        </p>

                        {deleteError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl mb-4 text-left">
                                {deleteError}
                            </div>
                        )}

                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all"
                            >
                                Ya, Hapus Akun
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
