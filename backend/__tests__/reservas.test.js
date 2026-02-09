/**
 * Tests de Integración - API de Reservas
 * Usa Jest + Supertest para probar todos los endpoints
 */

const request = require('supertest');
const path = require('path');

// Configurar variables de entorno antes de importar app
process.env.NODE_ENV = 'test';
process.env.DB_PATH = './database/reservas_test.db';
process.env.JWT_SECRET = 'test_secret';
process.env.BCRYPT_ROUNDS = '4';
process.env.SMTP_HOST = '';
process.env.LOG_LEVEL = 'error';

const app = require('../src/app');

// Importar setup de integración
require('./setup');

// Helper para obtener fecha válida (dentro de 30 días)
const getFechaValida = (dias = 7) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toISOString().split('T')[0];
};

describe('API de Reservas - Tests de Integración', () => {
    const reservaValida = {
        nombre: 'Juan',
        apellidos: 'García López',
        email: 'juan.garcia@example.com',
        telefono: '+34612345678',
        fecha: getFechaValida(),
        hora: '14:00',
        personas: 4
    };

    describe('POST /api/reservas', () => {

        test('debería crear una reserva exitosamente', async () => {
            const response = await request(app)
                .post('/api/reservas')
                .send(reservaValida);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('codigo');
            expect(response.body.data).toHaveProperty('tokenCancelacion');
        });

        test('debería rechazar reserva sin datos requeridos', async () => {
            const response = await request(app)
                .post('/api/reservas')
                .send({
                    nombre: 'Juan',
                    email: 'juan@example.com',
                    fecha: getFechaValida(),
                    hora: '14:00',
                    personas: 4
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Apellidos inválidos');
        });

        test('debería rechazar email inválido', async () => {
            const response = await request(app)
                .post('/api/reservas')
                .send({
                    ...reservaValida,
                    email: 'invalid-email'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Email inválido');
        });

        test('debería rechazar fecha en el pasado', async () => {
            const response = await request(app)
                .post('/api/reservas')
                .send({
                    ...reservaValida,
                    fecha: '2023-01-01'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('La fecha no puede ser anterior a hoy');
        });

        test('debería rechazar más de 10 personas', async () => {
            const response = await request(app)
                .post('/api/reservas')
                .send({
                    ...reservaValida,
                    personas: 15
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Para grupos de más de 10 personas');
        });

        test('debería rechazar hora no disponible', async () => {
            const response = await request(app)
                .post('/api/reservas')
                .send({
                    ...reservaValida,
                    hora: '25:00'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Formato de hora inválido');
        });

        test('debería rechazar duplicados (mismo email, fecha y hora)', async () => {
            // Crear primera reserva
            await request(app)
                .post('/api/reservas')
                .send(reservaValida);

            // Intentar crear duplicado
            const response = await request(app)
                .post('/api/reservas')
                .send(reservaValida);

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Ya tienes una reserva');
        });

        test('debería detectar honeypot (spam)', async () => {
            const response = await request(app)
                .post('/api/reservas')
                .send({
                    ...reservaValida,
                    website: 'http://spam.com'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.codigo).toBe('SPAM-DETECTED');
        });
    });

    describe('GET /api/reservas/:codigo', () => {
        test('debería obtener una reserva existente', async () => {
            // Crear reserva primero
            const createResponse = await request(app)
                .post('/api/reservas')
                .send(reservaValida);
            
            const codigo = createResponse.body.data.codigo;

            const response = await request(app)
                .get(`/api/reservas/${codigo}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('codigo', codigo);
            expect(response.body.data).toHaveProperty('nombre', 'Juan');
        });

        test('debería retornar 404 para reserva inexistente', async () => {
            const response = await request(app)
                .get('/api/reservas/NONEXISTENT');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Reserva no encontrada');
        });
    });

    describe('DELETE /api/reservas/:codigo', () => {
        test('debería cancelar una reserva exitosamente', async () => {
            // Crear reserva primero
            const createResponse = await request(app)
                .post('/api/reservas')
                .send(reservaValida);
            
            const codigo = createResponse.body.data.codigo;

            const response = await request(app)
                .delete(`/api/reservas/${codigo}`)
                .send({ motivo: 'Test cancelación' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('cancelada');
        });

        test('debería rechazar cancelar reserva ya cancelada', async () => {
            // Crear y cancelar reserva
            const createResponse = await request(app)
                .post('/api/reservas')
                .send(reservaValida);
            
            const codigo = createResponse.body.data.codigo;
            await request(app)
                .delete(`/api/reservas/${codigo}`)
                .send({ motivo: 'Test cancelación' });

            // Intentar cancelar nuevamente
            const response = await request(app)
                .delete(`/api/reservas/${codigo}`)
                .send({ motivo: 'Test cancelación' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('ya está cancelada');
        });
    });

    describe('GET /api/reservas/disponibilidad', () => {
        test('debería verificar disponibilidad correctamente', async () => {
            const fechaValida = getFechaValida();
            const response = await request(app)
                .get(`/api/reservas/disponibilidad?fecha=${fechaValida}&hora=14:00&personas=4`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('disponible');
            expect(response.body.data.fecha).toBe(fechaValida);
            expect(response.body.data.hora).toBe('14:00');
            expect(response.body.data.personas).toBe(4);
        });

        test('debería retornar error si faltan parámetros', async () => {
            const response = await request(app)
                .get('/api/reservas/disponibilidad?fecha=2026-12-25');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Faltan parámetros');
        });
    });

    describe('GET /api/reservas/horarios', () => {
        test('debería obtener horarios disponibles', async () => {
            const response = await request(app)
                .get('/api/reservas/horarios?fecha=2026-12-25');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('horarios');
            expect(Array.isArray(response.body.data.horarios)).toBe(true);
        });

        test('debería indicar domingo sin cenas', async () => {
            // Calcular el próximo domingo
            const d = new Date();
            d.setDate(d.getDate() + (7 - d.getDay()) % 7);
            if (d.getDay() !== 0 || d < new Date()) d.setDate(d.getDate() + 7); // Asegurar futuro
            const domingo = d.toISOString().split('T')[0];

            const response = await request(app)
                .get(`/api/reservas/horarios?fecha=${domingo}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            // Verificar que los horarios de cena estén deshabilitados
            const horarios = response.body.data.horarios;
            const horariosCena = horarios.filter(h => h.turno === 'cena');
            horariosCena.forEach(horario => {
                expect(horario.disponible).toBe(false);
            });
        });
    });

    describe('PUT /api/reservas/:codigo', () => {
        test('debería actualizar una reserva', async () => {
            // Crear reserva primero
            const createResponse = await request(app)
                .post('/api/reservas')
                .send(reservaValida);
            
            const codigo = createResponse.body.data.codigo;

            const response = await request(app)
                .put(`/api/reservas/${codigo}`)
                .send({
                    nombre: 'Juan Actualizado',
                    personas: 6
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('actualizada');
        });

        test('debería rechazar actualizar reserva cancelada', async () => {
            // Crear y cancelar reserva
            const createResponse = await request(app)
                .post('/api/reservas')
                .send(reservaValida);
            
            const codigo = createResponse.body.data.codigo;
            await request(app)
                .delete(`/api/reservas/${codigo}`)
                .send({ motivo: 'Test cancelación' });

            // Intentar actualizar
            const response = await request(app)
                .put(`/api/reservas/${codigo}`)
                .send({
                    nombre: 'Juan Actualizado'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toMatch(/no se puede actualizar/i);
        });
    });

    describe('GET /api/reservas/admin/lista', () => {
        
        test('debería rechazar acceso sin autenticación', async () => {
            const response = await request(app)
                .get('/api/reservas/admin/lista');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        test('debería listar reservas con autenticación correcta', async () => {
            // Crear algunas reservas para el test de admin
            const reserva1 = {
                nombre: 'Test Admin Uno',
                apellidos: 'Apellido',
                email: 'admin1@example.com',
                telefono: '+34612345678',
                fecha: getFechaValida(),
                hora: '14:00',
                personas: 4
            };

            const reserva2 = {
                nombre: 'Test Admin Dos',
                apellidos: 'Apellido',
                email: 'admin2@example.com',
                telefono: '+34612345678',
                fecha: getFechaValida(),
                hora: '20:00',
                personas: 2
            };

            // Crear reservas antes del test
            await request(app)
                .post('/api/reservas')
                .send(reserva1);
            await request(app)
                .post('/api/reservas')
                .send(reserva2);

            const response = await request(app)
                .get('/api/reservas/admin/lista')
                .auth('admin', 'admin123'); // Credenciales por defecto

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThanOrEqual(2);
        });

        test('debería filtrar por fecha', async () => {
            const fechaFiltrar = getFechaValida();
            const response = await request(app)
                .get(`/api/reservas/admin/lista?fecha=${fechaFiltrar}`)
                .auth('admin', 'admin123'); // Credenciales por defecto

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            // Todas las reservas deberían ser de la fecha filtrada
            response.body.data.forEach(reserva => {
                expect(reserva.fecha).toBe(fechaFiltrar);
            });
        });
    });

    describe('Health Check', () => {
        test('debería retornar estado OK', async () => {
            const response = await request(app)
                .get('/health');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('OK');
            expect(response.body).toHaveProperty('timestamp');
        });
    });
});