/**
 * Controlador de Reservas
 * Lógica de negocio y respuestas HTTP
 */

const Reserva = require('../models/Reserva');
const { logger, securityLog, auditLog } = require('../utils/logger');
const { sendConfirmationEmail, sendCancellationEmail } = require('../utils/email');

/**
 * Crear nueva reserva
 * POST /api/reservas
 */
async function createReserva(req, res, next) {
    try {
        const data = req.validatedData;
        const reqInfo = {
            ip: req.ip,
            userAgent: req.get('user-agent')
        };
        
        // Verificar disponibilidad una vez más
        const disponible = await Reserva.verificarDisponibilidad(
            data.fecha, 
            data.hora, 
            data.personas
        );
        
        if (!disponible) {
            return res.status(409).json({
                success: false,
                message: 'Lo sentimos, no hay disponibilidad para la fecha y hora seleccionadas'
            });
        }
        
        // Crear reserva
        const reserva = await Reserva.create(data, reqInfo);
        
        // Intentar enviar email de confirmación (no bloqueante)
        try {
            await sendConfirmationEmail(data, reserva.codigo);
        } catch (emailError) {
            logger.error('Error al enviar email de confirmación', { 
                error: emailError.message,
                reservaId: reserva.id 
            });
            // No fallar la reserva si el email falla
        }
        
        // Log de auditoría
        auditLog('RESERVA_CREATED', {
            reservaId: reserva.id,
            fecha: data.fecha,
            hora: data.hora,
            personas: data.personas
        });
        
        // Responder éxito (exponer token_cancelacion para tests/frontend)
        res.status(201).json({
            success: true,
            message: 'Reserva creada exitosamente',
            data: {
                id: reserva.id,
                codigo: reserva.codigo,
                tokenCancelacion: reserva.tokenCancelacion, // Agregado para cumplir tests
                fecha: data.fecha,
                hora: data.hora,
                personas: data.personas,
                email: data.email
            }
        });
        
    } catch (error) {
        next(error);
    }
}

/**
 * Obtener reserva por código
 * GET /api/reservas/:codigo
 */
async function getReserva(req, res, next) {
    try {
        const { codigo } = req.params;
        
        const reserva = await Reserva.findByCodigo(codigo);
        
        if (!reserva) {
            securityLog('RESERVA_NOT_FOUND', { 
                codigo,
                ip: req.ip 
            });
            
            return res.status(404).json({
                success: false,
                message: 'Reserva no encontrada'
            });
        }
        
        res.json({
            success: true,
            data: reserva
        });
        
    } catch (error) {
        next(error);
    }
}

/**
 * Cancelar reserva
 * DELETE /api/reservas/:codigo
 */
async function cancelarReserva(req, res, next) {
    try {
        const { codigo } = req.params;
        const { motivo } = req.body;
        
        // Verificar que la reserva existe
        const reserva = await Reserva.findByCodigo(codigo);
        
        if (!reserva) {
            return res.status(404).json({
                success: false,
                message: 'Reserva no encontrada'
            });
        }
        
        // Verificar que no esté ya cancelada
        if (reserva.estado === 'cancelada') {
            return res.status(400).json({
                success: false,
                message: 'La reserva ya está cancelada'
            });
        }
        
        // Cancelar
        const reqInfo = {
            ip: req.ip,
            userAgent: req.get('user-agent')
        };
        const cancelado = await Reserva.cancelar(codigo, motivo, reqInfo);
        
        if (!cancelado) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo cancelar la reserva'
            });
        }
        
        // Enviar email de cancelación (no bloqueante)
        try {
            await sendCancellationEmail(reserva.email, {
                fecha: reserva.fecha,
                hora: reserva.hora,
                personas: reserva.personas
            });
        } catch (emailError) {
            logger.error('Error al enviar email de cancelación', { 
                error: emailError.message,
                codigo 
            });
            // No fallar la cancelación si el email falla
        }
        
        // Log de auditoría
        auditLog('RESERVA_CANCELLED', {
            codigo,
            motivo: motivo || 'No especificado'
        });
        
        res.json({
            success: true,
            message: 'Reserva cancelada exitosamente'
        });
        
    } catch (error) {
        next(error);
    }
}

/**
 * Verificar disponibilidad
 * GET /api/reservas/disponibilidad
 */
async function checkDisponibilidad(req, res, next) {
    try {
        const { fecha, hora, personas } = req.query;
        
        if (!fecha || !hora || !personas) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros: fecha, hora, personas'
            });
        }
        
        const disponible = await Reserva.verificarDisponibilidad(
            fecha, 
            hora, 
            parseInt(personas)
        );
        
        res.json({
            success: true,
            data: {
                disponible,
                fecha,
                hora,
                personas: parseInt(personas)
            }
        });
        
    } catch (error) {
        next(error);
    }
}

/**
 * Obtener horarios disponibles
 * GET /api/reservas/horarios
 */
async function getHorarios(req, res, next) {
    try {
        const { fecha } = req.query;
        
        if (!fecha) {
            return res.status(400).json({
                success: false,
                message: 'Falta parámetro: fecha'
            });
        }
        
        // Horarios base
        const horariosComida = ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30'];
        const horariosCena = ['20:00', '20:30', '21:00', '21:30', '22:00', '22:30'];
        
        // Verificar día de la semana (0 = domingo)
        const diaSemana = new Date(fecha).getDay();
        const esDomingo = diaSemana === 0;
        
        let horariosDisponibles = [];
        
        // Obtener ocupación por hora
        const reservas = await Reserva.getByFecha(fecha);
        const ocupacionPorHora = {};
        
        reservas.forEach(r => {
            ocupacionPorHora[r.hora] = (ocupacionPorHora[r.hora] || 0) + r.personas;
        });
        
        // Función para verificar si un horario está disponible
        const verificarHorario = (hora) => {
            const ocupado = ocupacionPorHora[hora] || 0;
            return ocupado < 50; // Capacidad máxima
        };
        
        // Agregar horarios de comida
        horariosComida.forEach(hora => {
            horariosDisponibles.push({
                hora,
                turno: 'comida',
                disponible: verificarHorario(hora)
            });
        });
        
        // Agregar horarios de cena (no disponibles el domingo)
        if (!esDomingo) {
            horariosCena.forEach(hora => {
                horariosDisponibles.push({
                    hora,
                    turno: 'cena',
                    disponible: verificarHorario(hora)
                });
            });
        }
        
        res.json({
            success: true,
            data: {
                fecha,
                esDomingo,
                horarios: horariosDisponibles
            }
        });
        
    } catch (error) {
        next(error);
    }
}

/**
 * Actualizar reserva
 * PUT /api/reservas/:codigo
 */
async function updateReserva(req, res, next) {
    try {
        const { codigo } = req.params;
        const data = req.validatedData || req.body;
        
        // Verificar que la reserva existe
        const reserva = await Reserva.findByCodigo(codigo);
        
        if (!reserva) {
            return res.status(404).json({
                success: false,
                message: 'Reserva no encontrada'
            });
        }
        
        // Verificar que no esté cancelada
        if (reserva.estado === 'cancelada') {
            return res.status(400).json({
                success: false,
                message: 'No se puede actualizar una reserva cancelada'
            });
        }
        
        // Actualizar reserva
        const actualizado = await Reserva.update(codigo, data);
        
        if (!actualizado) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar la reserva'
            });
        }
        
        // Log de auditoría
        auditLog('RESERVA_UPDATED', {
            codigo,
            cambios: Object.keys(data)
        });
        
        res.json({
            success: true,
            message: 'Reserva actualizada exitosamente',
            data: {
                codigo,
                ...data
            }
        });
        
    } catch (error) {
        next(error);
    }
}

/**
 * Listar reservas (para panel admin)
 * GET /api/reservas/admin/lista
 */
async function listarReservas(req, res, next) {
    try {
        const { fecha, estado, busqueda, page, limit, format } = req.query;
        
        const filtros = {
            fecha,
            estado,
            busqueda,
            page: parseInt(page),
            limit: parseInt(limit),
            exportar: format === 'csv'
        };
        
        const resultado = await Reserva.listar(filtros);
        
        // Exportar a CSV
        if (format === 'csv') {
            const fields = ['id', 'codigo', 'nombre', 'apellidos', 'email', 'telefono', 'fecha', 'hora', 'personas', 'estado', 'ubicacion', 'comentarios'];
            const header = fields.join(';') + '\n';
            
            const rows = resultado.data.map(row => {
                return fields.map(field => {
                    let val = row[field] || '';
                    // Escapar comillas y saltos de línea
                    if (typeof val === 'string') {
                        val = val.replace(/"/g, '""').replace(/\n/g, ' ');
                        if (val.includes(';') || val.includes(',')) val = `"${val}"`;
                    }
                    return val;
                }).join(';');
            }).join('\n');
            
            const csv = header + rows;
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=reservas-${fecha || 'todas'}.csv`);
            return res.send(csv);
        }
        
        res.json({
            success: true,
            data: resultado.data,
            pagination: {
                total: resultado.total,
                page: resultado.page,
                totalPages: resultado.totalPages,
                limit: parseInt(limit) || 10
            }
        });
        
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createReserva,
    getReserva,
    cancelarReserva,
    updateReserva,
    checkDisponibilidad,
    getHorarios,
    listarReservas
};
