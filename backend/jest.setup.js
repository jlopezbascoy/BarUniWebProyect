/**
 * Setup de Tests
 * Configuración inicial para todos los tests
 */

const path = require('path');

// Configurar variables de entorno ANTES de importar cualquier módulo
process.env.NODE_ENV = 'test';
process.env.DB_PATH = './database/reservas_test.db';
process.env.JWT_SECRET = 'test_secret_key_for_testing_only';
process.env.BCRYPT_ROUNDS = '4';
process.env.SMTP_HOST = '';
process.env.LOG_LEVEL = 'error';
process.env.RATE_LIMIT_WINDOW_MS = '1000';
process.env.RATE_LIMIT_MAX_REQUESTS = '1000';
process.env.STRICT_RATE_LIMIT_MAX = '100';

// Silenciar logs durante tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: console.warn,
    error: console.error,
};
