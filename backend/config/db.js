const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ecovolt',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ✅ Exporta el pool DIRECTAMENTE, sin objeto
module.exports = pool;