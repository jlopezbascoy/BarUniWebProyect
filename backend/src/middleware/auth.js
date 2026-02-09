/**
 * Middleware de Autenticación Básica
 * Protege rutas sensibles como el panel de administración
 */

const authMiddleware = (req, res, next) => {
    // Credenciales esperadas (desde .env o por defecto)
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

    // Obtener header de autorización
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Panel de Administración"');
        return res.status(401).json({
            success: false,
            message: 'Autenticación requerida'
        });
    }

    // El formato es "Basic <base64(user:pass)>"
    const auth = new Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    // Verificar credenciales (comparación simple para este caso de uso)
    if (user === adminUser && pass === adminPass) {
        next(); // Credenciales correctas
    } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Panel de Administración"');
        return res.status(401).json({
            success: false,
            message: 'Credenciales inválidas'
        });
    }
};

module.exports = { authMiddleware };
