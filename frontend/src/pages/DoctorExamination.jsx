import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

// Fallback data jika dibuka langsung tanpa via state routing
const fallbackPatientData = {
    id: 1,
    nama_pasien: "Data Pasien (Fallback)",
    no_rekam_medis: "RM-00000",
    keluhan_awal: "Pusing dan mual"
};

const DoctorExamination = () => {
    const { registrationId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Asumsi dari halaman antrean, klik "Periksa" akan mem-pass data pasien via state
    const patientData = location.state?.patientData || fallbackPatientData;

    // 1. STATE: SOAP Form
    const [soap, setSoap] = useState({
        subjective: patientData.keluhan_awal || "",
        tekanan_darah: "",
        suhu_tubuh: "",
        berat_badan: "",
        tinggi_badan: "",
        assessment: "",
        plan: ""
    });

    // 2. STATE: Action & Prescription Dynamic Lists
    const [actionOptions, setActionOptions] = useState([]);
    const [medicineOptions, setMedicineOptions] = useState([]);
    const [selectedActions, setSelectedActions] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    
    // 3. STATE: Modal & Loading
    const [patientHistory, setPatientHistory] = useState([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 4. LIFECYCLE ON_MOUNT
    useEffect(() => {
        fetchMasterOptions();
        fetchPatientHistory(patientData.id);
        // eslint-disable-next-line
    }, [patientData.id]);

    const fetchMasterOptions = async () => {
        try {
            // Coba ambil dari API, jika belum ada endpoint master, fallback ke Dummy
            const resActions = await api.get('/medical-actions').catch(() => ({ data: null }));
            const resMedicines = await api.get('/medicines').catch(() => ({ data: null }));
            
            const dummyActions = resActions.data?.data || [
                { id: 1, nama_tindakan: "Pemeriksaan Fisik Lanjutan", tarif: 50000 },
                { id: 2, nama_tindakan: "Pembersihan Luka", tarif: 75000 },
                { id: 3, nama_tindakan: "Injeksi Vitamin", tarif: 60000 },
            ];
            
            const dummyMedicines = resMedicines.data?.data || [
                { id: 1, nama_obat: "Paracetamol 500mg", satuan: "Tablet", stok: 100 },
                { id: 2, nama_obat: "Amoxicillin 500mg", satuan: "Kapsul", stok: 50 },
                { id: 3, nama_obat: "Cetirizine 10mg", satuan: "Tablet", stok: 200 },
                { id: 4, nama_obat: "Ibuprofen 400mg", satuan: "Tablet", stok: 80 },
            ];

            setActionOptions(dummyActions);
            setMedicineOptions(dummyMedicines);
        } catch (error) {
            console.error("Gagal mengambil data master", error);
        }
    };

    const fetchPatientHistory = async (patientId) => {
        try {
            const res = await api.get(`/medical-records/patient/${patientId}`);
            if (res.data.success) {
                setPatientHistory(res.data.data.history);
            }
        } catch (error) {
            console.error("Riwayat pasien kosong atau gagal dimuat", error);
        }
    };

    // 5. EVENT HANDLERS
    const handleSoapChange = (e) => {
        setSoap({ ...soap, [e.target.name]: e.target.value });
    };

    const addActionRow = () => {
        setSelectedActions([...selectedActions, { medical_action_id: "", catatan: "" }]);
    };

    const removeActionRow = (index) => {
        const newActions = [...selectedActions];
        newActions.splice(index, 1);
        setSelectedActions(newActions);
    };

    const handleActionChange = (index, field, value) => {
        const newActions = [...selectedActions];
        newActions[index][field] = value;
        setSelectedActions(newActions);
    };

    const addPrescriptionRow = () => {
        setPrescriptions([...prescriptions, { medicine_id: "", jumlah: 1, aturan_pakai: "3x1 sesudah makan" }]);
    };

    const removePrescriptionRow = (index) => {
        const newPrescriptions = [...prescriptions];
        newPrescriptions.splice(index, 1);
        setPrescriptions(newPrescriptions);
    };

    const handlePrescriptionChange = (index, field, value) => {
        const newPrescriptions = [...prescriptions];
        newPrescriptions[index][field] = value;
        setPrescriptions(newPrescriptions);
    };

    // 6. SUBMIT
    const handleSubmitExamination = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                registration_id: registrationId,
                ...soap,
                // Buang input yang tidak terisi / masih kosong dropdownnya
                actions: selectedActions.filter(a => a.medical_action_id !== ""),
                prescriptions: prescriptions.filter(p => p.medicine_id !== "")
            };

            const res = await api.post('/medical-records', payload);
            if (res.data.success) {
                alert("Pemeriksaan pasien berhasil disimpan dan selesai.");
                // Navigasi kembali ke Dashboard Dokter atau Antrean
                navigate('/queue'); 
            }
        } catch (error) {
            alert(error.response?.data?.message || "Terjadi kesalahan saat menyimpan pemeriksaan");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleString('id-ID', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // 7. RENDER
    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* TOP_BAR */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 relative overflow-hidden">
                    <div className="flex items-center gap-5 relative z-10">
                        <button
                            onClick={() => navigate('/queue')}
                            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all text-xs flex items-center gap-1.5"
                            title="Kembali ke Daftar Antrean"
                        >
                            <span>⬅</span> Kembali
                        </button>
                        <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-md shadow-blue-500/20">
                            {patientData.nama_pasien.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 tracking-tight">{patientData.nama_pasien}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-blue-200">RM: {patientData.no_rekam_medis}</span>
                                <span className="text-xs text-slate-400 font-mono">Registrasi ID: #{registrationId}</span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowHistoryModal(true)}
                        className="mt-4 md:mt-0 px-4 py-2.5 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-sm text-xs"
                    >
                        <span>📜</span> Riwayat Pasien ({patientHistory.length})
                    </button>
                </div>

                {/* GRID_2_COLUMNS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Kolom Kiri: Input SOAP */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 bg-white flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-500">📝</div>
                                <h2 className="text-lg font-bold text-gray-800">Pemeriksaan Medis (SOAP)</h2>
                            </div>
                            
                            <div className="p-6 space-y-7">
                                {/* SECTION_S */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
                                        <span className="w-6 h-6 rounded bg-gray-100 text-gray-600 flex items-center justify-center text-xs">S</span>
                                        Subjective (Keluhan)
                                    </label>
                                    <textarea 
                                        name="subjective"
                                        value={soap.subjective}
                                        onChange={handleSoapChange}
                                        rows="3"
                                        className="w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-gray-50 hover:bg-white transition-all text-sm p-3"
                                        placeholder="Keluhan utama dan riwayat penyakit..."
                                    />
                                </div>

                                {/* SECTION_O */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-5 rounded-2xl border border-blue-100/50">
                                    <label className="flex items-center gap-2 text-sm font-bold text-blue-900 mb-4">
                                        <span className="w-6 h-6 rounded bg-blue-200 text-blue-800 flex items-center justify-center text-xs">O</span>
                                        Objective (Tanda Vital)
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-bold text-blue-800/70 uppercase tracking-wider mb-1.5">TD (mmHg)</label>
                                            <input type="text" name="tekanan_darah" value={soap.tekanan_darah} onChange={handleSoapChange} placeholder="120/80" className="w-full rounded-lg border-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-blue-800/70 uppercase tracking-wider mb-1.5">Suhu (°C)</label>
                                            <input type="number" step="0.1" name="suhu_tubuh" value={soap.suhu_tubuh} onChange={handleSoapChange} placeholder="36.5" className="w-full rounded-lg border-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-blue-800/70 uppercase tracking-wider mb-1.5">BB (kg)</label>
                                            <input type="number" step="0.1" name="berat_badan" value={soap.berat_badan} onChange={handleSoapChange} placeholder="65" className="w-full rounded-lg border-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm font-medium" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-blue-800/70 uppercase tracking-wider mb-1.5">TB (cm)</label>
                                            <input type="number" step="0.1" name="tinggi_badan" value={soap.tinggi_badan} onChange={handleSoapChange} placeholder="170" className="w-full rounded-lg border-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm font-medium" />
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION_A */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
                                        <span className="w-6 h-6 rounded bg-gray-100 text-gray-600 flex items-center justify-center text-xs">A</span>
                                        Assessment (Diagnosa)
                                    </label>
                                    <textarea 
                                        name="assessment"
                                        value={soap.assessment}
                                        onChange={handleSoapChange}
                                        rows="2"
                                        className="w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-gray-50 hover:bg-white transition-all text-sm p-3"
                                        placeholder="Diagnosa ICD-10 / Temuan klinis utama"
                                    />
                                </div>

                                {/* SECTION_P */}
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
                                        <span className="w-6 h-6 rounded bg-gray-100 text-gray-600 flex items-center justify-center text-xs">P</span>
                                        Plan (Rencana Terapi)
                                    </label>
                                    <textarea 
                                        name="plan"
                                        value={soap.plan}
                                        onChange={handleSoapChange}
                                        rows="3"
                                        className="w-full rounded-xl border-gray-200 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-gray-50 hover:bg-white transition-all text-sm p-3"
                                        placeholder="Rencana tindakan, edukasi, tindak lanjut"
                                    />
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Kolom Kanan: Tindakan & Resep Obat */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden h-full flex flex-col">
                            <div className="px-6 py-5 border-b border-gray-100 bg-white flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-500">💉</div>
                                <h2 className="text-lg font-bold text-gray-800">Tindakan & Resep</h2>
                            </div>
                            
                            <div className="p-6 flex-1 space-y-8 bg-gray-50/30">
                                
                                {/* SUBSECTION_ACTIONS */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Tindakan Medis</h3>
                                        <button onClick={addActionRow} className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100">
                                            + Tambah
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {selectedActions.map((act, idx) => (
                                            <div key={idx} className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
                                                <div className="flex-1 space-y-2.5">
                                                    <select 
                                                        value={act.medical_action_id} 
                                                        onChange={(e) => handleActionChange(idx, 'medical_action_id', e.target.value)}
                                                        className="w-full rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500 font-medium"
                                                    >
                                                        <option value="">-- Pilih Tindakan --</option>
                                                        {actionOptions.map(opt => (
                                                            <option key={opt.id} value={opt.id}>{opt.nama_tindakan}</option>
                                                        ))}
                                                    </select>
                                                    <input 
                                                        type="text" 
                                                        value={act.catatan} 
                                                        onChange={(e) => handleActionChange(idx, 'catatan', e.target.value)}
                                                        placeholder="Catatan tambahan (opsional)..." 
                                                        className="w-full rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                                    />
                                                </div>
                                                <button onClick={() => removeActionRow(idx)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                </button>
                                            </div>
                                        ))}
                                        {selectedActions.length === 0 && (
                                            <div className="text-center p-5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-medium bg-white">
                                                Tidak ada tindakan medis.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

                                {/* SUBSECTION_PRESCRIPTION */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Resep Obat</h3>
                                        <button onClick={addPrescriptionRow} className="text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-100">
                                            + Tambah
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {prescriptions.map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
                                                <div className="flex-1 space-y-2.5">
                                                    <select 
                                                        value={item.medicine_id} 
                                                        onChange={(e) => handlePrescriptionChange(idx, 'medicine_id', e.target.value)}
                                                        className="w-full rounded-lg border-gray-300 text-sm focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                                                    >
                                                        <option value="">-- Pilih Obat --</option>
                                                        {medicineOptions.map(opt => (
                                                            <option key={opt.id} value={opt.id}>{opt.nama_obat} (Stok: {opt.stok})</option>
                                                        ))}
                                                    </select>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="number" 
                                                            min="1"
                                                            value={item.jumlah} 
                                                            onChange={(e) => handlePrescriptionChange(idx, 'jumlah', e.target.value)}
                                                            className="w-20 rounded-lg border-gray-300 text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 text-center"
                                                        />
                                                        <input 
                                                            type="text" 
                                                            value={item.aturan_pakai} 
                                                            onChange={(e) => handlePrescriptionChange(idx, 'aturan_pakai', e.target.value)}
                                                            placeholder="Aturan (misal: 3x1)" 
                                                            className="flex-1 rounded-lg border-gray-300 text-sm focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50"
                                                        />
                                                    </div>
                                                </div>
                                                <button onClick={() => removePrescriptionRow(idx)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors mt-2">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                </button>
                                            </div>
                                        ))}
                                        {prescriptions.length === 0 && (
                                            <div className="text-center p-5 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm font-medium bg-white">
                                                Tidak ada resep obat.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER_ACTIONS */}
                <div className="flex justify-end pt-4 pb-12">
                    <button 
                        onClick={handleSubmitExamination}
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-600/40 transition-all transform hover:-translate-y-1 flex items-center gap-3 w-full md:w-auto"
                    >
                        {isSubmitting ? (
                            <span>Menyimpan Data...</span>
                        ) : (
                            <>
                                <span>Simpan & Selesaikan Pemeriksaan</span>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </>
                        )}
                    </button>
                </div>

                {/* MODAL_HISTORY */}
                {showHistoryModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={() => setShowHistoryModal(false)}></div>
                            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                            
                            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full border border-gray-100">
                                <div className="bg-white px-6 pt-6 pb-4">
                                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                        <h3 className="text-xl font-black text-gray-900" id="modal-title">
                                            Riwayat Rekam Medis: <span className="text-blue-600">{patientData.nama_pasien}</span>
                                        </h3>
                                        <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2">
                                        {patientHistory.length === 0 ? (
                                            <div className="text-center py-12">
                                                <div className="text-4xl mb-3">📁</div>
                                                <p className="text-gray-500 font-medium">Belum ada riwayat pemeriksaan.</p>
                                            </div>
                                        ) : (
                                            patientHistory.map((rec) => (
                                                <div key={rec.id} className="relative pl-8 border-l-2 border-indigo-200 pb-4 last:border-l-0 last:pb-0">
                                                    <div className="absolute w-4 h-4 bg-indigo-500 rounded-full -left-[9px] top-1 ring-4 ring-white shadow-sm"></div>
                                                    
                                                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                                        <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                                                            <div>
                                                                <h4 className="text-sm font-bold text-gray-900">{formatDateTime(rec.created_at)}</h4>
                                                                <p className="text-xs font-semibold text-indigo-600 mt-1">{rec.nama_dokter} <span className="text-gray-400 font-normal">di</span> {rec.nama_poli}</p>
                                                            </div>
                                                            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded">Reg: #{rec.no_registrasi}</span>
                                                        </div>
                                                        
                                                        <div className="space-y-3 text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                            <p><strong className="text-blue-900">S:</strong> {rec.subjective}</p>
                                                            <p><strong className="text-blue-900">O:</strong> TD: {rec.tekanan_darah} | Suhu: {rec.suhu_tubuh}°C | BB: {rec.berat_badan}kg | TB: {rec.tinggi_badan}cm</p>
                                                            <p><strong className="text-blue-900">A:</strong> {rec.assessment}</p>
                                                            <p><strong className="text-blue-900">P:</strong> {rec.plan}</p>
                                                        </div>
                                                        
                                                        {(rec.actions?.length > 0 || rec.prescription?.items?.length > 0) && (
                                                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {rec.actions?.length > 0 && (
                                                                    <div className="pt-3 border-t border-gray-100">
                                                                        <strong className="text-[11px] text-emerald-600 font-bold uppercase tracking-wider block mb-2">Tindakan Medis:</strong>
                                                                        <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                                                                            {rec.actions.map(a => (
                                                                                <li key={a.id}>{a.nama_tindakan} {a.catatan && <span className="text-gray-400 italic">({a.catatan})</span>}</li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                                
                                                                {rec.prescription?.items?.length > 0 && (
                                                                    <div className="pt-3 border-t border-gray-100">
                                                                        <strong className="text-[11px] text-blue-600 font-bold uppercase tracking-wider block mb-2">Resep Obat:</strong>
                                                                        <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                                                                            {rec.prescription.items.map(p => (
                                                                                <li key={p.id}>{p.nama_obat} <span className="font-semibold text-gray-800">({p.jumlah} {p.satuan})</span> - <span className="text-gray-500 italic">{p.aturan_pakai}</span></li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse border-t border-gray-100">
                                    <button type="button" onClick={() => setShowHistoryModal(false)} className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-5 py-2.5 bg-gray-900 text-base font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 sm:w-auto sm:text-sm transition-colors">
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default DoctorExamination;
