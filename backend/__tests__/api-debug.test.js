const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.DB_PATH = './database/reservas_test.db';
process.env.JWT_SECRET = 'test_secret';
process.env.BCRYPT_ROUNDS = '4';
process.env.SMTP_HOST = '';

const app = require('../src/app');
const fs = require('fs');
const path = require('path');
const { db } = require('../src/config/database');

describe('Debug API', () => {
    beforeAll((done) => {
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        db.exec(schema, (err) => {
            done(err);
        });
    });

    beforeEach((done) => {
        db.run('DELETE FROM reservas', () => {
            db.run('DELETE FROM audit_logs', () => done());
        });
    });

    test('crear reserva', async () => {
        const reserva = {
            nombre: 'Juan',
            apellidos: 'García',
            email: 'juan@test.com',
            telefono: '+34612345678',
            fecha: '2026-12-25',
            hora: '14:00',
            personas: 4
        };

        const response = await request(app)
            .post('/api/reservas')
            .send(reserva);

        console.log('Status:', response.status);
        console.log('Body:', JSON.stringify(response.body, null, 2));

        if (response.status !== 201) {
            console.log('ERROR: No se pudo crear la reserva');
        }
    });
});
