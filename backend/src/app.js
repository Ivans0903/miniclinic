const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Import Routes
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const queueRoutes = require('./routes/queueRoutes');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API Miniclinic Aktif' });
});

// Register Routes
app.use('/api/auth', authRoutes);
app.use('/api', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/queues', queueRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/dashboard', dashboardRoutes);

module.exports = app;
