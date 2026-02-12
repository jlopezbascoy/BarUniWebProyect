
const request = require('supertest');
const path = require('path');
const app = require('../src/app');
const { db } = require('../src/config/database');

// Config environment before imports
process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(__dirname, '../database/reservas_test_tables.db');
process.env.JWT_SECRET = 'test_secret';
process.env.BCRYPT_ROUNDS = '4';

// Helper to clear DB
const clearDb = async () => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM reservas", (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

describe('Table Management Logic Test', () => {
    beforeAll(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await clearDb();
    });

    afterAll(async () => {
        await clearDb();
    });

    test('should allow booking small tables until full', async () => {
        // Dynamic date: tomorrow
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const fecha = d.toISOString().split('T')[0];
        const hora = '14:00';
        
        // We have 4 tables of 2 people.
        // Let's book 4 reservations of 2 people.
        for (let i = 0; i < 4; i++) {
            const res = await request(app)
                .post('/api/reservas')
                .send({
                    nombre: `User ${i}`,
                    apellidos: 'Test',
                    email: `user${i}@test.com`,
                    telefono: '+34612345678',
                    fecha: fecha,
                    hora: hora,
                    personas: 2
                });
            expect(res.status).toBe(201);
        }

        // Now, another reservation for 2 SHOULD be allowed because we have tables of 4, 6, 8 free.
        // The algorithm should put them in a table of 4.
        const res5 = await request(app)
            .get(`/api/reservas/horarios?fecha=${fecha}&personas=2`);
            
        const slot = res5.body.data.horarios.find(h => h.hora === hora);
        expect(slot.disponible).toBe(true);
    });

    test('should block large groups when large tables are full', async () => {
        // Dynamic date: day after tomorrow
        const d = new Date();
        d.setDate(d.getDate() + 2);
        const fecha = d.toISOString().split('T')[0];
        const hora = '14:00';
        
        // We have 1 table of 8.
        // Book it.
        await request(app)
            .post('/api/reservas')
            .send({
                nombre: 'Big Group',
                apellidos: 'Test',
                email: 'big@test.com',
                telefono: '+34612345678',
                fecha: fecha,
                hora: hora,
                personas: 8
            });

        // Now try to check availability for another group of 8.
        // Should be unavailable (only have smaller tables or tables of 6 left).
        // Wait, do we have tables of 6? Yes, 2 tables of 6. They fit 6, not 8.
        // Do we have any other table >= 8? No.
        
        const res = await request(app)
            .get(`/api/reservas/horarios?fecha=${fecha}&personas=8`);
            
        const slot = res.body.data.horarios.find(h => h.hora === hora);
        expect(slot.disponible).toBe(false);
        
        // But for a group of 6, it should be available
        const res2 = await request(app)
            .get(`/api/reservas/horarios?fecha=${fecha}&personas=6`);
        const slot2 = res2.body.data.horarios.find(h => h.hora === hora);
        expect(slot2.disponible).toBe(true);
    });
});
