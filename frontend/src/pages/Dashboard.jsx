import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function Dashboard() {
  const [data, setData] = useState({
    summary: {
      total_pasien: 0,
      total_pasien_hari_ini: 0,
      total_antrean_hari_ini: 0,
      total_pasien_menunggu: 0,
      total_pasien_selesai: 0,
    },
    recent_queues: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/dashboard/summary');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    { label: 'Total Pasien Terdaftar', value: data.summary.total_pasien, icon: '🏥', color: 'from-blue-500 to-blue-600', text: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pasien Hari Ini', value: data.summary.total_pasien_hari_ini, icon: '📅', color: 'from-indigo-500 to-indigo-600', text: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Antrean Hari Ini', value: data.summary.total_antrean_hari_ini, icon: '🎟️', color: 'from-purple-500 to-purple-600', text: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Sedang Menunggu', value: data.summary.total_pasien_menunggu, icon: '⏳', color: 'from-amber-400 to-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Selesai Dilayani', value: data.summary.total_pasien_selesai, icon: '✅', color: 'from-emerald-400 to-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium animate-pulse">Memuat data dashboard...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
          
        {/* Header Section */}
        <header className="relative bg-white p-8 rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-70"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Dashboard Klinik</h1>
                    <p className="text-gray-500 font-medium">Ringkasan aktivitas dan operasional klinik hari ini.</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-bold border border-blue-100 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>
        </header>

        {/* Grid Indicators: Responsive Utility */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {cards.map((card, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${card.color}`}></div>
                <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-xl ${card.bg} ${card.text} flex items-center justify-center text-xl font-bold group-hover:scale-110 transition-transform`}>
                        {card.icon}
                    </div>
                </div>
                <div>
                    <h3 className="text-3xl font-black text-gray-900 mb-1">{card.value}</h3>
                    <p className="text-sm font-bold text-gray-500">{card.label}</p>
                </div>
            </div>
          ))}
        </div>

        {/* Recent Queues Table */}
        <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">👀</span>
                    Antrean Terkini
                </h2>
                <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors">
                    Lihat Semua
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">No. Antrean</th>
                            <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Nama Pasien</th>
                            <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Poli</th>
                            <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Dokter</th>
                            <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.recent_queues.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-8 py-12 text-center text-gray-400 font-medium text-sm">
                                    Belum ada antrean terdaftar hari ini.
                                </td>
                            </tr>
                        ) : (
                            data.recent_queues.map((q, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-8 py-4">
                                        <span className="font-bold text-gray-900 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                                            {q.nomor_antrean}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 font-bold text-gray-800">{q.nama_pasien}</td>
                                    <td className="px-8 py-4 text-gray-600 font-medium">{q.nama_poli}</td>
                                    <td className="px-8 py-4 text-gray-600 font-medium">{q.nama_dokter}</td>
                                    <td className="px-8 py-4">
                                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide border ${
                                            q.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                            q.status === 'Dipanggil' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                            q.status === 'Dilewati' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-gray-100 text-gray-700 border-gray-200'
                                        }`}>
                                            {q.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>

      </div>
    </div>
  );
}
