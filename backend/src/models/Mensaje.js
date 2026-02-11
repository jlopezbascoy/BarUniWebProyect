/**
 * Modelo de Mensaje de Contacto
 * CRUD para mensajes de clientes
 */

const { run, get, query } = require('../config/database');
const { logger } = require('../utils/logger');

class Mensaje {
    /**
     * Guardar un nuevo mensaje
     * @param {Object} data - Datos del formulario
     * @param {Object} reqInfo - IP y UserAgent
     */
    static async create(data, reqInfo) {
        try {
            const sql = `
                INSERT INTO mensajes (
                    nombre, apellidos, email, telefono, 
                    asunto, mensaje, ip_address, fecha_envio
                ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;
            
            const params = [
                data.nombre,
                data.apellidos,
                data.email,
                data.telefono || null,
                data.asunto,
                data.mensaje,
                reqInfo.ip
            ];
            
            const result = await run(sql, params);
            
            logger.info('Nuevo mensaje de contacto recibido', {
                mensajeId: result.lastID,
                asunto: data.asunto
            });
            
            return {
                id: result.lastID,
                ...data
            };
        } catch (error) {
            logger.error('Error al guardar mensaje', { error: error.message });
            throw error;
        }
    }

    /**
     * Listar mensajes (para admin)
     */
    static async listar() {
        return await query('SELECT * FROM mensajes ORDER BY fecha_envio DESC');
    }
}

module.exports = Mensaje;
