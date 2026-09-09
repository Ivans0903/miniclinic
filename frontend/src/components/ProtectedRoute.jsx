import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

// Protected Route Component (Frontend Authorization)
const ProtectedRoute = ({ allowedRoles, children }) => {
    const { isAuthenticated, user } = useContext(AuthContext);

    // Jika belum login, paksa kembali ke /login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Pengecekan authorization role (jika array allowedRoles diberikan)
    if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                <h1 className="text-3xl font-bold text-red-600 mb-4">403 - Akses Ditolak</h1>
                <p className="text-lg text-gray-700">
                    Role Anda (<span className="font-semibold">{user?.role}</span>) tidak memiliki izin untuk resource ini.
                </p>
            </div>
        );
    }

    // Render komponen anak jika memenuhi semua syarat
    return children;
};

export default ProtectedRoute;
