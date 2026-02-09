/**
 * Utilidades de Email
 * Configuración SMTP para envío de notificaciones
 */

const nodemailer = require('nodemailer');
const { logger } = require('./logger');

// Configuración del transporter (lazy load)
let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    // Si estamos en test o desarrollo sin SMTP, usar mock
    if (process.env.NODE_ENV === 'test' || !process.env.SMTP_HOST) {
        return {
            sendMail: async (options) => {
                logger.info('EMAIL SIMULADO (No enviado):', {
                    to: options.to,
                    subject: options.subject
                });
                return { messageId: `mock-${Date.now()}` };
            }
        };
    }

    // Configuración real SMTP
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: true // OWASP - No aceptar certificados inválidos
        }
    });

    return transporter;
}

/**
 * Enviar email de confirmación de reserva
 * @param {Object} reservaData - Datos de la reserva
 * @param {string} codigo - Código de reserva
 */
async function sendConfirmationEmail(reservaData, codigo) {
    try {
        const transporter = getTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'Parrillada Alcume <reservas@parrilladaalcume.com>',
            to: reservaData.email,
            subject: 'Confirmación de Reserva - Parrillada Alcume',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #8B0000;">¡Reserva Confirmada!</h2>
                    <p>Hola ${reservaData.nombre},</p>
                    <p>Tu reserva en <strong>Parrillada Alcume</strong> ha sido confirmada.</p>
                    
                    <div style="background: #f5f5f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Detalles de tu reserva:</h3>
                        <p><strong>Código:</strong> ${codigo}</p>
                        <p><strong>Fecha:</strong> ${reservaData.fecha}</p>
                        <p><strong>Hora:</strong> ${reservaData.hora}</p>
                        <p><strong>Personas:</strong> ${reservaData.personas}</p>
                        <p><strong>Ubicación:</strong> ${reservaData.ubicacion || 'Sin preferencia'}</p>
                    </div>
                    
                    <p><strong>Importante:</strong> Guarda tu código de reserva. Lo necesitarás si deseas modificar o cancelar.</p>
                    
                    <p>Si necesitas cancelar, puedes hacerlo desde nuestra web con tu código.</p>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                    <p style="color: #666; font-size: 12px;">
                        Parrillada Alcume | Calle Real 123, 15001 A Coruña<br>
                        Tel: +34 123 456 789
                    </p>
                </div>
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        
        logger.info('Email de confirmación enviado', {
            messageId: info.messageId,
            to: reservaData.email,
            codigo
        });
        
        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        logger.error('Error al enviar email de confirmación', {
            error: error.message,
            to: reservaData.email,
            codigo
        });
        throw error;
    }
}

/**
 * Enviar email de cancelación
 * @param {string} email
 * @param {Object} reservaData
 */
async function sendCancellationEmail(email, reservaData) {
    try {
        const transporter = getTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Reserva Cancelada - Parrillada Alcume',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #8B0000;">Reserva Cancelada</h2>
                    <p>Hola,</p>
                    <p>Tu reserva para el <strong>${reservaData.fecha}</strong> a las <strong>${reservaData.hora}</strong> ha sido cancelada.</p>
                    <p>Si deseas hacer una nueva reserva, visita nuestra web o llámanos.</p>
                    
                    <hr style="margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        Parrillada Alcume | Calle Real 123, 15001 A Coruña
                    </p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        return { success: true };
        
    } catch (error) {
        logger.error('Error al enviar email de cancelación', { error: error.message });
        throw error;
    }
}

module.exports = {
    sendConfirmationEmail,
    sendCancellationEmail
};
