/**
 * Validadores de datos - OWASP Input Validation
 * Todas las validaciones centralizadas
 */

const validator = require('validator');

/**
 * Validar email
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return validator.isEmail(email.trim()) && 
           validator.isLength(email.trim(), { max: 100 });
}

/**
 * Validar teléfono español/internacional
 * @param {string} telefono
 * @returns {boolean}
 */
function isValidTelefono(telefono) {
    if (!telefono || typeof telefono !== 'string') return false;
    
    // Remover espacios y caracteres especiales
    const cleaned = telefono.replace(/[\s\-\.\(\)]/g, '');
    
    // Validar formato español (+34 123456789) o internacional
    return validator.isMobilePhone(cleaned, ['es-ES', 'any'], { strictMode: false }) &&
           validator.isLength(cleaned, { min: 9, max: 15 });
}

/**
 * Validar nombre/apellidos
 * @param {string} nombre
 * @returns {boolean}
 */
function isValidNombre(nombre) {
    if (!nombre || typeof nombre !== 'string') return false;
    
    const trimmed = nombre.trim();
    
    // Letras, números, espacios y caracteres comunes (incluyendo paréntesis y puntos para empresas)
    const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s'-\(\)\.]{2,50}$/;
    
    return nameRegex.test(trimmed) && 
           !validator.contains(trimmed, '<script') &&
           !validator.contains(trimmed, 'javascript:');
}

/**
 * Validar fecha de reserva
 * @param {string} fecha
 * @returns {Object} - { valid: boolean, message: string }
 */
function isValidFecha(fecha) {
    if (!fecha || typeof fecha !== 'string') {
        return { valid: false, message: 'Fecha requerida' };
    }
    
    // Validar formato YYYY-MM-DD
    if (!validator.isDate(fecha, { format: 'YYYY-MM-DD', strictMode: true })) {
        return { valid: false, message: 'Formato de fecha inválido' };
    }
    
    const fechaReserva = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const maxDias = parseInt(process.env.MAX_ADVANCE_DAYS) || 30;
    const fechaMaxima = new Date();
    fechaMaxima.setDate(fechaMaxima.getDate() + maxDias);
    
    if (fechaReserva < hoy) {
        return { valid: false, message: 'La fecha no puede ser anterior a hoy' };
    }
    
    if (fechaReserva > fechaMaxima) {
        return { valid: false, message: `No se pueden hacer reservas con más de ${maxDias} días de antelación` };
    }
    
    return { valid: true };
}

/**
 * Validar hora
 * @param {string} hora
 * @param {string} fecha
 * @returns {Object} - { valid: boolean, message: string }
 */
function isValidHora(hora, fecha) {
    if (!hora || typeof hora !== 'string') {
        return { valid: false, message: 'Hora requerida' };
    }
    
    // Validar formato HH:MM
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(hora)) {
        return { valid: false, message: 'Formato de hora inválido' };
    }
    
    // Horarios permitidos
    const horasPermitidas = [
        '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '20:00', '20:30', '21:00', '21:30', '22:00', '22:30'
    ];
    
    if (!horasPermitidas.includes(hora)) {
        return { valid: false, message: 'Hora no disponible' };
    }
    
    // Si es hoy, validar que la hora no haya pasado
    const hoy = new Date().toISOString().split('T')[0];
    if (fecha === hoy) {
        const ahora = new Date();
        const [horaReserva, minutosReserva] = hora.split(':').map(Number);
        const horaActual = ahora.getHours();
        const minutosActual = ahora.getMinutes();
        
        if (horaReserva < horaActual || 
            (horaReserva === horaActual && minutosReserva < minutosActual)) {
            return { valid: false, message: 'No se pueden hacer reservas para horas pasadas' };
        }
    }
    
    return { valid: true };
}

/**
 * Validar número de personas
 * @param {number} personas
 * @returns {Object} - { valid: boolean, message: string }
 */
function isValidPersonas(personas) {
    const num = parseInt(personas);
    
    if (isNaN(num) || num < 1) {
        return { valid: false, message: 'Número de personas inválido' };
    }
    
    const maxOnline = parseInt(process.env.MAX_PERSONAS_ONLINE) || 10;
    
    if (num > maxOnline) {
        return { valid: false, message: `Para grupos de más de ${maxOnline} personas, contacte por teléfono` };
    }
    
    return { valid: true };
}

/**
 * Sanitizar texto para prevenir XSS
 * @param {string} text
 * @returns {string}
 */
function sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    
    // Usar validator.escape() para neutralizar todas las entidades HTML de forma segura
    // Esto escapa caracteres como <, >, &, etc. para prevenir XSS
    // El texto se mantiene legible pero los caracteres especiales quedan neutralizados
    return validator.escape(text.trim());
}

/**
 * Validar campos opcionales
 * @param {Object} data
 * @returns {Object} - Datos sanitizados
 */
function sanitizeOptionalFields(data) {
    const sanitized = {};
    
    if (data.ubicacion) {
        const validUbicaciones = ['interior', 'terraza', 'indiferente'];
        sanitized.ubicacion = validUbicaciones.includes(data.ubicacion) ? data.ubicacion : 'indiferente';
    }
    
    if (data.ocasion) {
        const validOcasiones = ['', 'cumpleanos', 'aniversario', 'negocios', 'familia', 'romantica', 'otra'];
        sanitized.ocasion = validOcasiones.includes(data.ocasion) ? data.ocasion : '';
    }
    
    if (data.alergias) {
        sanitized.alergias = sanitizeText(data.alergias);
    }
    
    if (data.comentarios) {
        sanitized.comentarios = sanitizeText(data.comentarios);
    }
    
    return sanitized;
}

/**
 * Validación completa de reserva
 * @param {Object} data
 * @returns {Object} - { valid: boolean, errors: Array, sanitized: Object }
 */
function validateReserva(data) {
    const errors = [];
    const sanitized = {};
    
    // Validar campos obligatorios
    if (!isValidNombre(data.nombre)) {
        errors.push({ field: 'nombre', message: 'Nombre inválido (2-50 caracteres)' });
    } else {
        sanitized.nombre = sanitizeText(data.nombre);
    }
    
    if (!isValidNombre(data.apellidos)) {
        errors.push({ field: 'apellidos', message: 'Apellidos inválidos (2-50 caracteres)' });
    } else {
        sanitized.apellidos = sanitizeText(data.apellidos);
    }
    
    if (!isValidEmail(data.email)) {
        errors.push({ field: 'email', message: 'Email inválido' });
    } else {
        // Guardar email tal cual lo escribe el usuario (display/original)
        const trimmed = data.email.trim();
        sanitized.email = trimmed;
        // Guardar versión normalizada para lookups/deduplicación
        // validator.normalizeEmail() produce dirección canónica estable (ej: jota+tag@gmail.com -> jota@gmail.com)
        sanitized.emailNormalized = validator.normalizeEmail(trimmed);
    }
    
    if (!isValidTelefono(data.telefono)) {
        errors.push({ field: 'telefono', message: 'Teléfono inválido (9-15 dígitos)' });
    } else {
        sanitized.telefono = data.telefono.replace(/[\s\-\.\(\)]/g, '');
    }
    
    const fechaValidation = isValidFecha(data.fecha);
    if (!fechaValidation.valid) {
        errors.push({ field: 'fecha', message: fechaValidation.message });
    } else {
        sanitized.fecha = data.fecha;
    }
    
    const horaValidation = isValidHora(data.hora, data.fecha);
    if (!horaValidation.valid) {
        errors.push({ field: 'hora', message: horaValidation.message });
    } else {
        sanitized.hora = data.hora;
    }
    
    const personasValidation = isValidPersonas(data.personas);
    if (!personasValidation.valid) {
        errors.push({ field: 'personas', message: personasValidation.message });
    } else {
        sanitized.personas = parseInt(data.personas);
    }
    
    // Sanitizar campos opcionales
    Object.assign(sanitized, sanitizeOptionalFields(data));
    
    return {
        valid: errors.length === 0,
        errors,
        sanitized
    };
}

module.exports = {
    isValidEmail,
    isValidTelefono,
    isValidNombre,
    isValidFecha,
    isValidHora,
    isValidPersonas,
    sanitizeText,
    sanitizeOptionalFields,
    validateReserva
};
