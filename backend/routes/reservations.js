const express = require('express');
const Reservation = require('../models/reservationModel');
const Station = require('../models/stationModel');
const authMiddleware = require('../middleware/authMiddleware');
const qr = require('qr-image');
const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
    const { stationId } = req.body;
    const userId = req.user.id;

    try {
        const station = await Station.getById(stationId);
        if (!station || station.available_scooters <= 0) return res.status(400).json({ message: 'No hay patinetas disponibles' });

        await Station.decrementAvailability(stationId);

        const qrCodeData = `reserva:${userId}:${stationId}:${Date.now()}`;
        const qrImage = qr.imageSync(qrCodeData, { type: 'svg' });

        const reservation = await Reservation.create(userId, stationId, qrCodeData);

        res.json({ stationId, qrCode: qrCodeData, reservationId: reservation.id });
    } catch (err) {
        res.status(500).json({ message: 'Error al crear reserva' });
    }
});

module.exports = router;
