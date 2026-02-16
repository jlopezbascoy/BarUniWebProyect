/**
 * Middleware de Autenticación Básica
 * Protege rutas sensibles como el panel de administración
 */

const crypto = require('crypto');
const { securityLog } = require('../utils/logger');

// Función segura para comparar strings en tiempo constante
const safeCompare = (a, b) => {
    const hashA = crypto.createHash('sha256').update(a).digest();
    const hashB = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(hashA, hashB);
};

const authMiddleware = (req, res, next) => {
    // Credenciales esperadas (desde .env o por defecto)
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

    // Advertencia de seguridad si se usan credenciales por defecto
    if (process.env.NODE_ENV === 'production' && (adminUser === 'admin' || adminPass === 'admin123')) {
        console.warn('⚠️ ADVERTENCIA DE SEGURIDAD: Usando credenciales de administrador por defecto en producción.');
    }

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
    // Usar Buffer.from en lugar de new Buffer (deprecated)
    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0] || '';
    const pass = auth[1] || '';

    // Verificar credenciales usando comparación de hashes para evitar timing attacks
    const userValid = safeCompare(user, adminUser);
    const passValid = safeCompare(pass, adminPass);

    if (userValid && passValid) {
        next(); // Credenciales correctas
    } else {
        // Log de intento fallido
        securityLog('LOGIN_FAILED', {
            user: user, // Logear el usuario intentado (pero NO la contraseña)
            ip: req.ip
        });

        res.setHeader('WWW-Authenticate', 'Basic realm="Panel de Administración"');
        // Pequeño retardo artificial para dificultar fuerza bruta
        setTimeout(() => {
            res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }, 500); 
    }
};

module.exports = { authMiddleware };
