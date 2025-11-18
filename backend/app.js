const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

const authRoutes = require('./routes/auth');
const stationRoutes = require('./routes/stations');
const reservationRoutes = require('./routes/reservations');
const userRoutes = require('./routes/users');

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/users', userRoutes);

app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
