import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { handleLogin } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin1234');
  const [selectedRole, setSelectedRole] = useState('Administrator');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Preset credentials for easy testing
  const rolesInfo = [
    {
      name: 'Administrator',
      icon: '🛡️',
      username: 'admin',
      pass: 'admin1234',
      badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
      description: 'Akses penuh seluruh modul (Dashboard, Pendaftaran, Antrean, Diagnosa Dokter & Master Data)'
    },
    {
      name: 'Dokter',
      icon: '👨‍⚕️',
      username: 'dr_budi',
      pass: 'dokter1234',
      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      description: 'Akses pemeriksaan pasien, input Rekam Medis (SOAP), tindakan medis, dan resep obat'
    },
    {
      name: 'Petugas Pendaftaran',
      icon: '📋',
      username: 'petugas1',
      pass: 'petugas1234',
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
      description: 'Akses pendaftaran pasien baru/lama, pembuatan nomor antrean poli, dan data pasien'
    }
  ];

  const handleSelectRole = (roleItem) => {
    setSelectedRole(roleItem.name);
    setUsername(roleItem.username);
    setPassword(roleItem.pass);
    setError('');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username dan Password wajib diisi');
      return;
    }
    setError('');
    setLoading(true);

    const res = await handleLogin(username, password);
    setLoading(false);

    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message || 'Login gagal. Periksa kembali username dan password.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative">
      {/* Soft Light Background Highlights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-100/60 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20 mb-4 text-3xl">
          🏥
        </div>
        <h2 className="text-3xl font-black tracking-tight text-slate-800">
          MiniClinic<span className="text-blue-600">.</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500 font-medium">
          Sistem Informasi Pelayanan Kesehatan & Antrean Terpadu
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg z-10 px-4">
        <div className="bg-white border border-slate-200/80 py-8 px-6 shadow-xl rounded-3xl sm:px-10">
          
          {/* Section Selector Peran / Role */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              1. Pilih Peran Login (Role)
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {rolesInfo.map((r) => {
                const isSelected = username === r.username;
                return (
                  <button
                    key={r.name}
                    type="button"
                    onClick={() => handleSelectRole(r)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-600 ring-2 ring-blue-500/20 text-slate-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="text-2xl mb-1">{r.icon}</div>
                    <div>
                      <div className="text-xs font-bold leading-tight text-slate-800">{r.name}</div>
                      <div className="text-[10px] text-slate-500 mt-1 font-mono">{r.pass}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info Badge Peran Aktif */}
          {rolesInfo.find(r => r.username === username) && (
            <div className="mb-6 p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
              <span className="text-xl">ℹ️</span>
              <div className="text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-blue-900">
                  Hak Akses {rolesInfo.find(r => r.username === username)?.name}:
                </span>{' '}
                {rolesInfo.find(r => r.username === username)?.description}
              </div>
            </div>
          )}

          {/* Form Login */}
          <form className="space-y-4" onSubmit={onSubmit}>
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-sm"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses Login...
                  </span>
                ) : (
                  'Masuk ke Sistem Klinik ➔'
                )}
              </button>
            </div>
          </form>

          {/* Quick Credential Hint Footer */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Password Default: <br />
              <span className="font-semibold text-slate-700">Admin: admin1234</span> |{' '}
              <span className="font-semibold text-slate-700">Dokter: dokter1234</span> |{' '}
              <span className="font-semibold text-slate-700">Petugas: petugas1234</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
