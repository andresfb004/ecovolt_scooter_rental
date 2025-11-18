const pool = require('../config/db');

const Reservation = {
    async create(userId, stationId, qrCode) {
        const [rows] = await pool.query(
            'INSERT INTO reservations (user_id, station_id, qr_code) VALUES (?, ?, ?)',
            [userId, stationId, qrCode]
        );
        return { id: rows.insertId, userId, stationId, qrCode };
    },

    async findByUser(userId) {
        const [rows] = await pool.query(
            'SELECT * FROM reservations WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    }
};

module.exports = Reservation;
