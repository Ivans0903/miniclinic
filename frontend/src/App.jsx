import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import QueueManagement from './pages/QueueManagement';
import DoctorExamination from './pages/DoctorExamination';
import PatientManagement from './pages/PatientManagement';
import UserManagement from './pages/UserManagement';

// Komponen Pembatas Akses Login (Protected Route)
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center text-slate-800">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-semibold tracking-wider text-xs uppercase text-slate-500">Memuat Sesi...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md shadow-xl text-center border border-slate-200">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Terbatas</h2>
          <p className="text-slate-600 text-sm mb-6">
            Peran Anda (<span className="font-semibold text-blue-600">{user?.role}</span>) tidak memiliki izin untuk mengakses halaman ini.
          </p>
          <Link
            to="/dashboard"
            className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

// Main App Layout - White Clean Theme
const Layout = ({ children }) => {
  const { user, handleLogout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const userRole = user?.role || 'Administrator';

  // Item Menu Navigasi Berdasarkan Peran User
  const navigationItems = [
    {
      name: 'Dashboard Utama',
      path: '/dashboard',
      icon: '📊',
      roles: ['Administrator', 'Dokter', 'Petugas Pendaftaran']
    },
    {
      name: 'Pendaftaran & Antrean Poli',
      path: '/queue',
      icon: '🎟️',
      roles: ['Administrator', 'Petugas Pendaftaran', 'Dokter']
    },
    {
      name: 'Master Data Pasien',
      path: '/patients',
      icon: '👥',
      roles: ['Administrator', 'Petugas Pendaftaran', 'Dokter']
    },
    {
      name: 'Manajemen Pengguna & Role',
      path: '/users',
      icon: '🛡️',
      roles: ['Administrator']
    }
  ];

  const filteredNav = navigationItems.filter(item => item.roles.includes(userRole));

  const getRoleBadgeStyle = (role) => {
    switch (role) {
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

  const onLogoutClick = async () => {
    await handleLogout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar Navigation - White Clean Theme */}
      <aside className="w-72 bg-white text-slate-800 flex flex-col shadow-lg z-20 border-r border-slate-200/80">
        
        {/* Header Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-md shadow-blue-500/20 font-bold">
              🏥
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-800">
                MiniClinic<span className="text-blue-600">.</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Pelayanan Kesehatan
              </p>
            </div>
          </div>
        </div>

        {/* User Info Profile Card */}
        <div className="px-4 py-3.5 mx-4 mt-4 bg-slate-50/80 rounded-2xl border border-slate-200/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-base shadow-sm">
              {userRole === 'Dokter' ? '👨‍⚕️' : userRole === 'Administrator' ? '🛡️' : '📋'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">
                {user?.nama_lengkap || 'Pengguna Klinik'}
              </div>
              <span className={`inline-block mt-0.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(userRole)}`}>
                {userRole}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 mt-6 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Menu Utama
          </div>
          {filteredNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Action Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onLogoutClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold transition-all border border-slate-200 hover:border-rose-200 shadow-sm"
          >
            <span>🚪</span> Keluar Sistem (Logout)
          </button>
        </div>
      </aside>

      {/* Main Right Content Area */}
      <main className="flex-1 overflow-auto bg-slate-50 flex flex-col">
        {/* Top bar header */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {location.pathname === '/dashboard' && 'Dashboard Utama Klinik'}
              {location.pathname === '/queue' && 'Manajemen Antrean & Pendaftaran Poli'}
              {location.pathname === '/patients' && 'Kelola Master Data Pasien'}
              {location.pathname === '/users' && 'Manajemen Pengguna & Hak Akses (Role)'}
              {location.pathname.startsWith('/doctor/examination') && 'Pemeriksaan Diagnosa Medis Pasien (SOAP)'}
            </h2>
            <p className="text-xs text-slate-500">
              Pengguna aktif: <span className="font-semibold text-slate-700">{user?.nama_lengkap}</span> ({user?.role})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Sistem Aktif
            </span>
          </div>
        </header>

        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route Login */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes inside Main Layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/queue"
            element={
              <ProtectedRoute>
                <Layout>
                  <QueueManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/patients"
            element={
              <ProtectedRoute>
                <Layout>
                  <PatientManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <Layout>
                  <UserManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Standalone Route for Doctor Examination (SOAP Form) */}
          <Route
            path="/doctor/examination/:registrationId"
            element={
              <ProtectedRoute allowedRoles={['Administrator', 'Dokter']}>
                <DoctorExamination />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect to Dashboard or Login */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
