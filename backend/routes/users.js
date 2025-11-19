const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/userModel');
const Reservation = require('../models/reservationModel');
const router = express.Router();

router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        // Usar getWithStation para que el frontend tenga los nombres de estación
        const reservations = await Reservation.getWithStation(req.user.id);

        res.json({ 
            id: user.id, 
            email: user.email, 
            reservations 
        });
    } catch (err) {
        console.error('Error obteniendo perfil:', err);
        res.status(500).json({ message: 'Error al obtener perfil' });
    }
});

module.exports = router;