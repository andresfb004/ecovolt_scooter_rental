// backend/models/stationModel.js
const pool = require('../config/db');

const Station = {
    async getAll() {
        try {
            console.log('🔍 Buscando estaciones en la base de datos...');
            const [rows] = await pool.query('SELECT * FROM stations ORDER BY name');
            console.log(`✅ Encontradas ${rows.length} estaciones`);
            return rows;
        } catch (error) {
            console.error('❌ Error en Station.getAll():', error.message);
            throw error;
        }
    },

    async getById(id) {
        try {
            const [rows] = await pool.query('SELECT * FROM stations WHERE id = ?', [id]);
            return rows[0];
        } catch (error) {
            console.error('❌ Error en Station.getById():', error.message);
            throw error;
        }
    },

    async decrementAvailability(id) {
        try {
            const [result] = await pool.query(
                'UPDATE stations SET available_scooters = available_scooters - 1 WHERE id = ? AND available_scooters > 0', 
                [id]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('❌ Error en Station.decrementAvailability():', error.message);
            throw error;
        }
    }
};

module.exports = Station;