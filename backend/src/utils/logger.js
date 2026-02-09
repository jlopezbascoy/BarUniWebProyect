/**
 * Logger seguro siguiendo OWASP
 * No registra datos PII sensibles
 */

const winston = require('winston');
const path = require('path');

// Formato personalizado que sanitiza datos sensibles
const sanitizeFormat = winston.format((info) => {
    // Lista de campos sensibles a ofuscar
    const sensitiveFields = ['email', 'telefono', 'codigo', 'token_cancelacion', 'password', 'jwt'];
    
    if (info.message && typeof info.message === 'object') {
        const sanitized = { ...info.message };
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '***REDACTED***';
            }
        });
        info.message = sanitized;
    }
    
    return info;
});

// Configuración de transportes
const transports = [
    // Consola en desarrollo
    new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(({ level, message, timestamp, ...metadata }) => {
                let msg = `${timestamp} [${level}]: ${message}`;
                if (Object.keys(metadata).length > 0) {
                    msg += ` ${JSON.stringify(metadata)}`;
                }
                return msg;
            })
        )
    })
];

// Archivo en producción
if (process.env.NODE_ENV === 'production') {
    const fs = require('fs');
    const logDir = path.join(__dirname, '../../logs');

    // Asegurar que el directorio logs existe
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    );
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        sanitizeFormat(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'parrillada-alcume-api' },
    transports
});

/**
 * Log de seguridad específico
 * @param {string} event - Tipo de evento
 * @param {Object} data - Datos del evento
 */
function securityLog(event, data) {
    logger.info({
        type: 'SECURITY',
        event,
        ...data,
        timestamp: new Date().toISOString()
    });
}

/**
 * Log de auditoría
 * @param {string} action - Acción realizada
 * @param {Object} details - Detalles
 */
function auditLog(action, details) {
    logger.info({
        type: 'AUDIT',
        action,
        ...details,
        timestamp: new Date().toISOString()
    });
}

module.exports = {
    logger,
    securityLog,
    auditLog
};
