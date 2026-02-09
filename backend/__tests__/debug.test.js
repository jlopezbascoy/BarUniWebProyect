/**
 * Test Debug - Ver qué error retorna la API
 */

const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.DB_PATH = './database/reservas_test.db';

const app = require('../src/app');
const { db } = require('../src/config/database');

describe('Debug - Ver errores de API', () => {
    beforeEach(async () => {
        return new Promise((resolve, reject) => {
            db.run('DELETE FROM reservas', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });

    test('debug crear reserva', async () => {
        const reservaValida = {
            nombre: 'Juan',
            apellidos: 'García López',
            email: 'juan.garcia@example.com',
            telefono: '+34612345678',
            fecha: '2026-12-25',
            hora: '14:00',
            personas: 4
        };

        const response = await request(app)
            .post('/api/reservas')
            .send(reservaValida);

        console.log('Status:', response.status);
        console.log('Body:', JSON.stringify(response.body, null, 2));

        // No hacer expectaciones, solo ver el resultado
        expect(true).toBe(true);
    });
});
