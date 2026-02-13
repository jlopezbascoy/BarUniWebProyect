const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// DEBUG: Ver qué valor está cogiendo realmente
console.log('🔍 DEBUG ENV FRONTEND_URL:', process.env.FRONTEND_URL);

const { sendConfirmationEmail } = require('../src/utils/email');

console.log('🔄 Iniciando prueba de envío de email...');
console.log(`📧 Configurado para enviar desde: ${process.env.SMTP_USER}`);
console.log(`📨 Servidor SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);

// Datos de prueba
const testData = {
    nombre: 'Administrador (Prueba)',
    email: process.env.SMTP_USER, // Se envía a sí mismo para probar
    fecha: new Date().toLocaleDateString(),
    hora: '14:00',
    personas: 2,
    ubicacion: 'Mesa de Prueba'
};

const codigo = 'TEST-12345';

console.log('🚀 Intentando enviar email...');

sendConfirmationEmail(testData, codigo)
    .then(info => {
        console.log('\n✅ ¡ÉXITO! El email se ha enviado correctamente.');
        console.log('🆔 Message ID:', info.messageId);
        console.log('📬 Revisa la bandeja de entrada de:', testData.email);
        console.log('(No olvides revisar Spam por si acaso)');
    })
    .catch(err => {
        console.error('\n❌ ERROR: No se pudo enviar el email.');
        console.error('📝 Mensaje de error:', err.message);
        if (err.code === 'EAUTH') {
            console.error('\n💡 PISTA: Error de autenticación.');
            console.error('   1. Asegúrate de que el usuario es tu correo completo.');
            console.error('   2. Asegúrate de que la contraseña es la "Contraseña de Aplicación" de 16 caracteres, NO tu contraseña normal.');
            console.error('   3. Verifica que la "Verificación en 2 pasos" esté activa en Google.');
        }
    });
