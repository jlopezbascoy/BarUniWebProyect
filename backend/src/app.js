/**
 * Configuración de Express
 * App principal
 */

const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const {
    helmetConfig,
    getCorsConfig,
    generalLimiter,
    sanitizeInput,
    requestLogger,
    apiValidator,
    errorHandler,
    notFoundHandler
} = require('./middleware/security');

const reservasRoutes = require('./routes/reservas');
const contactoRoutes = require('./routes/contacto');
const { logger } = require('./utils/logger');

// Crear aplicación Express
const app = express();

// Trust proxy (si está detrás de nginx/apache)
app.set('trust proxy', 1);

// Middleware de seguridad OWASP
app.use(helmetConfig);
app.use(getCorsConfig());
app.use(generalLimiter);

// Parser de JSON
app.use(express.json({ limit: '100kb' })); // Límite reducido para prevenir DoS
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Sanitización de inputs
app.use(sanitizeInput);

// Logger de requests
app.use(requestLogger);

// Validar Content-Type en API
app.use('/api', apiValidator);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Rutas API
app.use('/api/reservas', reservasRoutes);
app.use('/api/contacto', contactoRoutes);

// Manejo de rutas no encontradas
app.use(notFoundHandler);

// Manejo de errores global
app.use(errorHandler);

module.exports = app;
