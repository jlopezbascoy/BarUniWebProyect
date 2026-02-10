/**
 * Modelo de Reserva
 * Operaciones CRUD con prepared statements (OWASP)
 */

const { db, query, run, get } = require('../config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

class Reserva {
    /**
     * Crear nueva reserva
     * @param {Object} data - Datos de la reserva
     * @param {Object} reqInfo - Información de la request (IP, User-Agent)
     * @returns {Promise<Object>} - Reserva creada
     */
    static async create(data, reqInfo) {
        try {
            // Generar código único
            const codigo = this.generarCodigo();
            const codigoHash = await bcrypt.hash(codigo, parseInt(process.env.BCRYPT_ROUNDS) || 12);
            const tokenCancelacion = uuidv4();
            
            const sql = `
                INSERT INTO reservas (
                    nombre, apellidos, email, telefono,
                    fecha, hora, personas, ubicacion, ocasion,
                    alergias, comentarios,
                    codigo, codigo_hash, token_cancelacion,
                    ip_address, user_agent
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                data.nombre,
                data.apellidos,
                data.email,
                data.telefono,
                data.fecha,
                data.hora,
                data.personas,
                data.ubicacion || 'indiferente',
                data.ocasion || null,
                data.alergias || null,
                data.comentarios || null,
                codigo,
                codigoHash,
                tokenCancelacion,
                reqInfo.ip,
                reqInfo.userAgent
            ];
            
            const result = await run(sql, params);
            
            logger.info('Reserva creada exitosamente', {
                reservaId: result.lastID,
                fecha: data.fecha,
                hora: data.hora,
                personas: data.personas
            });
            
            return {
                id: result.lastID,
                codigo,
                tokenCancelacion,
                ...data
            };
        } catch (error) {
            logger.error('Error al crear reserva', { error: error.message, data });
            throw error;
        }
    }
    
    /**
     * Buscar reserva por código
     * @param {string} codigo
     * @returns {Promise<Object|null>}
     */
    static async findByCodigo(codigo) {
        try {
            // Buscar la reserva
            const reserva = await get(
                'SELECT * FROM reservas WHERE codigo = ?',
                [codigo]
            );
            
            if (!reserva) {
                return null;
            }
            
            // No devolver datos sensibles
            delete reserva.codigo_hash;
            delete reserva.token_cancelacion;
            delete reserva.ip_address;
            delete reserva.user_agent;
            
            return reserva;
        } catch (error) {
            logger.error('Error al buscar reserva', { error: error.message, codigo });
            throw error;
        }
    }
    
    /**
     * Verificar código de reserva (para validaciones adicionales)
     * @param {string} codigo
     * @returns {Promise<boolean>}
     * @deprecated No se usa actualmente, reservado para futuras validaciones de seguridad
     */
    static async verificarCodigo(codigo) {
        try {
            const reserva = await get(
                'SELECT codigo_hash FROM reservas WHERE codigo = ?',
                [codigo]
            );
            
            if (!reserva) {
                return false;
            }
            
            return await bcrypt.compare(codigo, reserva.codigo_hash);
        } catch (error) {
            logger.error('Error al verificar código', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Cancelar reserva (Borrado físico con respaldo en auditoría)
     * @param {string} codigo
     * @param {string} motivo - Opcional
     * @param {Object} reqInfo - IP y UserAgent (Opcional)
     * @returns {Promise<boolean>}
     */
    static async cancelar(codigo, motivo = null, reqInfo = {}) {
        try {
            // 1. Obtener la reserva completa antes de borrar
            const reserva = await get('SELECT * FROM reservas WHERE codigo = ?', [codigo]);
            
            if (!reserva) {
                return false;
            }

            // 2. Insertar en audit_logs (guardar historial completo)
            const auditSql = `
                INSERT INTO audit_logs (
                    tabla, registro_id, accion, 
                    datos_anteriores, datos_nuevos, 
                    ip_address, user_agent
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            const datosAnteriores = JSON.stringify(reserva);
            const datosNuevos = JSON.stringify({ 
                estado: 'cancelada', 
                cancel_reason: motivo,
                cancelled_at: new Date().toISOString()
            });

            await run(auditSql, [
                'reservas',
                reserva.id,
                'CANCEL',
                datosAnteriores,
                datosNuevos,
                reqInfo.ip || null,
                reqInfo.userAgent || null
            ]);
            
            // 3. Borrar físicamente de la tabla reservas
            const sql = `DELETE FROM reservas WHERE codigo = ?`;
            const result = await run(sql, [codigo]);
            
            if (result.changes === 0) {
                return false;
            }
            
            logger.info('Reserva cancelada y archivada', { codigo, motivo });
            return true;
        } catch (error) {
            logger.error('Error al cancelar reserva', { error: error.message, codigo });
            throw error;
        }
    }
    
    /**
     * Obtener reservas por fecha
     * @param {string} fecha - YYYY-MM-DD
     * @returns {Promise<Array>}
     */
    static async getByFecha(fecha) {
        try {
            return await query(
                `SELECT id, fecha, hora, personas, ubicacion, ocasion, estado 
                 FROM reservas 
                 WHERE fecha = ? AND estado = ?
                 ORDER BY hora`,
                [fecha, 'confirmada']
            );
        } catch (error) {
            logger.error('Error al obtener reservas por fecha', { error: error.message, fecha });
            throw error;
        }
    }
    
    /**
     * Verificar disponibilidad
     * @param {string} fecha
     * @param {string} hora
     * @param {number} personas
     * @returns {Promise<boolean>}
     */
    static async verificarDisponibilidad(fecha, hora, personas) {
        try {
            const result = await get(
                'SELECT SUM(personas) as total FROM reservas WHERE fecha = ? AND hora = ? AND estado = ?',
                [fecha, hora, 'confirmada']
            );
            
            const totalReservado = result.total || 0;
            const capacidadMaxima = parseInt(process.env.MAX_CAPACITY) || 50;
            
            return (totalReservado + parseInt(personas)) <= capacidadMaxima;
        } catch (error) {
            logger.error('Error al verificar disponibilidad', { error: error.message });
            throw error;
        }
    }
    
    /**
     * Actualizar reserva
     * @param {string} codigo
     * @param {Object} data
     * @returns {Promise<boolean>}
     */
    static async update(codigo, data) {
        try {
            const camposPermitidos = ['nombre', 'apellidos', 'email', 'telefono', 'personas', 'alergias', 'comentarios', 'ubicacion', 'ocasion'];
            const updates = [];
            const params = [];
            
            for (const campo of camposPermitidos) {
                if (data[campo] !== undefined) {
                    updates.push(`${campo} = ?`);
                    params.push(data[campo]);
                }
            }
            
            if (updates.length === 0) {
                return false;
            }
            
            params.push(codigo);
            
            const sql = `UPDATE reservas SET ${updates.join(', ')} WHERE codigo = ? AND estado = 'confirmada'`;
            const result = await run(sql, params);
            
            logger.info('Reserva actualizada', { codigo, campos: Object.keys(data) });
            return result.changes > 0;
            
        } catch (error) {
            logger.error('Error al actualizar reserva', { error: error.message, codigo });
            throw error;
        }
    }
    
    /**
     * Listar reservas con filtros y paginación
     * @param {Object} filtros
     * @returns {Promise<Object>} { data: Array, total: number, page: number, totalPages: number }
     */
    static async listar(filtros = {}) {
        try {
            // Construir WHERE clause dinámicamente
            let whereClause = 'WHERE 1=1';
            const params = [];
            
            if (filtros.fecha) {
                whereClause += ' AND fecha = ?';
                params.push(filtros.fecha);
            }
            
            if (filtros.estado) {
                whereClause += ' AND estado = ?';
                params.push(filtros.estado);
            }
            
            if (filtros.busqueda) {
                whereClause += ' AND (nombre LIKE ? OR apellidos LIKE ? OR email LIKE ? OR codigo LIKE ?)';
                const busqueda = `%${filtros.busqueda}%`;
                params.push(busqueda, busqueda, busqueda, busqueda);
            }

            // 1. Obtener total de registros (para paginación)
            const countSql = `SELECT COUNT(*) as total FROM reservas ${whereClause}`;
            const countResult = await get(countSql, params);
            const total = countResult.total || 0;

            // Si es exportación, devolver todo sin límite
            if (filtros.exportar) {
                const sql = `
                    SELECT id, nombre, apellidos, email, telefono, fecha, hora, 
                           personas, ubicacion, ocasion, alergias, estado, codigo, created_at,
                           cancel_reason, cancelled_at
                    FROM reservas 
                    ${whereClause}
                    ORDER BY fecha DESC, hora ASC
                `;
                const data = await query(sql, params);
                return { data, total, page: 1, totalPages: 1 };
            }

            // 2. Obtener datos paginados
            const page = parseInt(filtros.page) || 1;
            const limit = parseInt(filtros.limit) || 10;
            const offset = (page - 1) * limit;
            
            const sql = `
                SELECT id, nombre, apellidos, email, telefono, fecha, hora, 
                       personas, ubicacion, ocasion, alergias, estado, codigo, created_at
                FROM reservas 
                ${whereClause}
                ORDER BY fecha DESC, hora ASC
                LIMIT ? OFFSET ?
            `;
            
            // Añadir limit y offset a los params
            const queryParams = [...params, limit, offset];
            const data = await query(sql, queryParams);
            
            const totalPages = Math.ceil(total / limit);
            
            return {
                data,
                total,
                page,
                totalPages
            };
            
        } catch (error) {
            logger.error('Error al listar reservas', { error: error.message });
            throw error;
        }
    }

    /**
     * Generar código único de reserva
     * @returns {string}
     */
    static generarCodigo() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `ALC-${timestamp}-${random}`;
    }
    
    /**
     * Obtener estadísticas de reservas
     * @param {string} fechaInicio
     * @param {string} fechaFin
     * @returns {Promise<Object>}
     * @deprecated No se usa actualmente, reservado para futuro panel de administración
     */
    static async getEstadisticas(fechaInicio, fechaFin) {
        try {
            const total = await get(
                `SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas,
                    SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
                    AVG(personas) as promedio_personas
                 FROM reservas 
                 WHERE date(created_at) BETWEEN ? AND ?`,
                [fechaInicio, fechaFin]
            );
            
            return total;
        } catch (error) {
            logger.error('Error al obtener estadísticas', { error: error.message });
            throw error;
        }
    }
}

module.exports = Reserva;
