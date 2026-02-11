/**
 * Middleware de Validación
 * Usa express-validator para validación declarativa
 */

const { body, param, validationResult } = require('express-validator');
const { validateReserva } = require('../utils/validators');
const { securityLog } = require('../utils/logger');

/**
 * Manejar errores de validación
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Datos de entrada inválidos',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

/**
 * Validación Honeypot anti-spam
 * Detecta si el campo oculto fue completado (bots suelen llenar todos los campos)
 */
const validateHoneypot = (req, res, next) => {
    // Si el campo honeypot tiene valor, es probable que sea un bot
    if (req.body && req.body.website && req.body.website.trim() !== '') {
        // Log silencioso del intento de spam
        securityLog('HONEYPOT_TRIGGERED', {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            body: { ...req.body, email: '***', telefono: '***' }
        });
        
        // Retornar éxito falso para no alertar al bot
        return res.status(200).json({
            success: true,
            message: 'Reserva creada exitosamente',
            data: { codigo: 'SPAM-DETECTED' }
        });
    }
    
    // Eliminar el campo honeypot de los datos
    if (req.body && req.body.website) {
        delete req.body.website;
    }
    
    next();
};

/**
 * Validaciones para crear reserva
 * Combinación de express-validator + validadores personalizados
 */
const validateCreateReserva = [
    // Validar honeypot primero
    validateHoneypot,
    
    // Usar validadores personalizados más robustos
    (req, res, next) => {
        const result = validateReserva(req.body);
        
        if (!result.valid) {
            // Unir mensajes de error para que sean visibles en el mensaje principal
            const errorMsg = result.errors.map(e => e.message || e.msg || JSON.stringify(e)).join('. ');
            return res.status(400).json({
                success: false,
                message: `Validación fallida: ${errorMsg}`,
                errors: result.errors
            });
        }
        
        // Adjuntar datos sanitizados al request
        req.validatedData = result.sanitized;
        next();
    }
];

/**
 * Validaciones para código de reserva
 */
const validateCodigo = [
    param('codigo')
        .trim()
        .isLength({ min: 10, max: 50 })
        .withMessage('Código de reserva inválido')
        .matches(/^[A-Z0-9\-]+$/)
        .withMessage('Formato de código inválido'),
    handleValidationErrors
];

/**
 * Validaciones para cancelación
 */
const validateCancelacion = [
    param('codigo')
        .trim()
        .isLength({ min: 10, max: 50 })
        .withMessage('Código de reserva inválido'),
    body('motivo')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('El motivo es demasiado largo'),
    handleValidationErrors
];

/**
 * Validar que la fecha no sea en el pasado (usado en middleware)
 */
const validateFechaFutura = (req, res, next) => {
    const { fecha } = req.body;
    
    if (!fecha) {
        return next();
    }
    
    const fechaReserva = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    if (fechaReserva < hoy) {
        return res.status(400).json({
            success: false,
            message: 'La fecha de la reserva no puede ser en el pasado'
        });
    }
    
    next();
};

/**
 * Verificar duplicados (misma fecha, hora, email normalizado)
 */
const checkDuplicateReserva = async (req, res, next) => {
    const db = require('../config/database');
    const validator = require('validator');
    const { email, emailNormalized, fecha, hora } = req.validatedData || req.body;
    
    try {
        // Usar emailNormalized para la deduplicación (comparación segura de emails)
        // Esto previene duplicados causados por variaciones en el email (ej: user@gmail.com vs user+tag@gmail.com)
        const normalizedEmailForLookup = emailNormalized || validator.normalizeEmail(email.trim());
        
        // Obtener todas las reservas para esa fecha/hora y normalizar sus emails para comparar
        const existing = await db.get(
            'SELECT id, estado, email FROM reservas WHERE fecha = ? AND hora = ? AND estado = ?',
            [fecha, hora, 'confirmada']
        );
        
        // Comparar el email normalizado contra el email normalizado de la base de datos
        if (existing && validator.normalizeEmail(existing.email.trim()) === normalizedEmailForLookup) {
            return res.status(409).json({
                success: false,
                message: 'Ya tienes una reserva confirmada para esta fecha y hora'
            });
        }
        
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Validar capacidad del restaurante
 */
const validateCapacidad = async (req, res, next) => {
    const db = require('../config/database');
    const { fecha, hora, personas } = req.validatedData || req.body;
    
    try {
        // Obtener total de personas ya reservadas para esa fecha/hora
        const result = await db.get(
            'SELECT SUM(personas) as total FROM reservas WHERE fecha = ? AND hora = ? AND estado = ?',
            [fecha, hora, 'confirmada']
        );
        
        const totalReservado = result.total || 0;
        const capacidadMaxima = parseInt(process.env.MAX_CAPACITY) || 50; // Ajustar en .env
        
        if (totalReservado + parseInt(personas) > capacidadMaxima) {
            return res.status(409).json({
                success: false,
                message: 'Lo sentimos, no tenemos disponibilidad para esa fecha y hora. Por favor, selecciona otra hora o contacta por teléfono.'
            });
        }
        
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Validaciones para actualización de reserva
 * Permite actualizar ciertos campos sin requerir todos
 */
const validateUpdateReserva = [
    body('nombre')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('El nombre debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/)
        .withMessage('El nombre contiene caracteres inválidos'),
    body('apellidos')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Los apellidos deben tener entre 2 y 50 caracteres'),
    body('email')
        .optional()
        .trim()
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('Email demasiado largo'),
    body('telefono')
        .optional()
        .trim()
        .isLength({ min: 9, max: 15 })
        .withMessage('Teléfono inválido'),
    body('personas')
        .optional()
        .isInt({ min: 1, max: 20 })
        .withMessage('Número de personas inválido (máximo 20)'),
    body('alergias')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Texto de alergias demasiado largo'),
    body('comentarios')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Comentarios demasiado largos'),
    handleValidationErrors
];

module.exports = {
    handleValidationErrors,
    validateCreateReserva,
    validateCodigo,
    validateCancelacion,
    validateUpdateReserva,
    validateFechaFutura,
    checkDuplicateReserva,
    validateCapacidad
};
