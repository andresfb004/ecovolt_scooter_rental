const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const router = express.Router();

// Usar variable de entorno o valor por defecto
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_ecovolt_development';

router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    
    // Validación básica
    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña requeridos' });
    }

    try {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Usuario ya existe' });
        }

        const user = await User.create(email, password);
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
        
        res.json({ 
            token,
            user: { id: user.id, email: user.email }
        });
    } catch (err) {
        console.error('Error en registro:', err);
        res.status(500).json({ message: 'Error de registro' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña requeridos' });
    }

    try {
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(400).json({ message: 'Credenciales incorrectas' });
        }

        const validPassword = await User.verifyPassword(user, password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Credenciales incorrectas' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);
        
        res.json({ 
            token,
            user: { id: user.id, email: user.email }
        });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ message: 'Error de autenticación' });
    }
});

module.exports = router;