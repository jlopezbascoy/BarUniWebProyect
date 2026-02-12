
const request = require('supertest');
const path = require('path');

// Config environment before imports
process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(__dirname, '../database/reservas_test_limit.db');
process.env.JWT_SECRET = 'test_secret';
process.env.BCRYPT_ROUNDS = '4';

// Initialize setup which creates tables
const setup = require('./setup'); 
const app = require('../src/app');

describe('API Availability Limit Test', () => {

    test('should mark slot as unavailable when capacity is reached', async () => {
        // Calculate valid date (tomorrow)
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const fecha = d.toISOString().split('T')[0];
        const hora = '14:00';
        
        // Capacity is 50. Let's create 5 reservations of 10 people each.
        for (let i = 0; i < 5; i++) {
            const res = await request(app)
                .post('/api/reservas')
                .send({
                    nombre: `User ${i}`,
                    apellidos: 'Test',
                    email: `user${i}@test.com`,
                    telefono: '+34612345678',
                    fecha: fecha,
                    hora: hora,
                    personas: 10
                });
            if (res.status !== 201) {
                console.error(`Failed to create reservation ${i}:`, res.body);
            }
        }

        // Check availability
        const response = await request(app)
            .get(`/api/reservas/horarios?fecha=${fecha}`);

        expect(response.status).toBe(200);
        
        const horarios = response.body.data.horarios;
        const targetSlot = horarios.find(h => h.hora === hora);
        
        expect(targetSlot).toBeDefined();
        // Since we booked 50 people, and capacity is 50, it should be unavailable.
        expect(targetSlot.disponible).toBe(false);
    });

    test('should mark slot as available when partially full', async () => {
        // Calculate valid date (day after tomorrow)
        const d = new Date();
        d.setDate(d.getDate() + 2);
        const fecha = d.toISOString().split('T')[0];
        const hora = '14:00';
        
        // Create 1 reservation of 10 people (Capacity 50)
        await request(app)
            .post('/api/reservas')
            .send({
                nombre: 'User Partial',
                apellidos: 'Test',
                email: 'partial@test.com',
                telefono: '+34612345678',
                fecha: fecha,
                hora: hora,
                personas: 10
            });

        // Check availability
        const response = await request(app)
            .get(`/api/reservas/horarios?fecha=${fecha}`);

        expect(response.status).toBe(200);
        
        const horarios = response.body.data.horarios;
        const targetSlot = horarios.find(h => h.hora === hora);
        
        expect(targetSlot).toBeDefined();
        expect(targetSlot.disponible).toBe(true);
    });
});
