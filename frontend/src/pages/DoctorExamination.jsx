import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

const DoctorExamination = () => {
    const { registrationId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [loadingData, setLoadingData] = useState(true);
    const [patientData, setPatientData] = useState(location.state?.patientData || null);

    // 1. STATE: SOAP Form
    const [soap, setSoap] = useState({
        subjective: "",
        tekanan_darah: "120/80",
        suhu_tubuh: "36.5",
        berat_badan: "60",
        tinggi_badan: "165",
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

    // Fetch registration details directly from backend
    const fetchRegistrationDetails = async () => {
        setLoadingData(true);
        try {
            const res = await api.get(`/registrations/${registrationId}`);
            if (res.data.success) {
                const reg = res.data.data;
                const pData = {
                    id: reg.patient_id,
                    nama_pasien: reg.nama_pasien,
                    no_rekam_medis: reg.no_rekam_medis,
                    nik: reg.nik,
                    keluhan_awal: reg.keluhan_awal,
                    nama_poli: reg.nama_poli,
                    nomor_antrean: reg.nomor_antrean,
                    nama_dokter: reg.nama_dokter
                };
                setPatientData(pData);
                setSoap(prev => ({
                    ...prev,
                    subjective: prev.subjective || reg.keluhan_awal || ""
                }));
                fetchPatientHistory(reg.patient_id);
            }
        } catch (error) {
            console.error("Gagal mengambil detail pendaftaran:", error);
        } finally {
            setLoadingData(false);
        }
    };

    const fetchMasterOptions = async () => {
        try {
            const resActions = await api.get('/medical-actions').catch(() => ({ data: null }));
            const resMedicines = await api.get('/medicines').catch(() => ({ data: null }));
            
            const dummyActions = resActions.data?.data || [
                { id: 1, nama_tindakan: "Pemeriksaan Fisik Lanjutan", tarif: 50000 },
                { id: 2, nama_tindakan: "Pembersihan & Rawat Luka", tarif: 75000 },
                { id: 3, nama_tindakan: "Injeksi Vitamin / Obat", tarif: 60000 },
                { id: 4, nama_tindakan: "Konsultasi Kesehatan", tarif: 50000 },
            ];
            
            const dummyMedicines = resMedicines.data?.data || [
                { id: 1, nama_obat: "Paracetamol 500mg", satuan: "Tablet", stok: 100 },
                { id: 2, nama_obat: "Amoxicillin 500mg", satuan: "Kapsul", stok: 50 },
                { id: 3, nama_obat: "Cetirizine 10mg", satuan: "Tablet", stok: 200 },
                { id: 4, nama_obat: "Ibuprofen 400mg", satuan: "Tablet", stok: 80 },
                { id: 5, nama_obat: "Antasida Doen", satuan: "Tablet", stok: 150 },
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
                setPatientHistory(res.data.data.history || []);
            }
        } catch (error) {
            console.error("Riwayat pasien kosong atau gagal dimuat", error);
        }
    };

    useEffect(() => {
        fetchRegistrationDetails();
        fetchMasterOptions();
        // eslint-disable-next-line
    }, [registrationId]);

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
        setPrescriptions([...prescriptions, { 
            medicine_id: "", 
            custom_nama_obat: "", 
            is_custom: false, 
            jumlah: 1, 
            aturan_pakai: "3x1 sesudah makan" 
        }]);
    };

    const removePrescriptionRow = (index) => {
        const newPrescriptions = [...prescriptions];
        newPrescriptions.splice(index, 1);
        setPrescriptions(newPrescriptions);
    };

    const handlePrescriptionChange = (index, field, value) => {
        const newPrescriptions = [...prescriptions];
        newPrescriptions[index][field] = value;
        
        if (field === 'medicine_id') {
            if (value === 'CUSTOM') {
                newPrescriptions[index].is_custom = true;
                newPrescriptions[index].medicine_id = '';
            } else {
                newPrescriptions[index].is_custom = false;
            }
        }

        setPrescriptions(newPrescriptions);
    };

    const toggleCustomPrescription = (index) => {
        const newPrescriptions = [...prescriptions];
        newPrescriptions[index].is_custom = !newPrescriptions[index].is_custom;
        if (newPrescriptions[index].is_custom) {
            newPrescriptions[index].medicine_id = '';
        } else {
            newPrescriptions[index].custom_nama_obat = '';
        }
        setPrescriptions(newPrescriptions);
    };

    // 6. SUBMIT
    const handleSubmitExamination = async () => {
        if (!soap.subjective || !soap.assessment || !soap.plan) {
            alert("Harap lengkapi isi Subjective (Keluhan), Assessment (Diagnosa), dan Plan (Rencana Penanganan).");
            return;
        }

        setIsSubmitting(true);
        try {
            const formattedPrescriptions = prescriptions.map(p => {
                if (p.is_custom || p.custom_nama_obat) {
                    return {
                        nama_obat: p.custom_nama_obat,
                        jumlah: parseInt(p.jumlah) || 1,
                        aturan_pakai: p.aturan_pakai
                    };
                } else {
                    return {
                        medicine_id: parseInt(p.medicine_id),
                        jumlah: parseInt(p.jumlah) || 1,
                        aturan_pakai: p.aturan_pakai
                    };
                }
            }).filter(p => (p.medicine_id || (p.nama_obat && p.nama_obat.trim() !== '')));

            const payload = {
                registration_id: parseInt(registrationId),
                ...soap,
                actions: selectedActions.filter(a => a.medical_action_id !== ""),
                prescriptions: formattedPrescriptions
            };

            const res = await api.post('/medical-records', payload);
            if (res.data.success) {
                alert("Pemeriksaan medis pasien berhasil disimpan dan status antrean diselesaikan!");
                navigate('/queue'); 
            }
        } catch (error) {
            console.error("Submit error:", error);
            const msg = error.response?.data?.errors?.general || error.response?.data?.message || "Terjadi kesalahan saat menyimpan pemeriksaan";
            alert(msg);
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

    if (loadingData && !patientData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Memuat Data Pasien & Registrasi #{registrationId}...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
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
                            {patientData?.nama_pasien ? patientData.nama_pasien.charAt(0).toUpperCase() : '🏥'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-black text-slate-800 tracking-tight">
                                    {patientData?.nama_pasien || 'Data Pasien'}
                                </h1>
                                {patientData?.nomor_antrean && (
                                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                        Antrean #{patientData.nomor_antrean}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-blue-200 font-mono">
                                    RM: {patientData?.no_rekam_medis || '-'}
                                </span>
                                <span className="text-xs text-slate-500 font-mono">
                                    NIK: {patientData?.nik || '-'}
                                </span>
                                {patientData?.nama_poli && (
                                    <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                        {patientData.nama_poli}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowHistoryModal(true)}
                        className="mt-4 md:mt-0 px-4 py-2.5 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-sm text-xs"
                    >
                        <span>📜</span> Riwayat Medis Pasien ({patientHistory.length})
                    </button>
                </div>

                {/* GRID_2_COLUMNS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Kolom Kiri: Input SOAP */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-xl text-blue-600 font-bold">📝</div>
                                <h2 className="text-base font-bold text-slate-800">Pemeriksaan Diagnosa Medis (SOAP)</h2>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                {/* SECTION_S */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        <span className="w-5 h-5 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">S</span>
                                        Subjective (Keluhan Pasien & Gejala Awal)
                                    </label>
                                    <textarea 
                                        name="subjective"
                                        value={soap.subjective}
                                        onChange={handleSoapChange}
                                        rows="3"
                                        className="w-full rounded-2xl border border-slate-200 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-slate-50 hover:bg-white transition-all text-sm p-3.5 font-medium text-slate-800"
                                        placeholder="Keluhan utama dan riwayat gejala penyakit saat pendaftaran..."
                                    />
                                </div>

                                {/* SECTION_O */}
                                <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-100">
                                    <label className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider mb-3">
                                        <span className="w-5 h-5 rounded-lg bg-blue-200 text-blue-800 flex items-center justify-center font-black text-xs">O</span>
                                        Objective (Tanda Vital Pasien)
                                    </label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-blue-800/70 uppercase tracking-wider mb-1">TD (mmHg)</label>
                                            <input type="text" name="tekanan_darah" value={soap.tekanan_darah} onChange={handleSoapChange} placeholder="120/80" className="w-full rounded-xl border-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-xs font-bold p-2.5 text-slate-800" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-blue-800/70 uppercase tracking-wider mb-1">Suhu (°C)</label>
                                            <input type="number" step="0.1" name="suhu_tubuh" value={soap.suhu_tubuh} onChange={handleSoapChange} placeholder="36.5" className="w-full rounded-xl border-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-xs font-bold p-2.5 text-slate-800" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-blue-800/70 uppercase tracking-wider mb-1">BB (kg)</label>
                                            <input type="number" step="0.1" name="berat_badan" value={soap.berat_badan} onChange={handleSoapChange} placeholder="60" className="w-full rounded-xl border-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-xs font-bold p-2.5 text-slate-800" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-blue-800/70 uppercase tracking-wider mb-1">TB (cm)</label>
                                            <input type="number" step="0.1" name="tinggi_badan" value={soap.tinggi_badan} onChange={handleSoapChange} placeholder="165" className="w-full rounded-xl border-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-xs font-bold p-2.5 text-slate-800" />
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION_A */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        <span className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">A</span>
                                        Assessment (Diagnosa & Analisa Penyakit)
                                    </label>
                                    <textarea 
                                        name="assessment"
                                        value={soap.assessment}
                                        onChange={handleSoapChange}
                                        rows="3"
                                        className="w-full rounded-2xl border border-slate-200 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 bg-slate-50 hover:bg-white transition-all text-sm p-3.5 font-medium text-slate-800"
                                        placeholder="Diagnosa medis dokter (Cth: ISPA Akut / Gastritis / Hipertensi Primer)..."
                                    />
                                </div>

                                {/* SECTION_P */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        <span className="w-5 h-5 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-black text-xs">P</span>
                                        Plan (Rencana Penanganan & Edukasi)
                                    </label>
                                    <textarea 
                                        name="plan"
                                        value={soap.plan}
                                        onChange={handleSoapChange}
                                        rows="3"
                                        className="w-full rounded-2xl border border-slate-200 shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 bg-slate-50 hover:bg-white transition-all text-sm p-3.5 font-medium text-slate-800"
                                        placeholder="Rencana penanganan medis, instruksi istirahat, dan saran kontrol ulang..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Kolom Kanan: Tindakan & Resep Obat */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col h-full">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700 font-bold">💊</div>
                                <h2 className="text-base font-bold text-slate-800">Tindakan Medis & Resep Obat</h2>
                            </div>

                            <div className="p-6 space-y-6 flex-1">
                                
                                {/* SUBSECTION_ACTIONS */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Tindakan Medis</h3>
                                        <button onClick={addActionRow} className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-all border border-blue-200">
                                            ➕ Tambah Tindakan
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {selectedActions.map((act, idx) => (
                                            <div key={idx} className="flex items-start gap-2 bg-slate-50/70 p-3 rounded-2xl border border-slate-200">
                                                <div className="flex-1 space-y-2">
                                                    <select 
                                                        value={act.medical_action_id} 
                                                        onChange={(e) => handleActionChange(idx, 'medical_action_id', e.target.value)}
                                                        className="w-full rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 p-2.5 bg-white"
                                                    >
                                                        <option value="">-- Pilih Jenis Tindakan --</option>
                                                        {actionOptions.map(opt => (
                                                            <option key={opt.id} value={opt.id}>{opt.nama_tindakan}</option>
                                                        ))}
                                                    </select>
                                                    <input 
                                                        type="text" 
                                                        value={act.catatan} 
                                                        onChange={(e) => handleActionChange(idx, 'catatan', e.target.value)}
                                                        placeholder="Catatan tindakan (opsional)..." 
                                                        className="w-full rounded-xl border border-slate-200 text-xs font-medium p-2.5 bg-white text-slate-800"
                                                    />
                                                </div>
                                                <button onClick={() => removeActionRow(idx)} className="text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-50 rounded-xl transition-all">
                                                    ✖
                                                </button>
                                            </div>
                                        ))}
                                        {selectedActions.length === 0 && (
                                            <div className="text-center p-4 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-semibold bg-slate-50/40">
                                                Belum ada tindakan medis ditambahkan.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="h-px bg-slate-100"></div>

                                {/* SUBSECTION_PRESCRIPTION */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Resep Obat Pasien</h3>
                                            <p className="text-[10px] text-slate-400">Pilih dari master atau ketik bebas obat baru</p>
                                        </div>
                                        <button onClick={addPrescriptionRow} className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-all border border-emerald-200">
                                            ➕ Tambah Obat
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {prescriptions.map((item, idx) => (
                                            <div key={idx} className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                        Obat #{idx + 1}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleCustomPrescription(idx)}
                                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
                                                    >
                                                        {item.is_custom ? '📋 Pilih dari Master' : '✍️ Ketik Manual (Custom)'}
                                                    </button>
                                                </div>

                                                {item.is_custom ? (
                                                    <div>
                                                        <input
                                                            type="text"
                                                            value={item.custom_nama_obat}
                                                            onChange={(e) => handlePrescriptionChange(idx, 'custom_nama_obat', e.target.value)}
                                                            placeholder="Ketik nama obat bebas (Cth: Cefadroxil 500mg / Salep Betadine)..."
                                                            className="w-full rounded-xl border border-blue-300 text-xs font-bold text-slate-800 p-2.5 bg-white focus:ring-2 focus:ring-blue-400"
                                                        />
                                                    </div>
                                                ) : (
                                                    <select 
                                                        value={item.medicine_id} 
                                                        onChange={(e) => handlePrescriptionChange(idx, 'medicine_id', e.target.value)}
                                                        className="w-full rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 p-2.5 bg-white"
                                                    >
                                                        <option value="">-- Pilih Obat Terdaftar --</option>
                                                        {medicineOptions.map(opt => (
                                                            <option key={opt.id} value={opt.id}>{opt.nama_obat} (Stok: {opt.stok})</option>
                                                        ))}
                                                        <option value="CUSTOM">➕ [Ketik Nama Obat Sendiri...]</option>
                                                    </select>
                                                )}

                                                <div className="flex items-center gap-2">
                                                    <div className="w-24">
                                                        <input 
                                                            type="number" 
                                                            min="1"
                                                            value={item.jumlah} 
                                                            onChange={(e) => handlePrescriptionChange(idx, 'jumlah', e.target.value)}
                                                            placeholder="Jml"
                                                            className="w-full rounded-xl border border-slate-200 text-xs font-bold text-center p-2 bg-white"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <input 
                                                            type="text" 
                                                            value={item.aturan_pakai} 
                                                            onChange={(e) => handlePrescriptionChange(idx, 'aturan_pakai', e.target.value)}
                                                            placeholder="Aturan pakai (Cth: 3x1 sesudah makan)" 
                                                            className="w-full rounded-xl border border-slate-200 text-xs font-medium p-2 bg-white"
                                                        />
                                                    </div>
                                                    <button onClick={() => removePrescriptionRow(idx)} className="text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-50 rounded-xl transition-all">
                                                        ✖
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {prescriptions.length === 0 && (
                                            <div className="text-center p-4 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-semibold bg-slate-50/40">
                                                Belum ada resep obat ditambahkan.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* SUBMIT BUTTON */}
                            <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                                <button 
                                    onClick={handleSubmitExamination}
                                    disabled={isSubmitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <span>Menyimpan Pemeriksaan...</span>
                                    ) : (
                                        <>
                                            <span>💾 Simpan & Selesaikan Pemeriksaan</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MODAL_HISTORY */}
                {showHistoryModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 overflow-hidden">
                            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">
                                        Riwayat Rekam Medis: <span className="text-blue-600">{patientData?.nama_pasien}</span>
                                    </h3>
                                    <p className="text-xs text-slate-500">No RM: {patientData?.no_rekam_medis}</p>
                                </div>
                                <button onClick={() => setShowHistoryModal(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-sm">
                                    ✕
                                </button>
                            </div>
                            
                            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                                {patientHistory.length === 0 ? (
                                    <div className="text-center py-10">
                                        <div className="text-3xl mb-2">📁</div>
                                        <p className="text-xs text-slate-500 font-medium">Belum ada riwayat pemeriksaan medis sebelumnya.</p>
                                    </div>
                                ) : (
                                    patientHistory.map((rec) => (
                                        <div key={rec.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                                            <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                                                <div>
                                                    <span className="text-xs font-bold text-slate-800">{formatDateTime(rec.created_at)}</span>
                                                    <span className="ml-2 text-xs font-semibold text-blue-600">({rec.nama_dokter} - {rec.nama_poli})</span>
                                                </div>
                                                <span className="text-[10px] font-mono font-bold bg-white px-2.5 py-0.5 rounded-full border border-slate-200 text-slate-600">
                                                    #{rec.no_registrasi}
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700">
                                                <div><strong className="text-blue-800">S (Keluhan):</strong> {rec.subjective}</div>
                                                <div><strong className="text-blue-800">O (Tanda Vital):</strong> TD: {rec.tekanan_darah}, Suhu: {rec.suhu_tubuh}°C</div>
                                                <div><strong className="text-emerald-800">A (Diagnosa):</strong> {rec.assessment}</div>
                                                <div><strong className="text-purple-800">P (Plan):</strong> {rec.plan}</div>
                                            </div>

                                            {rec.prescription && rec.prescription.items && rec.prescription.items.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-slate-200/60">
                                                    <div className="text-[11px] font-bold text-slate-700 mb-1">💊 Resep Obat:</div>
                                                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
                                                        {rec.prescription.items.map(item => (
                                                            <li key={item.id}>
                                                                <span className="font-semibold text-slate-800">{item.nama_obat}</span> ({item.jumlah} {item.satuan}) - <span className="italic">{item.aturan_pakai}</span>
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
        </div>
    );
};

export default DoctorExamination;
