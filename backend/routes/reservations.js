const express = require('express');
const Reservation = require('../models/reservationModel');
const Station = require('../models/stationModel');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
    const { stationId } = req.body;
    const userId = req.user.id;

    // Validación básica
    if (!stationId) {
        return res.status(400).json({ message: 'stationId es requerido' });
    }

    try {
        // Verificar estación y disponibilidad
        const station = await Station.getById(stationId);
        if (!station) {
            return res.status(404).json({ message: 'Estación no encontrada' });
        }

        if (station.available_scooters <= 0) {
            return res.status(400).json({ message: 'No hay patinetas disponibles en esta estación' });
        }

        // Disminuir disponibilidad
        const updated = await Station.decrementAvailability(stationId);
        if (!updated) {
            return res.status(400).json({ message: 'No se pudo actualizar la disponibilidad' });
        }

        // Crear código QR único
        const qrCodeData = `ECOVOLT:${userId}:${stationId}:${Date.now()}`;
        
        // Crear reserva
        const reservation = await Reservation.create(userId, stationId, qrCodeData);

        // Respuesta exitosa
        res.json({ 
            success: true,
            stationId: stationId,
            stationName: station.name,
            qrCode: qrCodeData,  // Enviamos el texto QR para que el frontend lo convierta
            reservationId: reservation.id,
            message: 'Reserva creada exitosamente'
        });

    } catch (err) {
        console.error('Error creando reserva:', err);
        res.status(500).json({ message: 'Error al crear reserva' });
    }
});

// Ruta opcional para obtener reservas del usuario
router.get('/my-reservations', authMiddleware, async (req, res) => {
    try {
        const reservations = await Reservation.findByUser(req.user.id);
        res.json(reservations);
    } catch (err) {
        console.error('Error obteniendo reservas:', err);
        res.status(500).json({ message: 'Error al obtener reservas' });
    }
});

module.exports = router;