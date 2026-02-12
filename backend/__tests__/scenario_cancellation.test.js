
const request = require('supertest');
const app = require('../src/app');
const path = require('path');
const { db } = require('../src/config/database');

// Configuración del entorno de pruebas
process.env.NODE_ENV = 'test';
process.env.DB_PATH = path.join(__dirname, '../database/reservas_scenario.db');
process.env.JWT_SECRET = 'test_secret';
process.env.BCRYPT_ROUNDS = '4';

// Helper para limpiar la BD
const clearDb = async () => {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM reservas", (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

// Inicializar esquema
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
    // db.run("DELETE FROM reservas", () => done());
    done();
});

describe('Test de Escenarios: Tetris y Cancelaciones', () => {
    // Usamos una fecha dinámica (mañana) para evitar errores de validación "pasado"
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const fecha = d.toISOString().split('T')[0];
    const hora = '14:00';

    beforeEach(async () => {
        await clearDb();
    });

    /**
     * ESCENARIO 1: EL EFECTO MARIPOSA (Componentes -> Combinación)
     * Si ocupo las mesas pequeñas (componentes), la mesa grande (combinación) debe bloquearse.
     * Si libero las mesas pequeñas, la mesa grande debe resucitar.
     */
    test('Escenario 1: Bloqueo y Desbloqueo de Combinaciones Grandes', async () => {
        // 1. Ocupar la mesa de 8 real (m13) para forzar al sistema a buscar combinaciones
        await request(app).post('/api/reservas').send({
            nombre: 'Ocupa Grande', apellidos: 'Test', email: 'big@test.com',
            telefono: '612345678', fecha, hora, personas: 8, politica: true
        });

        // 2. En este punto, para un grupo de 8, el sistema debería ofrecer las combinaciones.
        // Vamos a boicotear la combinación c3 (m8 + m9) reservando m8 individualmente.
        const resM8 = await request(app).post('/api/reservas').send({
            nombre: 'Boicoteador', apellidos: 'Pequeño', email: 'm8@test.com',
            telefono: '612345678', fecha, hora, personas: 4, politica: true
        });
        const codigoM8 = resM8.body.data.codigo;

        // 3. Ahora intentamos reservar para 8 personas.
        // - m13 está ocupada.
        // - c3 (m8+m9) debería estar rota porque m8 está ocupada.
        // - c4 (m6+m7) debería estar libre.
        // Llenemos c4 y c5 también para aislar el test.
        await request(app).post('/api/reservas').send({ nombre: 'Relleno 1', apellidos: 'X', email: 'x@x.com', telefono: '612345678', fecha, hora, personas: 8, politica: true }); // Ocupa c4
        await request(app).post('/api/reservas').send({ nombre: 'Relleno 2', apellidos: 'X', email: 'y@x.com', telefono: '612345678', fecha, hora, personas: 8, politica: true }); // Ocupa c5

        // 4. AHORA SÍ: Intentamos reservar para 8. Debería fallar porque c3 es la única que quedaba y está rota por el "Boicoteador".
        const checkFail = await request(app).get(`/api/reservas/horarios?fecha=${fecha}&personas=8`);
        const slotFail = checkFail.body.data.horarios.find(h => h.hora === hora);
        expect(slotFail.disponible).toBe(false); // ¡Correcto! No hay sitio.

        // 5. MOMENTO DE LA VERDAD: Cancelamos la reserva del "Boicoteador" (liberamos m8).
        await request(app).delete(`/api/reservas/${codigoM8}`);

        // 6. Verificamos disponibilidad de nuevo. 
        // Al liberar m8, la combinación c3 (m8+m9) debería "reconstruirse" mágicamente.
        const checkSuccess = await request(app).get(`/api/reservas/horarios?fecha=${fecha}&personas=8`);
        const slotSuccess = checkSuccess.body.data.horarios.find(h => h.hora === hora);
        
        expect(slotSuccess.disponible).toBe(true); // ¡Éxito! La mesa grande ha vuelto.
    });

    /**
     * ESCENARIO 2: TETRIS AL LÍMITE
     * Llenar todo usando combinaciones y luego liberar una.
     */
    test('Escenario 2: Ocupación Total y Recuperación de Combinación', async () => {
        // 1. Llenar todas las mesas "fáciles" de 4 (m5..m10)
        // 2. Llenar las mesas grandes con grupos de 4 (m11, m12, m13) - Ineficiente pero válido
        for(let i=0; i<9; i++) {
            await request(app).post('/api/reservas').send({
                nombre: `Relleno ${i}`, apellidos: 'Test', email: `fill${i}@test.com`,
                telefono: '612345678', fecha, hora, personas: 4, politica: true
            });
        }

        // 3. Ahora solo quedan m1, m2, m3, m4 (mesas de 2).
        // Hacemos una reserva de 4. El sistema DEBE unir m1+m2 (combinación c1).
        const resCombo = await request(app).post('/api/reservas').send({
            nombre: 'Usuario Combo', apellidos: 'Test', email: 'combo@test.com',
            telefono: '612345678', fecha, hora, personas: 4, politica: true
        });
        expect(resCombo.status).toBe(201); // Se logró la combinación
        const codigoCombo = resCombo.body.data.codigo;

        // 4. Intentamos reservar OTRA de 4. 
        // Quedan m3 y m4. ¿Existe combinación m3+m4?
        // Según tables.js NO existe (c2 es m3+m5, c5 es m11+m3). No hay m3+m4.
        // Así que debería dar COMPLETO.
        const checkFull = await request(app).get(`/api/reservas/horarios?fecha=${fecha}&personas=4`);
        const slotFull = checkFull.body.data.horarios.find(h => h.hora === hora);
        expect(slotFull.disponible).toBe(false);

        // 5. Cancelamos la reserva "Usuario Combo" (liberando m1 y m2).
        await request(app).delete(`/api/reservas/${codigoCombo}`);

        // 6. Verificamos que se ha liberado el hueco.
        const checkFree = await request(app).get(`/api/reservas/horarios?fecha=${fecha}&personas=4`);
        const slotFree = checkFree.body.data.horarios.find(h => h.hora === hora);
        expect(slotFree.disponible).toBe(true);
    });
});
