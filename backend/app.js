const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const stationRoutes = require('./routes/stations');
const reservationRoutes = require('./routes/reservations');
const userRoutes = require('./routes/users');

const app = express();

app.use(cors());
app.use(express.json());

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/users', userRoutes);

// ✅ Ruta CORRECTA - frontend está al mismo nivel que backend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Ruta catch-all para SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api`);
});