
const request = require('supertest');
const app = require('../src/app');
const path = require('path');
const { db } = require('../src/config/database');

process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(__dirname, '../database/reservas_test_crash.db');
process.env.JWT_SECRET = 'test_secret';
process.env.BCRYPT_ROUNDS = '4';

// Initialize DB schema
beforeAll((done) => {
    const fs = require('fs');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema, (err) => {
        if (err && !err.message.includes('already exists')) done(err);
        else done();
    });
});

afterAll((done) => {
    db.run("DELETE FROM reservas", () => done());
});

describe('Crash Reproduction', () => {
    test('should create reservation without crashing', async () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const fecha = d.toISOString().split('T')[0];

        const res = await request(app)
            .post('/api/reservas')
            .send({
                nombre: 'Crash Test',
                apellidos: 'User',
                email: 'crash@test.com',
                telefono: '+34612345678',
                fecha: fecha,
                hora: '14:00',
                personas: 2,
                politica: true
            });
        
        if (res.status !== 201) {
            console.error('Error Response:', res.body);
        }
        expect(res.status).toBe(201);
    });
});
