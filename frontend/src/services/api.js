import axios from 'axios';

// Menggunakan baseURL dari konfigurasi environment Vite
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// Axios Request Interceptor
// Menyisipkan Bearer Token otomatis pada setiap request jika token tersedia di local storage
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('jwt_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
