import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const QueueManagement = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [queues, setQueues] = useState([]);
    const [currentlyCalling, setCurrentlyCalling] = useState(null);
    const [filterPoli, setFilterPoli] = useState('ALL');

    // Registration Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState('');

    const [patients, setPatients] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [polis, setPolis] = useState([]);

    const todayStr = new Date().toISOString().split('T')[0];

    const [formData, setFormData] = useState({
        patient_id: '',
        doctor_id: '',
        poli_id: '',
        tanggal_kunjungan: todayStr,
        jenis_pembayaran: 'Umum',
        keluhan_awal: ''
    });

    const userRole = user?.role || 'Administrator';
    const canCreateQueue = ['Administrator', 'Petugas Pendaftaran'].includes(userRole);
    const canExamine = ['Administrator', 'Dokter'].includes(userRole);

    const fetchQueues = async () => {
        try {
            const poliQuery = filterPoli === 'ALL' ? '' : `&poli_id=${filterPoli}`;
            const response = await api.get(`/queues?${poliQuery}`);
            if (response.data.success) {
                setQueues(response.data.data.queues);
                setCurrentlyCalling(response.data.data.currently_calling);
            }
        } catch (error) {
            console.error("Gagal mengambil data antrean", error);
        }
    };

    const fetchOptions = async () => {
        try {
            const res = await api.get('/registrations/options');
            if (res.data.success) {
                const { doctors, polis, patients } = res.data.data;
                setDoctors(doctors || []);
                setPolis(polis || []);
                setPatients(patients || []);

                if (patients.length > 0 && !formData.patient_id) {
                    setFormData(prev => ({ ...prev, patient_id: patients[0].id }));
                }
                if (doctors.length > 0 && !formData.doctor_id) {
                    setFormData(prev => ({ ...prev, doctor_id: doctors[0].id }));
                }
                if (polis.length > 0 && !formData.poli_id) {
                    setFormData(prev => ({ ...prev, poli_id: polis[0].id }));
                }
            }
        } catch (error) {
            console.error("Gagal mengambil master opsi pendaftaran", error);
        }
    };

    useEffect(() => {
        fetchQueues();
        fetchOptions();

        const intervalId = setInterval(() => {
            fetchQueues();
        }, 5000);

        return () => clearInterval(intervalId);
        // eslint-disable-next-line
    }, [filterPoli]);

    const playAudioAnnouncement = (nomorAntrean, namaPoli) => {
        if ('speechSynthesis' in window) {
            const spelledNumber = nomorAntrean.split('').join(' ');
            const text = `Nomor antrean, ${spelledNumber}, silakan menuju ke ${namaPoli}`;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'id-ID';
            utterance.rate = 0.85;
            window.speechSynthesis.speak(utterance);
        }
    };

    const handleCallNext = async () => {
        const nextQueue = queues.find(q => q.status_antrean === "Menunggu");
        if (nextQueue) {
            try {
                const res = await api.put(`/queues/${nextQueue.queue_id}/call`);
                if (res.data.success) {
                    playAudioAnnouncement(nextQueue.nomor_antrean, nextQueue.nama_poli);
                    fetchQueues();
                }
            } catch (error) {
                alert(error.response?.data?.message || "Gagal memanggil antrean");
            }
        } else {
            alert("Tidak ada antrean yang menunggu.");
        }
    };

    const handleCallAgain = async (queueId, nomorAntrean, namaPoli) => {
        try {
            const res = await api.put(`/queues/${queueId}/call`);
            if (res.data.success) {
                playAudioAnnouncement(nomorAntrean, namaPoli);
                fetchQueues();
            }
        } catch (error) {
            alert(error.response?.data?.message || "Gagal memanggil ulang");
        }
    };

    const handleSetStatus = async (queueId, statusName) => {
        try {
            const res = await api.put(`/queues/${queueId}/status`, { status: statusName });
            if (res.data.success) {
                fetchQueues();
            }
        } catch (error) {
            alert(error.response?.data?.message || "Gagal mengubah status antrean");
        }
    };

    const handleCreateRegistration = async (e) => {
        e.preventDefault();
        if (!formData.patient_id || !formData.doctor_id || !formData.poli_id || !formData.keluhan_awal) {
            setModalError('Semua field bertanda bintang (*) wajib diisi.');
            return;
        }

        setModalError('');
        setModalLoading(true);

        try {
            const res = await api.post('/registrations', formData);
            if (res.data.success) {
                alert(`Pendaftaran & Antrean Berhasil Dibuat!\nNomor Antrean: ${res.data.data.nomor_antrean}`);
                setIsModalOpen(false);
                setFormData(prev => ({ ...prev, keluhan_awal: '' }));
                fetchQueues();
            }
        } catch (error) {
            console.error("Gagal buat pendaftaran:", error);
            const errDetail = error.response?.data?.errors?.general || error.response?.data?.message || "Gagal mendaftarkan pasien";
            setModalError(errDetail);
        } finally {
            setModalLoading(false);
        }
    };

    const formatTime = (timeString) => {
        if (!timeString) return "-";
        return new Date(timeString).toLocaleTimeString('id-ID', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto font-sans">
            {/* Header & Main Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Manajemen Antrean & Pendaftaran</h1>
                    <p className="text-xs text-slate-500 mt-1">Pemanggilan antrean realtime dan pendaftaran pasien poli hari ini</p>
                </div>
                {canCreateQueue && (
                    <button
                        onClick={() => { fetchOptions(); setIsModalOpen(true); }}
                        className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-2xl shadow-md transition-all text-sm"
                    >
                        <span className="text-lg">➕</span> Tambah Pendaftaran & Antrean Baru
                    </button>
                )}
            </div>

            {/* CARD_ACTIVE_CALL: Panggilan Aktif */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 border-t-4 border-t-blue-600 p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1 w-full text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 mb-3">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                        ANTREAN SEDANG DIPANGGIL
                    </div>
                    {currentlyCalling ? (
                        <div>
                            <div className="text-6xl font-black text-blue-600 tracking-tighter mb-2">
                                {currentlyCalling.nomor_antrean}
                            </div>
                            <div className="text-xl text-slate-800 font-bold">
                                {currentlyCalling.nama_pasien} <span className="text-slate-300 font-normal mx-2">|</span> <span className="text-blue-600 font-semibold">{currentlyCalling.nama_poli}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-base text-slate-400 font-medium italic py-4">Belum ada nomor antrean yang dipanggil saat ini.</div>
                    )}
                </div>
                
                <div className="flex flex-col gap-3 w-full md:w-auto min-w-[280px]">
                    {currentlyCalling && (
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleSetStatus(currentlyCalling.queue_id, "Selesai")}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all"
                            >
                                Selesai / Masuk
                            </button>
                            <button 
                                onClick={() => handleSetStatus(currentlyCalling.queue_id, "Dilewati")}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all"
                            >
                                Lewati (Absen)
                            </button>
                        </div>
                    )}
                    <button 
                        onClick={handleCallNext}
                        disabled={currentlyCalling !== null}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                    >
                        <span className="text-xl">📢</span> Panggil Antrean Berikutnya
                    </button>
                </div>
            </div>

            {/* TABLE_QUEUES: Daftar Antrean Realtime */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-base font-bold text-slate-800">Daftar Antrean Pasien Hari Ini</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Filter Poli:</span>
                        <select
                            value={filterPoli}
                            onChange={(e) => setFilterPoli(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl text-xs font-semibold px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">Semua Poli</option>
                            {polis.map(p => (
                                <option key={p.id} value={p.id}>{p.nama_poli}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/70">
                            <tr>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">No. Antrean</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Pasien & RM</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Poli Tujuan</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Waktu Panggil</th>
                                <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi Operasional</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {queues.map(q => (
                                <tr key={q.queue_id} className={`transition-colors ${q.status_antrean === 'Dipanggil' ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3.5 py-1 inline-flex text-xs font-black rounded-full border ${
                                            q.status_antrean === 'Dipanggil' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-800 border-slate-200'
                                        }`}>
                                            {q.nomor_antrean}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-slate-800">{q.nama_pasien}</div>
                                        <div className="text-[11px] text-slate-400 font-mono">RM: {q.no_rekam_medis}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-600">{q.nama_poli}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 inline-flex text-[11px] font-bold rounded-lg uppercase tracking-wide border ${
                                            q.status_antrean === 'Menunggu' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            q.status_antrean === 'Dipanggil' ? 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse' :
                                            q.status_antrean === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            'bg-rose-50 text-rose-700 border-rose-200'
                                        }`}>
                                            {q.status_antrean}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-medium">{formatTime(q.waktu_panggilan)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-center flex items-center justify-center gap-2">
                                        {/* Doctor Direct Examination Button */}
                                        {canExamine && q.status_antrean !== 'Selesai' && (
                                            <button
                                                onClick={() => navigate(`/doctor/examination/${q.registration_id}`)}
                                                className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 font-bold transition-all flex items-center gap-1"
                                                title="Lakukan Pemeriksaan SOAP Medis"
                                            >
                                                <span>🩺</span> Periksa (SOAP)
                                            </button>
                                        )}

                                        {q.status_antrean !== "Selesai" ? (
                                            <>
                                                <button 
                                                    onClick={() => handleCallAgain(q.queue_id, q.nomor_antrean, q.nama_poli)}
                                                    className="text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-xl font-bold transition-all border border-slate-200"
                                                >
                                                    Panggil Ulang
                                                </button>
                                                <select 
                                                    value={q.status_antrean}
                                                    onChange={(e) => handleSetStatus(q.queue_id, e.target.value)}
                                                    className="border border-slate-200 rounded-xl text-xs font-semibold px-2.5 py-1.5 bg-slate-50 text-slate-700 focus:outline-none"
                                                >
                                                    <option value="Menunggu">Menunggu</option>
                                                    <option value="Dipanggil">Dipanggil</option>
                                                    <option value="Selesai">Selesai</option>
                                                    <option value="Dilewati">Dilewati</option>
                                                </select>
                                            </>
                                        ) : (
                                            <span className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
                                                ✓ Selesai
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {queues.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium">
                                        <div className="text-4xl mb-2">📭</div>
                                        Belum ada antrean terdaftar untuk poli ini.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL_TAMBAH_PENDAFTARAN */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fade-in">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Tambah Pendaftaran Pasien</h3>
                                <p className="text-xs text-slate-500">Pilih pasien dan tentukan poli tujuan & dokter</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        {modalError && (
                            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                                ⚠️ {modalError}
                            </div>
                        )}

                        <form onSubmit={handleCreateRegistration} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Pilih Pasien Terdaftar *
                                </label>
                                <select
                                    required
                                    value={formData.patient_id}
                                    onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                                >
                                    <option value="">-- Pilih Pasien --</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.nama_pasien} (RM: {p.no_rekam_medis} - NIK: {p.nik})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Poli Tujuan *
                                    </label>
                                    <select
                                        required
                                        value={formData.poli_id}
                                        onChange={(e) => setFormData({ ...formData, poli_id: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                                    >
                                        <option value="">-- Pilih Poli --</option>
                                        {polis.map(po => (
                                            <option key={po.id} value={po.id}>{po.nama_poli}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Dokter Penanggung Jawab *
                                    </label>
                                    <select
                                        required
                                        value={formData.doctor_id}
                                        onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                                    >
                                        <option value="">-- Pilih Dokter --</option>
                                        {doctors.map(d => (
                                            <option key={d.id} value={d.id}>{d.nama_lengkap}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Jenis Pembayaran *
                                    </label>
                                    <select
                                        value={formData.jenis_pembayaran}
                                        onChange={(e) => setFormData({ ...formData, jenis_pembayaran: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                                    >
                                        <option value="BPJS">BPJS Kesehatan</option>
                                        <option value="Umum">Umum / Mandiri</option>
                                        <option value="Asuransi Swasta">Asuransi Swasta</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Tanggal Kunjungan *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.tanggal_kunjungan}
                                        onChange={(e) => setFormData({ ...formData, tanggal_kunjungan: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Keluhan Awal Pasien *
                                </label>
                                <textarea
                                    required
                                    rows="3"
                                    value={formData.keluhan_awal}
                                    onChange={(e) => setFormData({ ...formData, keluhan_awal: e.target.value })}
                                    placeholder="Contoh: Demam sejak 2 hari, pusing dan mual..."
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                                ></textarea>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={modalLoading}
                                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
                                >
                                    {modalLoading ? 'Menyimpan...' : 'Simpan & Ambil Antrean'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QueueManagement;
