/**
 * Rutas de Reservas
 * Definición de endpoints API
 */

const express = require('express');
const router = express.Router();
const reservasController = require('../controllers/reservasController');
const { reservasLimiter } = require('../middleware/security');
const { authMiddleware } = require('../middleware/auth'); // Importar auth
const {
    validateCreateReserva,
    validateCodigo,
    validateCancelacion,
    validateUpdateReserva,
    checkDuplicateReserva,
    validateCapacidad
} = require('../middleware/validation');

/**
 * @route   POST /api/reservas
 * @desc    Crear nueva reserva
 * @access  Public
 */
router.post(
    '/',
    reservasLimiter,              // Rate limiting estricto
    validateCreateReserva,        // Validación de datos
    checkDuplicateReserva,        // Verificar duplicados
    validateCapacidad,           // Verificar capacidad
    reservasController.createReserva
);

/**
 * @route   GET /api/reservas/disponibilidad
 * @desc    Verificar disponibilidad
 * @access  Public
 */
router.get(
    '/disponibilidad',
    reservasController.checkDisponibilidad
);

/**
 * @route   GET /api/reservas/horarios
 * @desc    Obtener horarios disponibles
 * @access  Public
 */
router.get(
    '/horarios',
    reservasController.getHorarios
);

/**
 * @route   GET /api/reservas/:codigo
 * @desc    Obtener reserva por código
 * @access  Public
 */
router.get(
    '/:codigo',
    validateCodigo,
    reservasController.getReserva
);

/**
 * @route   DELETE /api/reservas/:codigo
 * @desc    Cancelar reserva
 * @access  Public
 */
router.delete(
    '/:codigo',
    validateCancelacion,
    reservasController.cancelarReserva
);

/**
 * @route   PUT /api/reservas/:codigo
 * @desc    Actualizar reserva
 * @access  Public
 */
router.put(
    '/:codigo',
    reservasLimiter,
    validateCodigo,
    validateUpdateReserva,
    reservasController.updateReserva
);

/**
 * @route   GET /api/reservas/admin/lista
 * @desc    Listar todas las reservas (para panel admin)
 * @access  Private (requiere autenticación)
 */
router.get(
    '/admin/lista',
    authMiddleware, // Protegido con usuario/password
    reservasController.listarReservas
);

module.exports = router;
