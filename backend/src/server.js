/**
 * Servidor HTTP
 * Punto de entrada de la aplicación
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') }); // Cargar variables de entorno

const app = require('./app');
const { db } = require('./config/database');
const { logger } = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Inicializar base de datos
async function initializeDatabase() {
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Leer y ejecutar schema completo (no dividir por ';' porque los triggers lo contienen)
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        await new Promise((resolve, reject) => {
            db.exec(schema, (err) => {
                if (err) {
                    // Ignorar errores de "already exists"
                    if (err.message.includes('already exists')) {
                        resolve();
                    } else {
                        reject(err);
                    }
                } else {
                    resolve();
                }
            });
        });
        
        logger.info('✅ Base de datos inicializada correctamente');
    } catch (error) {
        logger.error('❌ Error al inicializar base de datos:', error);
        process.exit(1);
    }
}

// Iniciar servidor
async function startServer() {
    try {
        // Inicializar DB
        await initializeDatabase();
        
        // Iniciar servidor HTTP
        app.listen(PORT, HOST, () => {
            logger.info(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
            logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
        
    } catch (error) {
        logger.error('Error al iniciar servidor:', error);
        process.exit(1);
    }
}

// Manejo de señales de terminación
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
    logger.info('👋 Cerrando servidor...');
    
    try {
        const { close } = require('./config/database');
        await close();
        logger.info('✅ Servidor cerrado correctamente');
        process.exit(0);
    } catch (error) {
        logger.error('Error al cerrar:', error);
        process.exit(1);
    }
}

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Iniciar
startServer();
