// backend/routes/stations.js
const express = require('express');
const Station = require('../models/stationModel');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const stations = await Station.getAll();
        res.json(stations);
    } catch (err) {
        console.error('Error en /api/stations:', err);
        res.status(500).json({ message: 'Error al obtener estaciones: ' + err.message });
    }
});

module.exports = router;