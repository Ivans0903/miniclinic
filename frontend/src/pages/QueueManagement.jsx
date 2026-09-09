import React, { useState, useEffect } from 'react';
import api from '../services/api';

const QueueManagement = () => {
    // 1. STATE
    const [queues, setQueues] = useState([]);
    const [currentlyCalling, setCurrentlyCalling] = useState(null);
    const [filterPoli, setFilterPoli] = useState('ALL');

    // 2. LIFECYCLE ON_MOUNT & ON_INTERVAL
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

    useEffect(() => {
        fetchQueues();
        
        // Polling setiap 5 detik agar data antrean realtime
        const intervalId = setInterval(() => {
            fetchQueues();
        }, 5000);

        return () => clearInterval(intervalId);
        // eslint-disable-next-line
    }, [filterPoli]);

    // TTS Web API Announcer
    const playAudioAnnouncement = (nomorAntrean, namaPoli) => {
        if ('speechSynthesis' in window) {
            // Eja per huruf/angka agar lebih natural (misal: "A 0 0 1")
            const spelledNumber = nomorAntrean.split('').join(' ');
            const text = `Nomor antrean, ${spelledNumber}, silakan menuju ke ${namaPoli}`;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'id-ID';
            utterance.rate = 0.85; // Diperlambat sedikit
            window.speechSynthesis.speak(utterance);
        }
    };

    // 3. HANDLE_CALL_NEXT
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

    // 4. HANDLE_SET_STATUS
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

    const formatTime = (timeString) => {
        if (!timeString) return "-";
        return new Date(timeString).toLocaleTimeString('id-ID', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    // 5. RENDER
    return (
        <div className="p-6 max-w-7xl mx-auto font-sans">
            <h1 className="text-3xl font-bold mb-8 text-gray-800 tracking-tight">Manajemen Panggilan Antrean</h1>

            {/* CARD_ACTIVE_CALL: Panggilan Aktif */}
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-t-4 border-blue-600 p-8 mb-8 flex flex-col md:flex-row items-center justify-between transition-all">
                <div className="flex-1 w-full text-center md:text-left">
                    <h2 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-widest">Sedang Dipanggil</h2>
                    {currentlyCalling ? (
                        <div className="animate-fade-in">
                            <div className="text-7xl font-black text-blue-700 tracking-tighter mb-3 drop-shadow-sm">
                                {currentlyCalling.nomor_antrean}
                            </div>
                            <div className="text-2xl text-gray-800 font-medium">
                                {currentlyCalling.nama_pasien} <span className="text-gray-300 font-light mx-3">|</span> <span className="text-blue-600">{currentlyCalling.nama_poli}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-xl text-gray-400 italic py-6">Belum ada antrean yang dipanggil.</div>
                    )}
                </div>
                
                <div className="flex flex-col gap-4 mt-8 md:mt-0 w-full md:w-auto min-w-[300px]">
                    {currentlyCalling && (
                        <div className="flex gap-3">
                            <button 
                                onClick={() => handleSetStatus(currentlyCalling.queue_id, "Selesai")}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                            >
                                Masuk Ruang Periksa
                            </button>
                            <button 
                                onClick={() => handleSetStatus(currentlyCalling.queue_id, "Dilewati")}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                            >
                                Lewati (Absen)
                            </button>
                        </div>
                    )}
                    <button 
                        onClick={handleCallNext}
                        disabled={currentlyCalling !== null}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:transform-none text-white px-6 py-4 rounded-xl font-bold text-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-3 w-full"
                    >
                        <span className="text-2xl">📢</span> Panggil Antrean Berikutnya
                    </button>
                </div>
            </div>

            {/* TABLE_QUEUES: Daftar Antrean Realtime */}
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Daftar Antrean Hari Ini</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">No. Antrean</th>
                                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Nama Pasien</th>
                                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Poli Tujuan</th>
                                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-8 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Waktu Panggil</th>
                                <th className="px-8 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Aksi Manual</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {queues.map(q => (
                                <tr key={q.queue_id} className={`transition-colors duration-200 ${q.status_antrean === 'Dipanggil' ? 'bg-blue-50/50' : 'hover:bg-gray-50/80'}`}>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <span className={`px-4 py-1.5 inline-flex text-sm font-extrabold rounded-full ${q.status_antrean === 'Dipanggil' ? 'bg-blue-200 text-blue-900 ring-4 ring-blue-50' : 'bg-gray-100 text-gray-700'}`}>
                                            {q.nomor_antrean}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="text-sm font-bold text-gray-900">{q.nama_pasien}</div>
                                        <div className="text-xs text-gray-400 font-mono mt-0.5">{q.no_rekam_medis}</div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-gray-600">{q.nama_poli}</td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-md uppercase tracking-wide
                                            ${q.status_antrean === 'Menunggu' ? 'bg-amber-100 text-amber-800' : ''}
                                            ${q.status_antrean === 'Dipanggil' ? 'bg-blue-600 text-white animate-pulse' : ''}
                                            ${q.status_antrean === 'Selesai' ? 'bg-emerald-100 text-emerald-800' : ''}
                                            ${q.status_antrean === 'Dilewati' ? 'bg-rose-100 text-rose-800' : ''}
                                        `}>
                                            {q.status_antrean}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-gray-500">{formatTime(q.waktu_panggilan)}</td>
                                    <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-center flex items-center justify-center gap-3">
                                        {q.status_antrean !== "Selesai" ? (
                                            <>
                                                <button 
                                                    onClick={() => handleCallAgain(q.queue_id, q.nomor_antrean, q.nama_poli)}
                                                    className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-1.5 rounded-lg font-semibold transition-colors"
                                                >
                                                    Panggil Ulang
                                                </button>
                                                <select 
                                                    value={q.status_antrean}
                                                    onChange={(e) => handleSetStatus(q.queue_id, e.target.value)}
                                                    className="border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5 bg-gray-50 text-gray-700 outline-none cursor-pointer hover:bg-gray-100 transition-colors"
                                                >
                                                    <option value="Menunggu">Menunggu</option>
                                                    <option value="Dipanggil">Dipanggil</option>
                                                    <option value="Selesai">Selesai</option>
                                                    <option value="Dilewati">Dilewati</option>
                                                </select>
                                            </>
                                        ) : (
                                            <span className="text-emerald-600 font-bold bg-emerald-50 px-4 py-1.5 rounded-lg flex items-center gap-1.5">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                Selesai
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {queues.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-8 py-16 text-center text-gray-400 font-medium">
                                        <div className="text-4xl mb-3">📭</div>
                                        Tidak ada data antrean hari ini.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default QueueManagement;
