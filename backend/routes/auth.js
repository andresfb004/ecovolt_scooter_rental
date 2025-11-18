const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const router = express.Router();

router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        const existingUser = await User.findByEmail(email);
        if (existingUser) return res.status(400).json({ message: 'Usuario ya existe' });

        const user = await User.create(email, password);
        const token = jwt.sign({ id: user.id, email: user.email }, '');
        res.json({ token });
    } catch (err) {
        res.status(500).json({ message: 'Error de registro' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findByEmail(email);
        if (!user) return res.status(400).json({ message: 'Credenciales incorrectas' });

        const validPassword = await User.verifyPassword(user, password);
        if (!validPassword) return res.status(400).json({ message: 'Credenciales incorrectas' });

        const token = jwt.sign({ id: user.id, email: user.email }, 'secret_key_ecovolt');
        res.json({ token });
    } catch (err) {
        res.status(500).json({ message: 'Error de autenticación' });
    }
});

module.exports = router;
