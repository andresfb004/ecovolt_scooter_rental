const pool = require('../config/db');
const bcrypt = require('bcrypt');

const User = {
    async create(email, password) {
        const hashedPass = await bcrypt.hash(password, 10);
        const [rows] = await pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPass]);
        return { id: rows.insertId, email };
    },

    async findByEmail(email) {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },

    async findById(id) {
        const [rows] = await pool.query('SELECT id, email FROM users WHERE id = ?', [id]);
        return rows[0];
    },

    async verifyPassword(user, password) {
        return bcrypt.compare(password, user.password);
    }
};

module.exports = User;
