/**
 * Tests de Integración - API de Reservas
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Configurar variables de entorno
process.env.NODE_ENV = 'test';
process.env.DB_PATH = './database/reservas_test.db';
process.env.JWT_SECRET = 'test_secret';
process.env.BCRYPT_ROUNDS = '4';
process.env.SMTP_HOST = '';
process.env.LOG_LEVEL = 'error';

// Importar después de configurar env
const app = require('../src/app');
const { db } = require('../src/config/database');

// Setup
beforeAll((done) => {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    db.exec(schema, (err) => {
        if (err && !err.message.includes('already exists')) {
            done(err);
        } else {
            done();
        }
    });
});

beforeEach((done) => {
    db.run('DELETE FROM reservas', () => {
        db.run('DELETE FROM audit_logs', () => done());
    });
});

// Obtener fecha válida (dentro de 30 días)
const getFechaValida = () => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 7); // 7 días en el futuro
    return fecha.toISOString().split('T')[0];
};

describe('POST /api/reservas', () => {
    const reservaValida = {
        nombre: 'Juan',
        apellidos: 'García',
        email: 'juan@test.com',
        telefono: '+34612345678',
        fecha: getFechaValida(),
        hora: '14:00',
        personas: 4
    };

    test('crea reserva correctamente', async () => {
        const response = await request(app)
            .post('/api/reservas')
            .send(reservaValida);

        if (response.status !== 201) {
            throw new Error(`Status: ${response.status}, Body: ${JSON.stringify(response.body)}`);
        }

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('codigo');
    });

    test('rechaza datos inválidos', async () => {
        const response = await request(app)
            .post('/api/reservas')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });
});

describe('GET /api/reservas/:codigo', () => {
    test('obtiene reserva existente', async () => {
        // Crear
        const createRes = await request(app)
            .post('/api/reservas')
            .send({
                nombre: 'María',
                apellidos: 'López',
                email: 'maria@test.com',
                telefono: '+34612345679',
                fecha: getFechaValida(),
                hora: '20:00',
                personas: 2
            });
        
        const codigo = createRes.body.data.codigo;

        // Consultar
        const response = await request(app)
            .get(`/api/reservas/${codigo}`);

        expect(response.status).toBe(200);
        expect(response.body.data.codigo).toBe(codigo);
    });
});
