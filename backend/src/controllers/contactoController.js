/**
 * Controlador de Contacto
 * Manejo de mensajes de usuarios
 */

const Mensaje = require('../models/Mensaje');
const { validationResult } = require('express-validator');
const { logger } = require('../utils/logger');

// POST /api/contacto
exports.createMensaje = async (req, res, next) => {
    try {
        // Validar errores
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Por favor revisa los campos del formulario',
                errors: errors.array()
            });
        }

        const data = req.body;
        const reqInfo = {
            ip: req.ip,
            userAgent: req.get('user-agent')
        };

        // Guardar mensaje en BD
        const mensaje = await Mensaje.create(data, reqInfo);

        // Opcional: Enviar email de notificación a la empresa (futura implementación)
        // await sendContactEmail(mensaje);

        res.status(201).json({
            success: true,
            message: 'Tu mensaje ha sido recibido correctamente. Te responderemos pronto.'
        });

    } catch (error) {
        logger.error('Error en contactoController', error);
        next(error);
    }
};

// GET /api/contacto (Solo Admin - Implementación futura)
exports.listarMensajes = async (req, res, next) => {
    // Aquí podrías añadir autenticación
    try {
        const mensajes = await Mensaje.listar();
        res.json({ success: true, data: mensajes });
    } catch (error) {
        next(error);
    }
};
