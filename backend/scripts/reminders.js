/**
 * Sistema de Recordatorios de Reservas
 * Envía recordatorios automáticos a los clientes
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { query, close } = require('../src/config/database');
const { sendConfirmationEmail } = require('../src/utils/email');
const { logger } = require('../src/utils/logger');

/**
 * Obtener reservas para las que se debe enviar recordatorio
 * @param {number} horasAntes - Horas antes de la reserva para enviar recordatorio
 */
async function getReservasParaRecordatorio(horasAntes = 24) {
    try {
        const fechaHoraLimite = new Date();
        fechaHoraLimite.setHours(fechaHoraLimite.getHours() + horasAntes);
        
        const fecha = fechaHoraLimite.toISOString().split('T')[0];
        const hora = fechaHoraLimite.toTimeString().slice(0, 5);
        
        const sql = `
            SELECT id, nombre, apellidos, email, telefono, fecha, hora, personas, codigo
            FROM reservas
            WHERE estado = 'confirmada'
            AND fecha = ?
            AND hora <= ?
            AND (reminder_sent IS NULL OR reminder_sent = 0)
            ORDER BY hora ASC
        `;
        
        return await query(sql, [fecha, hora]);
        
    } catch (error) {
        logger.error('Error al obtener reservas para recordatorio', { error: error.message });
        throw error;
    }
}

/**
 * Enviar recordatorio por email
 */
async function enviarRecordatorio(reserva) {
    try {
        // Aquí implementarías el envío real del email de recordatorio
        // Por ahora, simulamos el envío
        
        logger.info('Enviando recordatorio', {
            reservaId: reserva.id,
            email: reserva.email,
            fecha: reserva.fecha,
            hora: reserva.hora
        });
        
        console.log(`📧 Recordatorio enviado a ${reserva.email}`);
        console.log(`   Reserva: ${reserva.codigo} - ${reserva.fecha} ${reserva.hora}`);
        console.log(`   Cliente: ${reserva.nombre} ${reserva.apellidos}\n`);
        
        // Marcar como enviado
        await marcarRecordatorioEnviado(reserva.id);
        
        return true;
        
    } catch (error) {
        logger.error('Error al enviar recordatorio', { 
            error: error.message, 
            reservaId: reserva.id 
        });
        return false;
    }
}

/**
 * Marcar recordatorio como enviado
 */
async function marcarRecordatorioEnviado(reservaId) {
    try {
        const { run } = require('../src/config/database');
        await run(
            'UPDATE reservas SET reminder_sent = 1, reminder_sent_at = CURRENT_TIMESTAMP WHERE id = ?',
            [reservaId]
        );
    } catch (error) {
        logger.error('Error al marcar recordatorio', { error: error.message, reservaId });
    }
}

/**
 * Procesar todos los recordatorios pendientes
 */
async function procesarRecordatorios() {
    try {
        console.log('\n🔄 Procesando recordatorios de reservas...\n');
        
        const reservas = await getReservasParaRecordatorio(24); // 24 horas antes
        
        if (reservas.length === 0) {
            console.log('✅ No hay recordatorios pendientes\n');
            return;
        }
        
        console.log(`📋 Se encontraron ${reservas.length} reservas para recordatorio\n`);
        
        let exitosos = 0;
        let fallidos = 0;
        
        for (const reserva of reservas) {
            const enviado = await enviarRecordatorio(reserva);
            if (enviado) {
                exitosos++;
            } else {
                fallidos++;
            }
        }
        
        console.log(`\n✅ Proceso completado:`);
        console.log(`   - Enviados: ${exitosos}`);
        console.log(`   - Fallidos: ${fallidos}`);
        console.log(`   - Total: ${reservas.length}\n`);
        
        logger.info('Proceso de recordatorios completado', {
            total: reservas.length,
            exitosos,
            fallidos
        });
        
    } catch (error) {
        logger.error('Error en proceso de recordatorios', { error: error.message });
        console.error('❌ Error:', error.message);
    }
}

/**
 * Función principal
 */
async function main() {
    const command = process.argv[2];
    
    switch (command) {
        case 'send':
        case undefined:
            await procesarRecordatorios();
            break;
            
        case 'test':
            // Simular envío de recordatorio de prueba
            console.log('\n📧 Modo de prueba\n');
            await enviarRecordatorio({
                id: 999,
                nombre: 'Juan',
                apellidos: 'García',
                email: 'test@example.com',
                telefono: '+34981234567',
                fecha: '2026-02-10',
                hora: '14:00',
                personas: 4,
                codigo: 'ALC-TEST-1234'
            });
            break;
            
        default:
            console.log('\n🔔 Sistema de Recordatorios - Parrillada Alcume\n');
            console.log('Uso: node reminders.js [comando]\n');
            console.log('Comandos:');
            console.log('  send     Enviar recordatorios pendientes (por defecto)');
            console.log('  test     Enviar recordatorio de prueba\n');
    }
    
    await close();
    process.exit(0);
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main().catch(error => {
        console.error('Error fatal:', error);
        process.exit(1);
    });
}

module.exports = {
    procesarRecordatorios,
    enviarRecordatorio,
    getReservasParaRecordatorio
};
