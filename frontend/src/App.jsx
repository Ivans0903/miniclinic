import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import api from './services/api';

import Dashboard from './pages/Dashboard';
import QueueManagement from './pages/QueueManagement';
import DoctorExamination from './pages/DoctorExamination';
// import PatientManagement from './pages/PatientManagement'; // Assuming you have it

const Layout = ({ children }) => (
  <div className="flex h-screen bg-gray-50">
    <aside className="w-64 bg-indigo-900 text-white flex flex-col shadow-2xl z-20">
      <div className="p-6">
        <h1 className="text-2xl font-black text-white tracking-tight">MiniClinic<span className="text-blue-400">.</span></h1>
        <p className="text-indigo-300 text-xs font-medium uppercase tracking-widest mt-1">Hospital System</p>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        <Link to="/dashboard" className="block px-4 py-3 rounded-xl hover:bg-indigo-800 transition-colors font-medium flex items-center gap-3">
            <span className="text-xl">📊</span> Dashboard
        </Link>
        <Link to="/queue" className="block px-4 py-3 rounded-xl hover:bg-indigo-800 transition-colors font-medium flex items-center gap-3">
            <span className="text-xl">🎟️</span> Antrean & Poli
        </Link>
      </nav>
      <div className="p-4 border-t border-indigo-800/50 bg-indigo-900/50">
        <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">Mode Auto-Login</div>
        <div className="font-bold text-sm text-white flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div> dr. Budi Santoso
        </div>
      </div>
    </aside>
    <main className="flex-1 overflow-auto bg-gray-50">
      {children}
    </main>
  </div>
);

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  // Auto-login to obtain a valid JWT token seamlessly for testing
  useEffect(() => {
    const autoLogin = async () => {
      try {
        const res = await api.post('/auth/login', {
          username: 'dr_budi',
          password: 'dokter123'
        });
        if (res.data.success) {
          localStorage.setItem('token', res.data.data.token);
        }
      } catch (error) {
        console.error("Gagal auto-login", error);
      } finally {
        setIsInitializing(false);
      }
    };
    autoLogin();
  }, []);

  if (isInitializing) {
    return (
        <div className="min-h-screen bg-indigo-900 flex items-center justify-center">
            <div className="text-white text-center">
                <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p className="font-bold tracking-widest">MENGHUBUNGKAN SISTEM...</p>
            </div>
        </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/queue" element={<Layout><QueueManagement /></Layout>} />
        
        {/* Fullscreen Route without Sidebar */}
        <Route path="/doctor/examination/:registrationId" element={<DoctorExamination />} />
      </Routes>
    </Router>
  );
}
