const pool = require('../config/db');

const Station = {
    async getAll() {
        const [rows] = await pool.query('SELECT * FROM stations');
        return rows;
    },

    async getById(id) {
        const [rows] = await pool.query('SELECT * FROM stations WHERE id = ?', [id]);
        return rows[0];
    },

    async decrementAvailability(id) {
        await pool.query('UPDATE stations SET available_scooters = available_scooters - 1 WHERE id = ? AND available_scooters > 0', [id]);
    }
};

module.exports = Station;
