
const request = require('supertest');
const app = require('../src/app');
const path = require('path');
const { db } = require('../src/config/database');

// Environment config
process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(__dirname, '../database/reservas_advanced_test.db');
process.env.JWT_SECRET = 'test_secret';
process.env.BCRYPT_ROUNDS = '4';

// Helpers
const clearDb = async () => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM reservas", (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

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

describe('Advanced Tetris Table Logic (Combinations & Cancellations)', () => {
    const fecha = '2026-09-15';
    const hora = '14:00';
    let reservationToCancel = null;

    test('1. Fill Standard Tables (6 tables of 4)', async () => {
        for (let i = 0; i < 6; i++) {
            const res = await request(app).post('/api/reservas').send({
                nombre: `Standard ${i}`, apellidos: 'User', email: `std${i}@test.com`,
                telefono: '123', fecha, hora, personas: 4, politica: true
            });
            expect(res.status).toBe(201);
        }
    });

    test('2. Fill Large Tables inefficiently (3 tables of 4)', async () => {
        // Uses the 2 tables of 6 and 1 table of 8
        for (let i = 0; i < 3; i++) {
            const res = await request(app).post('/api/reservas').send({
                nombre: `Large ${i}`, apellidos: 'User', email: `lrg${i}@test.com`,
                telefono: '123', fecha, hora, personas: 4, politica: true
            });
            expect(res.status).toBe(201);
        }
    });

    test('3. Fill with Combinations (2 tables of 4 by joining 2-pax tables)', async () => {
        // We have 4 tables of 2 left.
        // Combo c1 (m1+m2) -> 4 pax
        // Combo c2 (m3+m4) -> 4 pax (Wait, c2 in tables.js is m3+m5? No let me check tables.js logic)
        
        // checking tables.js logic from memory/previous reads:
        // c1: m1+m2 (4 pax)
        // c2: m3+m5 (6 pax) -> Wait, m5 is a 4-pax table.
        // c3: m8+m9 (8 pax)
        // c4: m6+m7 (8 pax)
        // c5: m11+m3 (8 pax)
        
        // Wait, if I used m1..m13...
        // Remaining free: m1, m2, m3, m4 (all 2-pax).
        // Is there a combo for m3+m4?
        // Let's check tables.js content I wrote earlier.
        // "c1": m1+m2 (4 pax)
        // "c2": m3+m5 (6 pax) -> m5 is already taken in step 1!
        
        // So actually, we only have ONE combo available for 4 people: c1 (m1+m2).
        // m3 and m4 are loose 2-pax tables. Do they combine?
        // I didn't define a combo for m3+m4 in the last `tables.js` write!
        // I defined: c1 (m1+m2), c2(m3+m5), c3(m8+m9), c4(m6+m7), c5(m11+m3).
        
        // So, I can make ONE reservation of 4 using c1.
        // The next reservation of 4 should FAIL because m3 and m4 don't combine in my config.
        
        // Let's verify this behavior.
        
        // 3a. Book 1st combo
        const res1 = await request(app).post('/api/reservas').send({
            nombre: 'Combo User 1', apellidos: 'Test', email: 'combo1@test.com',
            telefono: '123', fecha, hora, personas: 4, politica: true
        });
        expect(res1.status).toBe(201);
        reservationToCancel = res1.body.data.codigo; // Save for cancellation test

        // 3b. Try 2nd combo (Should FAIL if m3+m4 combo doesn't exist)
        const res2 = await request(app).post('/api/reservas').send({
            nombre: 'Combo User 2', apellidos: 'Test', email: 'combo2@test.com',
            telefono: '123', fecha, hora, personas: 4, politica: true
        });
        
        // If my config is as I recall, this should be 409 (Conflict/Full)
        // because m3 and m4 are not defined as a pair.
        // Let's assert 409 to verify config reality.
        expect(res2.status).toBe(409); 
    });

    test('4. Verify Unavailability', async () => {
        const res = await request(app).get(`/api/reservas/horarios?fecha=${fecha}&personas=4`);
        const slot = res.body.data.horarios.find(h => h.hora === hora);
        expect(slot.disponible).toBe(false);
    });

    test('5. Cancel the Combo Reservation', async () => {
        expect(reservationToCancel).toBeTruthy();
        const res = await request(app).delete(`/api/reservas/${reservationToCancel}`);
        expect(res.status).toBe(200);
    });

    test('6. Verify Availability Restored', async () => {
        // Now c1 (m1+m2) should be free again.
        const res = await request(app).get(`/api/reservas/horarios?fecha=${fecha}&personas=4`);
        const slot = res.body.data.horarios.find(h => h.hora === hora);
        expect(slot.disponible).toBe(true);
    });
    
    test('7. Re-book the freed spot', async () => {
        const res = await request(app).post('/api/reservas').send({
            nombre: 'Lucky User', apellidos: 'FoundSpot', email: 'lucky@test.com',
            telefono: '123', fecha, hora, personas: 4, politica: true
        });
        expect(res.status).toBe(201);
    });
});
