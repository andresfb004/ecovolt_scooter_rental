const jwt = require('jsonwebtoken');
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET no definido');
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
};
module.exports = authMiddleware;
