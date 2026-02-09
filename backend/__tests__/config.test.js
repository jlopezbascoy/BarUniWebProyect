/**
 * Test de Configuración
 * Verifica que el entorno de testing esté correctamente configurado
 */

describe('Configuración de Tests', () => {
    test('NODE_ENV debería ser "test"', () => {
        expect(process.env.NODE_ENV).toBe('test');
    });

    test('Base de datos debería ser la de tests', () => {
        expect(process.env.DB_PATH).toContain('test');
    });

    test('JWT_SECRET debería estar configurado', () => {
        expect(process.env.JWT_SECRET).toBeDefined();
        expect(process.env.JWT_SECRET.length).toBeGreaterThan(10);
    });

    test('debería poder importar módulos del proyecto', () => {
        const app = require('../src/app');
        expect(app).toBeDefined();
        expect(typeof app).toBe('function');
    });

    test('debería poder importar validadores', () => {
        const validators = require('../src/utils/validators');
        expect(validators).toBeDefined();
        expect(typeof validators.validateReserva).toBe('function');
    });
});
