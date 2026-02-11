/**
 * Rutas de Contacto
 * API para recibir mensajes del formulario
 */

const express = require('express');
const router = express.Router();
const contactoController = require('../controllers/contactoController');
const { body } = require('express-validator');

// Validaciones para el formulario
const validateContact = [
    body('nombre').trim().isLength({ min: 2, max: 50 }).withMessage('El nombre es obligatorio (min 2 caracteres)'),
    body('apellidos').trim().isLength({ min: 2, max: 50 }).withMessage('Los apellidos son obligatorios'),
    body('email').trim().isEmail().withMessage('Introduce un email válido'),
    body('telefono').optional().isMobilePhone(['es-ES'], { strictMode: false }).withMessage('Introduce un teléfono válido'),
    body('asunto').notEmpty().isIn(['consulta', 'reserva', 'eventos', 'sugerencias', 'reclamaciones', 'otros']).withMessage('Selecciona un asunto válido'),
    body('mensaje').trim().isLength({ min: 10, max: 1000 }).withMessage('Escribe un mensaje de al menos 10 caracteres'),
    body('politica').equals('on').withMessage('Debes aceptar la política de privacidad')
];

/**
 * @route   POST /api/contacto
 * @desc    Enviar mensaje de contacto
 * @access  Public
 */
router.post(
    '/',
    validateContact,
    contactoController.createMensaje
);

module.exports = router;
