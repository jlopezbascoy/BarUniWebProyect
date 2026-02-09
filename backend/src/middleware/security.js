/**
 * Middleware de Seguridad - OWASP
 * Headers de seguridad, rate limiting, CORS
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { securityLog } = require('../utils/logger');

/**
 * Configuración de Helmet - Headers de seguridad
 * Ajustada para desarrollo y producción
 */
const isDevelopment = process.env.NODE_ENV !== 'production';

const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: isDevelopment 
                ? ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "http://localhost:*", "http://127.0.0.1:*"]
                : ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: isDevelopment
                ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http://localhost:*", "http://127.0.0.1:*"]
                : ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: isDevelopment
                ? ["'self'", "http://localhost:*", "http://127.0.0.1:*"]
                : ["'self'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: isDevelopment ? null : []
        }
    },
    crossOriginEmbedderPolicy: false,
    hsts: isDevelopment ? false : {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    },
    xContentTypeOptions: true,
    xDnsPrefetchControl: { allow: false },
    xDownloadOptions: true,
    xFrameOptions: { action: 'deny' },
    xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
    xXssProtection: false
});

/**
 * Configuración de CORS restrictiva
 */
const getCorsConfig = () => {
    // En desarrollo, permitir todo para evitar dolores de cabeza con localhost vs 127.0.0.1
    if (process.env.NODE_ENV === 'development') {
        return cors({
            origin: true, // Refleja el origen de la petición
            credentials: true
        });
    }

    const allowedOrigins = (process.env.CORS_ORIGIN_PROD || '').split(',');
    
    return cors({
        origin: (origin, callback) => {
            // En producción, no permitir requests sin origin
            // En desarrollo, permitir herramientas como Postman
            if (!origin) {
                if (process.env.NODE_ENV === 'production') {
                    securityLog('CORS_BLOCKED_NULL_ORIGIN', { allowedOrigins });
                    return callback(new Error('No autorizado por CORS'));
                }
                return callback(null, true);
            }
            
            if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
                callback(null, true);
            } else {
                securityLog('CORS_BLOCKED', { origin, allowedOrigins });
                callback(new Error('No autorizado por CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
        maxAge: 86400 // 24 horas
    });
};

/**
 * Rate Limiting general
 */
const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        message: 'Demasiadas solicitudes desde esta IP. Inténtalo más tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        securityLog('RATE_LIMIT_EXCEEDED', {
            ip: req.ip,
            path: req.path,
            userAgent: req.get('user-agent')
        });
        res.status(429).json(options.message);
    }
});

/**
 * Rate Limiting estricto para reservas
 */
const reservasLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: parseInt(process.env.STRICT_RATE_LIMIT_MAX) || 5,
    message: {
        success: false,
        message: 'Has alcanzado el límite de reservas. Contacta por teléfono.'
    },
    keyGenerator: (req) => {
        // Usar IP + email como clave para evitar spam del mismo email
        // Solo usar email si existe en el body (POST requests), de lo contrario solo usar IP
        const email = req.body && req.body.email ? req.body.email : '';
        return req.ip + '_' + email;
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        securityLog('STRICT_RATE_LIMIT_EXCEEDED', {
            ip: req.ip,
            email: req.body.email,
            path: req.path
        });
        res.status(429).json(options.message);
    }
});

/**
 * Sanitización de inputs básica
 * Previene XSS y NoSQL injection
 */
const sanitizeInput = (req, res, next) => {
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                // Remover caracteres potencialmente peligrosos
                req.body[key] = req.body[key]
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '');
            }
        });
    }
    next();
};

/**
 * Logger de requests para auditoría
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        
        // No logear datos sensibles
        const logData = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: duration + 'ms',
            ip: req.ip,
            userAgent: req.get('user-agent')
        };
        
        // Solo logear body en desarrollo y sin datos sensibles
        if (process.env.NODE_ENV === 'development' && req.body) {
            const sanitizedBody = { ...req.body };
            delete sanitizedBody.email;
            delete sanitizedBody.telefono;
            delete sanitizedBody.codigo;
            logData.body = sanitizedBody;
        }
        
        if (res.statusCode >= 400) {
            securityLog('REQUEST_ERROR', logData);
        }
    });
    
    next();
};

/**
 * Verificar si es una petición de API válida
 */
const apiValidator = (req, res, next) => {
    // Rechazar requests sin Content-Type en POST/PUT
    if ((req.method === 'POST' || req.method === 'PUT') && !req.is('application/json')) {
        return res.status(400).json({
            success: false,
            message: 'Content-Type debe ser application/json'
        });
    }
    
    next();
};

/**
 * Manejo de errores seguro (no expone información interna)
 */
const errorHandler = (err, req, res, next) => {
    // Log del error completo (solo en servidor)
    console.error('Error:', err);
    
    // Determinar si es un error conocido o inesperado
    let statusCode = err.status || err.statusCode || 500;
    let message = err.message || 'Error interno del servidor';
    
    // En producción, no exponer detalles de errores internos
    if (process.env.NODE_ENV === 'production') {
        if (statusCode === 500) {
            message = 'Error interno del servidor';
        }
        // No enviar stack trace
        delete err.stack;
    }
    
    // Log de seguridad para errores críticos
    if (statusCode >= 500) {
        securityLog('SERVER_ERROR', {
            error: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
            ip: req.ip
        });
    }
    
    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * Manejo de rutas no encontradas
 */
const notFoundHandler = (req, res) => {
    securityLog('ROUTE_NOT_FOUND', {
        path: req.originalUrl,
        method: req.method,
        ip: req.ip
    });
    
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
};

module.exports = {
    helmetConfig,
    getCorsConfig,
    generalLimiter,
    reservasLimiter,
    sanitizeInput,
    requestLogger,
    apiValidator,
    errorHandler,
    notFoundHandler
};
