const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Import Routes
const authRoutes = require('./routes/authRoutes');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API Miniclinic Aktif' });
});

// Register Routes
app.use('/api', authRoutes); // Menggunakan /api/login dan /api/logout

module.exports = app;
